import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_crawl",
    label: "Web Crawl",
    description: "Crawl a website and extract its content as markdown using the crwl command.",
    promptSnippet: "Crawl a website and extract content as markdown",
    promptGuidelines: ["Use web_crawl when the user asks to extract content from a website URL."],
    parameters: Type.Object({
      url: Type.String({ description: "The URL of the website to crawl" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      try {
        const result = await pi.exec("crwl", ["crawl", params.url, "-o", "markdown"], {
          timeout: 30000,
        });

        if (result.exitCode !== 0 || result.code !== 0) {
          const errorMsg = result.stderr || result.stdout || `crwl exited with code ${result.code ?? result.exitCode}`;
          return {
            content: [{ type: "text", text: `Error crawling ${params.url}:\n${errorMsg}` }],
            details: { isError: true },
          };
        }

        return {
          content: [{ type: "text", text: `--- ${params.url} ---\n\n${result.stdout}` }],
          details: { url: params.url, status: "success" },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to crawl ${params.url}: ${message}` }],
          details: { isError: true },
        };
      }
    },
  });
}
