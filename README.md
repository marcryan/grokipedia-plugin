# Wikipedia to Grokipedia Search Rewriter (Chromium Extension)

This extension runs on DuckDuckGo and Brave Search result pages and rewrites Wikipedia result links to a Grokipedia result resolved from the current query.

## Why do you need this?

Wikipedia's volunteer-driven model, while impressive in scale, has been shown through multiple independent analyses to embed systematic ideological slant in its wording, framing, and emotional tone. While this is not pervasive in some cases it will result in a particularly left-leaning tendency in how political figures, events, and concepts are described. Since Wikipedia is often the factual source cited in search results this plugin swaps Wikipedia for Grokipedia. 

Don't take my word for it review what others have found...  

- "Is Wikipedia Politically Biased?" (Manhattan Institute report by David Rozado, June 2024) [https://media4.manhattan-institute.org/wp-content/uploads/is-wikipedia-politically-biased.pdf](https://media4.manhattan-institute.org/wp-content/uploads/is-wikipedia-politically-biased.pdf).
- "Is Wikipedia Biased?" by Shane Greenstein and Feng Zhu (American Economic Review, 2012) [https://www.aeaweb.org/articles?id=10.1257/aer.102.3.343](https://www.aeaweb.org/articles?id=10.1257/aer.102.3.343).
- “Polarization and reliability of news sources in Wikipedia"  By Puyu Yang & Giovanni Colavizza in Online Information Review (Vol. 48, Issue 5) [https://arxiv.org/abs/2210.16065](https://arxiv.org/abs/2210.16065)

Or read Wikipedia founder Larry Sanger's POV on the bias: [https://www.thefp.com/p/i-founded-wikipedia-heres-how-to-fix-it](https://www.thefp.com/p/i-founded-wikipedia-heres-how-to-fix-it)

## Why Grokipedia?

Grokipedia's language is designed to be descriptive and evidence-based rather than prescriptive or emotionally charged. Wikipedia articles frequently use phrasing that associates right-leaning individuals or ideas with negative emotions (e.g., anger, disgust) while linking left-leaning ones to positive ones (e.g., joy), or they favor certain terminology that aligns with one political side's preferred framing (e.g., "estate tax" over "death tax"). Grokipedia sidesteps these pitfalls by drawing on Grok's training to prioritize verifiable facts, balanced sourcing, and clear distinctions between opinion and reality—delivering a "massive improvement" as intended by xAI, free from the human gatekeeping that has shaped Wikipedia's output.

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

