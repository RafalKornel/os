// Playwright browser core — no dependency on pi, only playwright-core.
//
// Architecture (per-agent tabs):
//   - ONE shared Chromium browser process (launched lazily).
//   - Each pi session (keyed by sessionId) gets its own BrowserContext —
//     its own tabs, cookies and storage. Sessions never touch each other's
//     tabs, so a subagent driving the browser can't race the parent.
//   - The registry lives on globalThis so every extension instance in this
//     process (parent session, subagent child sessions, session reloads)
//     shares the same browser and the same tab bookkeeping.
//   - release(sessionId) closes that session's context (all its tabs); when
//     the last session releases, the shared browser process is closed too.
import type {
  Browser,
  BrowserContext,
  Page,
  Locator,
} from "playwright-core";
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Candidate executable paths, tried in order. First existing one wins. */
const CANDIDATE_EXECS = [
  process.env.BROWSER_EXECUTABLE_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
].filter(Boolean) as string[];

const DEFAULT_TIMEOUT_MS = 4_000;
const CONTEXT_VIEWPORT = { width: 1280, height: 900 };
const CONTEXT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

function findExecutable(): string | undefined {
  for (const p of CANDIDATE_EXECS) {
    try {
      if (p && existsSync(p) && statSync(p).isFile()) return p;
    } catch {
      /* keep looking */
    }
  }
  return undefined;
}

export interface ShotResult {
  path: string;
  dataBase64: string;
}

/** Pure page-level operations. No browser/context ownership. */
export class BrowserOps {
  private screenshotsDir: string | null = null;

  /** Resolve a user-supplied selector to a Locator. */
  resolveLocator(page: Page, selector: string): Locator {
    const s = selector.trim();
    // Playwright engine syntax (text=, role=, css=, xpath=, ...): `engine=selector`
    if (/^(text-exact|text|role|css|xpath|id|label|placeholder|alt|title|testid|test-id|pierce)=/i.test(s)) {
      return page.locator(s);
    }
    // Plain selector — try as-is; falls through if the locator errors at action time.
    if (/^[.#\[:]/.test(s) || s.includes(">>") || s.includes(" ")) {
      return page.locator(s);
    }
    // Bare words: prefer exact text match, that's most often what the model intends.
    return page.getByText(s, { exact: false }).first();
  }

  async navigate(page: Page, url: string, waitUntil: "load" | "domcontentloaded" | "networkidle" = "load"): Promise<{ url: string; title: string; status?: number }> {
    const target = isAbsoluteLike(url) ? url : `https://${url}`;
    const resp = await page.goto(target, { waitUntil, timeout: DEFAULT_TIMEOUT_MS });
    return { url: page.url(), title: await page.title(), status: resp?.status() };
  }

  async snapshot(page: Page): Promise<string> {
    // Accessibility-tree snapshot: compact, includes interactive refs.
    try {
      const aria = await page.locator("body").ariaSnapshot();
      return `URL: ${page.url()}\nTitle: ${await page.title()}\n\n${aria}`;
    } catch {
      // Fallback: visible text
      return `URL: ${page.url()}\nTitle: ${await page.title()}\n\n${await page.locator("body").innerText()}`;
    }
  }

  async text(page: Page): Promise<string> {
    return page.locator("body").innerText();
  }

  async html(page: Page, selector?: string): Promise<string> {
    const loc = selector ? this.resolveLocator(page, selector) : page.locator("html");
    return loc.first().innerHTML();
  }

  async click(page: Page, selector: string): Promise<{ url: string; title: string }> {
    const loc = this.resolveLocator(page, selector).first();
    await loc.click({ timeout: DEFAULT_TIMEOUT_MS });
    return { url: page.url(), title: await page.title() };
  }

  async fill(page: Page, selector: string, value: string): Promise<void> {
    const loc = this.resolveLocator(page, selector).first();
    await loc.fill(value, { timeout: DEFAULT_TIMEOUT_MS });
  }

  async select(page: Page, selector: string, value: string): Promise<void> {
    const loc = this.resolveLocator(page, selector).first();
    await loc.selectOption(value, { timeout: DEFAULT_TIMEOUT_MS });
  }

  async check(page: Page, selector: string, checked = true): Promise<void> {
    const loc = this.resolveLocator(page, selector).first();
    await (checked ? loc.check() : loc.uncheck());
  }

  async press(page: Page, selector: string | null, key: string): Promise<void> {
    if (selector) {
      await this.resolveLocator(page, selector).first().press(key);
    } else {
      await page.keyboard.press(key);
    }
  }

  async hover(page: Page, selector: string): Promise<void> {
    await this.resolveLocator(page, selector).first().hover();
  }

  async screenshot(page: Page, selector?: string): Promise<ShotResult> {
    if (!this.screenshotsDir) {
      this.screenshotsDir = mkdtempSync(join(tmpdir(), "pi-browser-"));
    }
    const path = join(this.screenshotsDir, `shot-${Date.now()}.png`);
    const el = selector ? this.resolveLocator(page, selector).first() : page;
    const buffer = await el.screenshot({ timeout: DEFAULT_TIMEOUT_MS });
    return { path, dataBase64: buffer.toString("base64") };
  }

  async evalJs(page: Page, expression: string): Promise<unknown> {
    return page.evaluate(expression);
  }

  async waitForSelector(page: Page, selector: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
    await this.resolveLocator(page, selector).first().waitFor({ state: "visible", timeout: timeoutMs });
  }
}

interface AgentEntry {
  context: BrowserContext;
}

/** Process-wide registry: one shared Browser, one BrowserContext per pi session. */
class BrowserRegistry {
  private browser: Browser | null = null;
  private agents = new Map<string, AgentEntry>();

  get isOpen(): boolean {
    return this.browser !== null;
  }

  get openAgents(): number {
    return this.agents.size;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      const executablePath = findExecutable();
      if (!executablePath) {
        throw new Error(
          "No browser found. Set BROWSER_EXECUTABLE_PATH to a chromium/chrome binary."
        );
      }
      const headed = process.env.BROWSER_HEADED === "1" || process.env.BROWSER_HEADED === "true";
      this.browser = await chromium.launch({
        executablePath,
        headless: !headed,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      });
    }
    return this.browser;
  }

  /** Get (or lazily create) this session's context; return its most recent tab. */
  async pageFor(sessionId: string): Promise<Page> {
    const browser = await this.ensureBrowser();
    let agent = this.agents.get(sessionId);
    if (!agent) {
      const context = await browser.newContext({
        viewport: CONTEXT_VIEWPORT,
        userAgent: CONTEXT_USER_AGENT,
      });
      context.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
      agent = { context };
      this.agents.set(sessionId, agent);
    }
    if (agent.context.pages().length === 0) {
      await agent.context.newPage();
    }
    const pages = agent.context.pages();
    return pages[pages.length - 1];
  }

  /** This session's tabs, most recent first (index 0 = "current" tab). */
  pagesFor(sessionId: string): Page[] {
    const agent = this.agents.get(sessionId);
    if (!agent) return [];
    return [...agent.context.pages()].reverse();
  }

  async newPage(sessionId: string, url?: string): Promise<Page> {
    const existing = await this.pageFor(sessionId);
    const p = await existing.context().newPage();
    if (url) await p.goto(isAbsoluteLike(url) ? url : `https://${url}`);
    return p;
  }

  /** Close the tab at index (same indexing as pagesFor). Returns closed URL, or null if out of range. */
  async closePage(sessionId: string, index: number): Promise<string | null> {
    const target = this.pagesFor(sessionId)[index];
    if (!target) return null;
    const url = target.url();
    await target.close();
    return url;
  }

  /** Close a session's context (all its tabs). Returns how many tabs were open.
   * Closes the shared browser process when this was the last session. */
  async release(sessionId: string): Promise<number> {
    const agent = this.agents.get(sessionId);
    if (!agent) return 0;
    this.agents.delete(sessionId);
    const count = agent.context.pages().length;
    try {
      await agent.context.close();
    } catch {
      /* already closed */
    }
    if (this.agents.size === 0) {
      try {
        await this.browser?.close();
      } catch {
        /* already closed */
      }
      this.browser = null;
    }
    return count;
  }
}

const REGISTRY_KEY = Symbol.for("pi.browser-registry");

/**
 * Process-wide registry, shared by every extension instance in this process
 * (parent session, subagent child sessions, session reloads).
 */
export function getRegistry(): BrowserRegistry {
  const g = globalThis as unknown as Record<symbol, BrowserRegistry | undefined>;
  if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = new BrowserRegistry();
  return g[REGISTRY_KEY];
}

function isAbsoluteLike(u: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(u) || u.startsWith("about:");
}

/** Tiny helper for logging; not exported from the extension API surface. */
export function browserVersion(): string {
  try {
    return execSync("/usr/bin/chromium --version", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}
