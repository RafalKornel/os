/**
 * task — minimal subagent extension for pi.
 *
 * Registers a single `task` tool. Calling it spawns a fresh, isolated pi
 * session (in-memory, disposable) with a short role system prompt, runs one
 * self-contained prompt, and returns the child's final answer. The child
 * never sees the parent conversation.
 *
 * Child tools (denylist; everything else that loaded stays enabled):
 *   - always: every built-in and every loaded extension tool EXCEPT `task`
 *     (no recursion). So the child inherits web_search, web_crawl, and any
 *     other installed extension.
 *   - readonly (default): additionally without write/edit/bash/powershell
 *     and without `browser` — the browser drives a real UI and can mutate
 *     app state, so it is a mutating tool. Read-only web access is covered
 *     by web_search + web_crawl.
 *
 * The child's system prompt is built via systemPromptOverride() and is
 * evaluated at prompt time, AFTER the session (and its tool list) exists.
 * We inject the exact list of tools the child got, so the sub-agent always
 * KNOWS it has e.g. the browser — it cannot claim a loaded tool is missing.
 *
 * Browser: the playwright-browser extension keeps a per-session
 * BrowserContext in a process-wide registry; we release the child's context
 * in `finally` after dispose.
 *
 * Debug: every call appends a line to ~/.pi/agent/.task-debug.log
 * (version, cwd, child tool list, extension errors).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  DefaultResourceLoader,
  SessionManager,
  createAgentSession,
  getAgentDir,
  type CreateAgentSessionOptions,
} from "@earendil-works/pi-coding-agent";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";

const TASK_VERSION = "v7-no-browser-ro-2026-09-09";

const EXCLUDE_READONLY = ["task", "write", "edit", "bash", "powershell", "browser"];
const EXCLUDE_FULL = ["task"];

const RESULT_MAX_CHARS = 8000;
const CHILD_TIMEOUT_MS = 20 * 60 * 1000; // hard cap: local GPU, don't hang forever

function debugLog(agentDir: string, line: string) {
  try {
    appendFileSync(join(agentDir, ".task-debug.log"), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // never break the tool for logging
  }
}

function rolePrompt(cwd: string, readonly: boolean, toolNames: string[]): string {
  return [
    `You are a sub-agent running a single self-contained subtask. You have NO access to the parent conversation — the task prompt you receive contains everything you need.`,
    ``,
    `Project directory: ${cwd}`,
    `Your EXACT tool list (use these; they all work): ${toolNames.join(", ") || "(none)"}`,
    readonly
      ? `You are READ-ONLY: never create, modify, or delete any files. You have no write, bash, or browser tools in this mode — for web pages use web_search and web_crawl.`
      : `You may read, create, edit, and delete files, run bash, and drive the browser, to accomplish the task.`,
    ``,
    `Ground rules:`,
    `- You may only call tools that are in your tool list above. If a needed tool is genuinely absent from that list, say so in your answer — never invent or simulate a tool call.`,
    `- Do not ask clarifying questions. Make reasonable assumptions and state them briefly in your answer.`,
    `- Keep your effort bounded: aim to finish within roughly 15 tool calls. If the task is bigger than that, deliver the most important partial result and say what you did not cover.`,
    `- Never run destructive or irreversible commands (rm -rf, force push, migrations) unless the task explicitly says to.`,
    ``,
    `When done, reply with a concise final answer: findings, file paths, and only essential code/quotes. Under 800 words. No preamble — the answer is the final message, not a summary of your process.`,
  ].join("\n");
}

function extractFinalAnswer(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as any;
    if (m && m.role === "assistant" && Array.isArray(m.content)) {
      const text = m.content
        .filter((b: any) => b && b.type === "text" && typeof b.text === "string")
        .map((b: any) => b.text)
        .join("\n")
        .trim();
      if (text) return text;
    }
  }
  return "(subagent produced no final answer)";
}

function parentRuntime(ctx: { modelRegistry: unknown }): CreateAgentSessionOptions["modelRuntime"] {
  // ModelRegistry exposes its ModelRuntime as a public field; sharing the
  // parent's runtime means custom providers (e.g. the bundled llama.cpp
  // provider) and resolved auth work for the child without re-registration.
  return (ctx.modelRegistry as unknown as { runtime?: CreateAgentSessionOptions["modelRuntime"] }).runtime;
}

function briefArgs(toolName: string, args: any): string {
  if (!args || typeof args !== "object") return "";
  const pick = (k: string): string | undefined => (typeof args[k] === "string" ? args[k] : undefined);
  try {
    switch (toolName) {
      case "browser": {
        const action = pick("action") ?? "";
        const target = pick("url") || pick("selector") || "";
        return [action, target].filter(Boolean).join(" ").slice(0, 80);
      }
      case "bash":
        return (pick("command") ?? "").replace(/\s+/g, " ").slice(0, 80);
      case "read":
        return pick("path") ?? "";
      case "web_search":
        return pick("query") ?? "";
      case "web_crawl":
        return pick("url") ?? "";
      case "task":
        return pick("description") ?? "";
      default: {
        const first = Object.values(args).find((v) => typeof v === "string");
        return (typeof first === "string" ? first : "").replace(/\s+/g, " ").slice(0, 80);
      }
    }
  } catch {
    return "";
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "task",
    label: "Task (subagent)",
    description:
      "Run a self-contained subtask in a fresh, isolated sub-agent and return its final answer. The sub-agent has no access to this conversation, so the prompt must be fully self-contained (include paths, context, and exactly what to return). The sub-agent gets read/search tools plus the same web tools (web_search, web_crawl) and its own private browser tabs; it cannot edit files or run bash unless readonly is false, and it cannot spawn nested tasks. Use it for bounded side-work like exploring a code area, checking a doc, reviewing a file, or driving a web UI, so large intermediate output does not bloat this conversation.",
    promptSnippet: "Delegate a self-contained subtask to an isolated sub-agent; returns its final answer",
    promptGuidelines: [
      "Use task for bounded side-tasks (explore, verify, review, web lookups, driving a web UI) to keep their bulky output out of the main conversation; write the sub-prompt to be fully self-contained.",
    ],
    parameters: Type.Object({
      description: Type.String({
        description: "Very short label for what is being delegated (3-6 words), for logging only.",
      }),
      prompt: Type.String({
        description:
          "Complete, self-contained instructions for the sub-agent. It cannot see this conversation: include all needed context, file paths, and the exact form of the answer you expect.",
      }),
      readonly: Type.Optional(
        Type.Boolean({
          description:
            "true (default): sub-agent may only read/search (plus web tools and its own private browser tabs). false: sub-agent may also edit files and run bash.",
        }),
      ),
    }),
    executionMode: "sequential",
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const readonly = params.readonly !== false;
      const cwd = ctx.cwd;
      const agentDir = getAgentDir();

      // Live progress, rendered in the parent TUI under this running tool call.
      // The TUI REPLACES the update text on each onUpdate call (same as bash
      // streaming), so we keep the full transcript and re-send it every time.
      const progress: string[] = [
        `subagent spawned (${readonly ? "read-only" : "full access"}) — "${params.description}"`,
        `instruction: ${params.prompt.replace(/\s+/g, " ").slice(0, 400)}`,
      ];
      const pushUpdate = () => {
        try {
          onUpdate?.({ content: [{ type: "text" as const, text: progress.join("\n") }] });
        } catch {
          /* progress is best-effort */
        }
      };
      const pushLine = (line: string) => {
        progress.push(line);
        pushUpdate();
      };
      pushUpdate();

      // Filled with the child's real tool list after createAgentSession();
      // the override closure reads it at prompt time (later), so it's set.
      let childToolNames: string[] = [];
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        systemPromptOverride: () => rolePrompt(cwd, readonly, childToolNames),
        // Extensions ARE loaded so the child gets extension tools
        // (web_search, web_crawl, browser). Recursion is prevented by the
        // "task" entry in excludeTools.
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
      });
      await loader.reload();

      const result = await createAgentSession({
        cwd,
        agentDir,
        modelRuntime: parentRuntime(ctx),
        model: ctx.model,
        thinkingLevel: ctx.thinkingLevel,
        excludeTools: readonly ? EXCLUDE_READONLY : EXCLUDE_FULL,
        sessionManager: SessionManager.inMemory(cwd),
        resourceLoader: loader,
      });
      const session = result.session;

      const extErrors = (result.extensionsResult as { errors?: Array<{ path: string; error: string }> } | undefined)
        ?.errors ?? [];
      childToolNames = (session.getAllTools() ?? []).map((t: { name: string }) => t.name);
      debugLog(agentDir, `[${TASK_VERSION}] ${readonly ? "readonly" : "full"} cwd=${cwd} tools=[${childToolNames.join(",")}] extErrors=${extErrors.length} desc="${params.description}"`);

      // Stream the sub-agent's activity into the parent TUI via onUpdate.
      let step = 0;
      const unsubscribe = session.subscribe((event: any) => {
        if (event.type === "tool_execution_start") {
          step += 1;
          pushLine(`[step ${step}] ${event.toolName} ${briefArgs(event.toolName, event.args)}`.trimEnd());
        } else if (event.type === "tool_execution_end" && event.isError) {
          pushLine(`[step ${step}] ${event.toolName} → error`);
        } else if (event.type === "turn_end" && Array.isArray(event.toolResults) && event.toolResults.length === 0) {
          pushLine("composing final answer…");
        }
      });

      // Abort child if parent run is aborted, or on hard timeout.
      const onParentAbort = () => session.abort();
      signal?.addEventListener("abort", onParentAbort, { once: true });
      const timeout = setTimeout(() => session.abort(), CHILD_TIMEOUT_MS);

      try {
        await session.prompt(params.prompt);
        let answer = extractFinalAnswer(session.messages as unknown[]);
        if (answer.length > RESULT_MAX_CHARS) {
          answer =
            answer.slice(0, RESULT_MAX_CHARS) +
            `\n\n[... subagent answer truncated, was ${answer.length} chars — ask it to narrow scope if you need the rest]`;
        }
        if (extErrors.length > 0) {
          answer += `\n\n[warning: some extensions failed to load in the subagent: ${extErrors
            .map((e) => e.error)
            .join("; ")}]`;
        }
        return { content: [{ type: "text", text: answer }], details: { description: params.description } };
      } catch (err: any) {
        const msg = err?.message ? String(err.message) : String(err);
        return {
          content: [{ type: "text", text: `Subagent failed: ${msg}` }],
          details: { description: params.description, error: msg },
        };
      } finally {
        unsubscribe();
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onParentAbort);
        const childSessionId: string = session.sessionId;
        try {
          session.dispose();
        } catch {
          // ignore
        }
        // Close the child's private browser tabs, if it used the browser.
        // The registry is a globalThis singleton owned by the
        // playwright-browser extension (see REGISTRY_KEY / getRegistry in its core.ts).
        try {
          const reg = (globalThis as unknown as Record<symbol, unknown>)[
            Symbol.for("pi.browser-registry")
          ] as { release?: (sessionId: string) => Promise<number> } | undefined;
          await reg?.release?.(childSessionId);
        } catch {
          // ignore
        }
      }
    },
  });
}
