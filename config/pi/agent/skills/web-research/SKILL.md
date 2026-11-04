---
name: web-research
description: >
  Augmented web research via search + crawl. When the user asks you to look up
  information, facts, documentation, or real-time data the user doesn't provide,
  invoke this skill. Performs a web search, identifies the most relevant pages,
  crawls up to 5 of them, and aggregates the findings into a focused answer.
  Always use when the user says 'search', 'look up', 'find out', 'research',
  'what is', 'how does', or any query requiring external/fact-based answers.
  Never use for general knowledge you already know — only when you need fresh
  or sourced information.
---

# Web Research Skill

Use `web_search` and `web_crawl` to perform informed, sourced research tasks.

## Workflow

Follow these steps every time:

### 1. Clarify & Deconstruct

If the user's query is broad or ambiguous, restate it briefly and narrow it down. Break complex questions into sub-queries if needed.

### 2. Search

Use `web_search` with a targeted query (1-2 sentences, natural language).

```
web_search(query: "your focused search term")
```

- Prefer queries that would return technical docs, authoritative sources, or recent articles.
- If the first result set is unhelpful, try a refined query (different keywords, quotes, or site operators).

### 3. Score & Select Pages

From the search results, identify the **0-5** most relevant URLs based on:

| Priority | Criteria |
|----------|----------|
| 1 | Official documentation or source |
| 2 | Authoritative, recent articles (within 2 years for time-sensitive topics) |
| 3 | High signal-to-noise pages (skip forum noise, ads, link farms) |
| 4 | English-language sources preferred unless the topic is language-specific |

If the user specifies sources (e.g., "check the Rust docs"), prioritize those even if lower-ranked.

**If there are no relevant results (0 pages),** try a second search with different terms. If still no good results, say so honestly — don't hallucinate.

### 4. Crawl

Use `web_crawl` on each selected URL:

```
web_crawl(url: "https://example.com/article")
```

- Crawl in parallel when possible (fire all `web_crawl` calls together).
- Prioritize the most promising page first.

### 5. Aggregate & Synthesize

From all crawled content, produce a synthesized answer that includes:

- **Direct answer** to the user's original question (top of the response)
- **Key findings** organized by theme/sub-topic
- **Source attribution** with links (e.g., *"Source: [Mozilla MDN](https://...)"*)
- **Confidence level**: 
  - **High** — multiple authoritative sources agree
  - **Medium** — sources agree but are fewer or slightly dated
  - **Low** — conflicting sources or no good sources found
- **Gaps** — note anything you could not verify and suggest next steps

### 6. Cite & Verify

- Always include source URLs so the user can verify.
- If sources conflict, present both sides and note the discrepancy.
- For time-sensitive facts, check dates and prefer the most recent.
- For technical API/reference info, prefer official docs, then secondarily community sources.

## Quality Checklist

Before delivering your answer:

- [ ] Did you search at least once?
- [ ] Did you actually crawl the pages cited?
- [ ] Are sources directly relevant to the query?
- [ ] Is the answer focused (not a raw dump of scraped content)?
- [ ] Does it include source links?
- [ ] Do you note any uncertainty or conflicting information?

## Tips & Gotchas

- **Broad queries** → narrow with site operators: `site:github.com "query"`, or add `site:docs.python.org`.
- **Stale info** → add the current year to your query: `"React 19 release date" 2025`.
- **Deep links** → if a homepage doesn't have the detail, refine the search: `"specific-page-name" site:docs.company.com`.
- **Rate limiting** → if you can't crawl a page, note it and try a different source.
- **0-crawl edge case** → it's fine to say "I searched but didn't find reliable sources" — better than guessing.

## Example

```
User: "What's new in Python 3.12?"

Step 1: web_search("Python 3.12 new features changelog")
Step 2: Selected — python.org official release notes, docs.python.org, and one reputable tech blog
Step 3: web_crawl on all 3 (in parallel)
Step 4: Synthesize — list major features (free-threaded CPython, new typing features, f-string parsing, etc.) with source links
```

```
User: "How does Rust's async await work?"

Step 1: web_search("Rust async await tutorial official docs")
Step 2: Selected — docs.rs futures crate, the Book's async chapter, and a recent blog post
Step 3: Crawl all selected
Step 4: Present with confidence "High" — multiple authoritative Rust sources agree
```
