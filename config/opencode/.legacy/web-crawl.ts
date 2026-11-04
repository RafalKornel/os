import { type Plugin, tool } from "@opencode-ai/plugin"

export const WebCrawlPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      web_crawl: tool({
        description: "Crawl a website and extract its content as markdown using the crwl command.",
        args: {
          url: tool.schema.string({ description: "The URL of the website to crawl" }),
        },
        async execute(args) {
          try {
            const result = await ctx.$`crwl crawl ${args.url} -o markdown`
            const stdout = result.stdout?.toString().trim() ?? ""
            const stderr = result.stderr?.toString().trim() ?? ""

            const hasContent = stdout.length > 0
            if (result.exitCode !== 0 && !hasContent) {
              const errorMsg = stderr || `crwl exited with code ${result.exitCode}`
              return { content: [{ type: "text", text: `Error crawling ${args.url}:\n${errorMsg}` }], details: { isError: true } }
            }

            return { content: [{ type: "text", text: `--- ${args.url} ---\n\n${stdout}` }], details: { url: args.url, status: "success" } }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            return { content: [{ type: "text", text: `Failed to crawl ${args.url}: ${message}` }], details: { isError: true } }
          }
        },
      }),
    },
  }
}
