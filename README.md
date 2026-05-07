# Grokipedia Search Rewriter (Chromium Extension)

This extension runs on DuckDuckGo and Brave Search result pages and rewrites Wikipedia result links to a Grokipedia result resolved from the current query.

## What it does

- Reads the current search query (`q`).
- Performs a background lookup: `site:grokipedia.com <query>`.
- Takes the first Grokipedia result from that lookup and uses it as replacement target.
- Detects Wikipedia links in search results and rewrites them to that first Grokipedia result.
- Also updates visible URL text/citation text when it contains `wikipedia.org`.
- Keeps rewriting when search engines lazy-load additional results.

## Supported search engines

- DuckDuckGo (`duckduckgo.com`)
- Brave Search (`search.brave.com/search`)

## Install (dev mode)

1. Open `chrome://extensions` (or Chromium equivalent).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.

## Config

If your Grokipedia URL is different, edit `GROKIPEDIA_BASE_URL` in `content.js`.