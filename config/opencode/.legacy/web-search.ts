import { type Plugin, tool } from "@opencode-ai/plugin"

const SEARXNG_URL = "http://arch:8888"

function searchUrl(query: string): string {
  return `${SEARXNG_URL}/search?q=${encodeURIComponent(query)}&format=json`
}

export const WebSearchPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      web_search: tool({
        description: "Search the web via a local SearXNG instance. Returns structured JSON results with title, URL, and content preview.",
        args: {
          query: tool.schema.string({ description: "The search query" }),
        },
        async execute(args) {
          try {
            const result = await ctx.$`curl -s ${searchUrl(args.query)}`
            const stdout = result.stdout?.toString().trim() ?? ""
            const stderr = result.stderr?.toString().trim() ?? ""

            if (result.exitCode !== 0) {
              const errorMsg = stderr || stdout || `curl exited with code ${result.exitCode}`
              return { content: [{ type: "text", text: `Error searching:\n${errorMsg}` }], details: { isError: true } }
            }

            const data = JSON.parse(stdout) as {
              results: Array<{ title: string; url: string; content?: string; engine?: string }>
            }

            if (!data.results || data.results.length === 0) {
              return { content: [{ type: "text", text: `No results found for "${args.query}".` }], details: { query: args.query, resultCount: 0 } }
            }

            const items = data.results
              .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}${r.content ? "\n   Preview: " + r.content : ""}`)
              .join("\n\n")

            return {
              content: [{ type: "text", text: `Search results for "${args.query}":\n\n${items}` }],
              details: { query: args.query, resultCount: data.results.length, engines: [...new Set(data.results.map((r) => r.engine).filter(Boolean))] },
            }
          } catch (error: unknown) {
            if (error instanceof SyntaxError) {
              const result = await ctx.$`curl -s ${searchUrl(args.query)}`
              return { content: [{ type: "text", text: `Failed to parse SearXNG response:\n${(result.stdout?.toString() ?? "").slice(0, 2000)}` }], details: { isError: true } }
            }
            const message = error instanceof Error ? error.message : String(error)
            return { content: [{ type: "text", text: `Search failed: ${message}` }], details: { isError: true } }
          }
        },
      }),
    },
  }
}
