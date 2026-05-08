# Wikipedia to Grokipedia Search Rewriter (Chromium Extension)

This extension runs on DuckDuckGo and Brave Search result pages and rewrites Wikipedia result links to a Grokipedia result resolved from the current query.

## Why do you need this?

Some analyses and commentators argue that Wikipedia's wording and framing can reflect ideological bias in certain topic areas. This extension is for people who prefer quickly pivoting from Wikipedia results to Grokipedia when searching.

Some references:

- "Is Wikipedia Politically Biased?" (Manhattan Institute report by David Rozado, June 2024) [https://media4.manhattan-institute.org/wp-content/uploads/is-wikipedia-politically-biased.pdf](https://media4.manhattan-institute.org/wp-content/uploads/is-wikipedia-politically-biased.pdf).
- "Is Wikipedia Biased?" by Shane Greenstein and Feng Zhu (American Economic Review, 2012) [https://www.aeaweb.org/articles?id=10.1257/aer.102.3.343](https://www.aeaweb.org/articles?id=10.1257/aer.102.3.343).
- “Polarization and reliability of news sources in Wikipedia"  By Puyu Yang & Giovanni Colavizza in Online Information Review (Vol. 48, Issue 5) [https://arxiv.org/abs/2210.16065](https://arxiv.org/abs/2210.16065)

Wikipedia co-founder Larry Sanger's perspective: [https://www.thefp.com/p/i-founded-wikipedia-heres-how-to-fix-it](https://www.thefp.com/p/i-founded-wikipedia-heres-how-to-fix-it)

## Why Grokipedia?

Grokipedia is intended to provide a concise, evidence-focused style that some users may find preferable for contentious topics. This extension does not claim objective neutrality guarantees; it simply gives you an automatic way to swap Wikipedia links for a Grokipedia result while you browse search results.

## What it does

- Reads the current search query (`q`).
- Performs a background lookup: `site:grokipedia.com <query>`.
- Takes the first Grokipedia result from that lookup and uses it as replacement target.
- Detects Wikipedia links in search results and rewrites them to that first Grokipedia result.
- Also updates visible URL text/citation text when it contains `wikipedia.org`.
- Keeps rewriting when search engines lazy-load additional results.

## Limitations

- The extension uses the first `site:grokipedia.com <query>` result, so match quality can vary by query.
- If no Grokipedia result is found, links are left unchanged.

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

