import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const SEARXNG_URL = "http://arch:8888";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the web via a local SearXNG instance. Returns structured JSON results with title, URL, and content preview for each result.",
    promptSnippet: "Search the web via SearXNG",
    promptGuidelines: ["Use web_search when the user asks to search the web for information."],
    parameters: Type.Object({
      query: Type.String({ description: "The search query" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const encodedQuery = encodeURIComponent(params.query);
      const result = await pi.exec(
        "curl",
        ["-s", `${SEARXNG_URL}/search?q=${encodedQuery}&format=json`],
        { timeout: 15000 },
      );

      if (result.exitCode !== 0 || result.code !== 0) {
        const errorMsg = result.stderr || result.stdout || `curl exited with code ${result.code ?? result.exitCode}`;
        return {
          content: [{ type: "text", text: `Error searching:\n${errorMsg}` }],
          details: { isError: true },
        };
      }

      try {
        const data = JSON.parse(result.stdout) as {
          results: Array<{
            title: string;
            url: string;
            content?: string;
            engine?: string;
          }>;
        };

        if (!data.results || data.results.length === 0) {
          return {
            content: [{ type: "text", text: `No results found for "${params.query}".` }],
            details: { query: params.query, resultCount: 0 },
          };
        }

        const items = data.results.map((r, i) =>
          `${i + 1}. ${r.title}\n   URL: ${r.url}\n${r.content ? "   Preview: " + r.content : ""}`,
        ).join("\n\n");

        return {
          content: [{ type: "text", text: `Search results for "${params.query}":\n\n${items}` }],
          details: {
            query: params.query,
            resultCount: data.results.length,
            engines: [...new Set(data.results.map((r) => r.engine).filter(Boolean))],
          },
        };
      } catch {
        return {
          content: [{ type: "text", text: `Failed to parse SearXNG response:\n${result.stdout.slice(0, 2000)}` }],
          details: { isError: true },
        };
      }
    },
  });
}
