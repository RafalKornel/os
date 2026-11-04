import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { BrowserOps, getRegistry } from "./core";

const ops = new BrowserOps();

const selector = { description: "Element selector. CSS selector, Playwright engine syntax (text=..., role=..., css=...), or a plain visible-text fragment." };
const urlParam = { description: "URL to open (scheme optional, https assumed)" };

const browserParams = Type.Object({
  action: Type.Union(
    [
      Type.Literal("navigate"),
      Type.Literal("snapshot"),
      Type.Literal("text"),
      Type.Literal("html"),
      Type.Literal("click"),
      Type.Literal("fill"),
      Type.Literal("select"),
      Type.Literal("check"),
      Type.Literal("press"),
      Type.Literal("hover"),
      Type.Literal("screenshot"),
      Type.Literal("eval"),
      Type.Literal("wait"),
      Type.Literal("back"),
      Type.Literal("forward"),
      Type.Literal("reload"),
      Type.Literal("tabs"),
      Type.Literal("new_tab"),
      Type.Literal("close_tab"),
      Type.Literal("close"),
    ],
    {
      description:
        "Action to perform. navigate/goto a page; snapshot = accessibility tree of the current page (use this to orient and pick selectors); text/html = extract content; click/fill/select/check/press/hover = interact with an element by selector; screenshot = capture PNG; eval = run JS in page; wait = wait for an element to be visible; back/forward/reload = history; tabs/new_tab/close_tab = tab management; close = close all of THIS session's tabs.",
    }
  ),
  url: Type.Optional(Type.String(urlParam)),
  selector: Type.Optional(Type.String(selector)),
  value: Type.Optional(Type.String({ description: "Text to fill, or option value for select" })),
  key: Type.Optional(Type.String({ description: "Keyboard key for press, e.g. \"Enter\", \"a\" (omit selector to send to focused element)" })),
  expression: Type.Optional(Type.String({ description: "JavaScript expression for eval, run in the page" })),
  checked: Type.Optional(Type.Boolean({ description: "check action: true (default) or false" })),
  tab: Type.Optional(Type.Number({ description: "close_tab: tab index from `tabs` action" })),
});

export type BrowserToolInput = import("typebox").Static<typeof browserParams>;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });

export default function (pi: ExtensionAPI) {
  pi.registerTool<typeof browserParams>({
    name: "browser",
    label: "Browser",
    description:
      "Drive a persistent Chromium browser via Playwright. Each session has its own private tabs (other sessions/subagents have separate tabs and cannot see or touch yours). Navigate pages, read their accessibility snapshot, extract text/HTML, click, fill forms, screenshot, run JS, manage tabs. The browser is kept alive across calls; use action=snapshot after navigate to see what's on the page and pick selectors. Your tabs are closed automatically when this session ends.",
    promptSnippet: "Browser automation with Playwright (navigate, snapshot, click, fill, screenshot, tabs)",
    promptGuidelines: [
      "Use browser for tasks that require rendering JavaScript, clicking, or filling forms — not for simple page fetches (use web_crawl/web_search for those).",
      "After browser navigate, call browser snapshot to see the page structure before interacting.",
    ],
    parameters: browserParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx: ExtensionContext) {
      const { action } = params;
      const reg = getRegistry();
      const sessionId = ctx.sessionManager.getSessionId();
      try {
        if (action === "close") {
          const n = await reg.release(sessionId);
          return {
            content: [{ type: "text", text: n > 0 ? `Closed your ${n} tab(s); this session's browser is shut down.` : "No browser tabs open for this session." }],
            details: { closedTabs: n },
          };
        }

        if (action === "tabs") {
          const pages = reg.pagesFor(sessionId);
          if (pages.length === 0) return { content: [{ type: "text", text: "No tabs open. Use navigate or new_tab first." }], details: {} };
          const lines: string[] = [];
          for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            let title: string;
            try {
              title = await p.title();
            } catch {
              title = "(title unavailable)";
            }
            lines.push(`${i}. ${p.url()} — ${title}`);
          }
          return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
        }

        if (action === "new_tab") {
          const p = await reg.newPage(sessionId, params.url);
          return { content: [{ type: "text", text: `Opened tab: ${p.url()}` }], details: {} };
        }

        if (action === "close_tab") {
          const idx = params.tab ?? 0;
          const closed = await reg.closePage(sessionId, idx);
          if (!closed) return err(`No tab at index ${idx}`);
          return { content: [{ type: "text", text: `Closed tab ${idx} (${closed})` }], details: {} };
        }

        const page = await reg.pageFor(sessionId);
        if (signal?.aborted) throw new Error("Aborted");

        switch (action) {
          case "navigate": {
            if (!params.url) throw new Error("navigate requires `url`");
            const r = await ops.navigate(page, params.url);
            return ok(`Navigated to ${r.url}\nTitle: ${r.title}`, { url: r.url, title: r.title, status: r.status });
          }
          case "snapshot": {
            const s = await ops.snapshot(page);
            return { content: [{ type: "text", text: s }], details: { url: page.url() } };
          }
          case "text": {
            return ok(await ops.text(page));
          }
          case "html": {
            const h = await ops.html(page, params.selector);
            const trimmed = h.length > 20_000 ? h.slice(0, 20_000) + "\n…(truncated)" : h;
            return { content: [{ type: "text", text: trimmed }], details: {} };
          }
          case "click": {
            if (!params.selector) throw new Error("click requires `selector`");
            const r = await ops.click(page, params.selector);
            return ok(`Clicked. Now at ${r.url}`, { url: r.url });
          }
          case "fill": {
            if (!params.selector || params.value === undefined) throw new Error("fill requires `selector` and `value`");
            await ops.fill(page, params.selector, params.value);
            return ok(`Filled ${params.selector}`);
          }
          case "select": {
            if (!params.selector || params.value === undefined) throw new Error("select requires `selector` and `value`");
            await ops.select(page, params.selector, params.value);
            return ok(`Selected ${params.value}`);
          }
          case "check": {
            if (!params.selector) throw new Error("check requires `selector`");
            await ops.check(page, params.selector, params.checked ?? true);
            return ok(`Set checked=${params.checked ?? true}`);
          }
          case "press": {
            if (!params.key) throw new Error("press requires `key`");
            await ops.press(page, params.selector ?? null, params.key);
            return ok(`Pressed ${params.key}`);
          }
          case "hover": {
            if (!params.selector) throw new Error("hover requires `selector`");
            await ops.hover(page, params.selector);
            return ok(`Hovered ${params.selector}`);
          }
          case "screenshot": {
            const shot = await ops.screenshot(page, params.selector);
            const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
              { type: "text", text: `Screenshot saved to ${shot.path}` },
            ];
            if (!params.selector) content.push({ type: "image", data: shot.dataBase64, mimeType: "image/png" });
            return { content, details: { path: shot.path } };
          }
          case "eval": {
            if (!params.expression) throw new Error("eval requires `expression`");
            const result = await ops.evalJs(page, params.expression);
            return ok(JSON.stringify(result, null, 2).slice(0, 20_000));
          }
          case "wait": {
            if (params.selector) {
              await ops.waitForSelector(page, params.selector);
              return ok(`Visible: ${params.selector}`);
            }
            await sleep(1000, signal);
            return ok("Waited 1s");
          }
          case "back":
            await page.goBack({ waitUntil: "load" });
            return ok(`Back: ${page.url()}`);
          case "forward":
            await page.goForward({ waitUntil: "load" });
            return ok(`Forward: ${page.url()}`);
          case "reload":
            await page.reload({ waitUntil: "load" });
            return ok(`Reloaded: ${page.url()}`);
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return err(message);
      }
    },
  });

  // This session's tabs are cleaned up when the session shuts down (quit,
  // /reload, new/resume/fork). Subagent sessions are released explicitly by
  // the task extension via the shared registry (see REGISTRY_KEY in core.ts).
  pi.on("session_shutdown", async (_event, ctx: ExtensionContext) => {
    await getRegistry().release(ctx.sessionManager.getSessionId());
  });
}

function ok(text: string, extra?: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text }], details: extra ?? {} };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Browser error: ${message}` }],
    details: { isError: true },
  };
}
