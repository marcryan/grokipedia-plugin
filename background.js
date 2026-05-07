const queryCache = new Map();
const previewCache = new Map();

function unwrapDuckduckgoRedirect(rawHref) {
  let url;
  try {
    url = new URL(rawHref, "https://duckduckgo.com");
  } catch {
    return null;
  }

  if (url.hostname === "duckduckgo.com" && url.pathname === "/l/") {
    const uddg = url.searchParams.get("uddg");
    if (!uddg) return null;
    try {
      return decodeURIComponent(uddg);
    } catch {
      return uddg;
    }
  }

  return url.href;
}

function isValidGrokipediaArticleUrl(candidate) {
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return false;
  }

  const hostNorm = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (hostNorm !== "grokipedia.com") return false;

  const path = parsed.pathname;
  if (!path.toLowerCase().startsWith("/page/")) return false;

  const slug = path.slice("/page/".length).split("/")[0];
  if (!slug) return false;

  const lowerSlug = decodeURIComponent(slug).toLowerCase();
  if (
    lowerSlug.endsWith(".js") ||
    lowerSlug.endsWith(".css") ||
    lowerSlug.endsWith(".map")
  ) {
    return false;
  }

  return true;
}

function extractOpeningATag(html, aOpen) {
  let i = aOpen + 2;
  let inDouble = false;
  let inSingle = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (c === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (c === ">" && !inDouble && !inSingle) {
      return html.slice(aOpen, i + 1);
    }
  }
  return null;
}

function openingAnchorIndexBefore(html, maxIndex) {
  let pos = maxIndex;
  while (pos >= 0) {
    const i = html.lastIndexOf("<a", pos);
    if (i === -1) return -1;
    const boundary = html[i + 2];
    if (
      boundary === undefined ||
      /\s/.test(boundary) ||
      boundary === "/" ||
      boundary === ">"
    ) {
      return i;
    }
    pos = i - 1;
  }
  return -1;
}

function* iterResultATagOpens(html) {
  const needle = "result__a";
  let pos = 0;
  while (pos < html.length) {
    const idx = html.indexOf(needle, pos);
    if (idx === -1) break;

    const aOpen = openingAnchorIndexBefore(html, idx);
    if (aOpen === -1) {
      pos = idx + needle.length;
      continue;
    }

    const tag = extractOpeningATag(html, aOpen);
    if (
      tag &&
      (/\bclass="[^"]*result__a[^"]*"/i.test(tag) ||
        /\bclass='[^']*result__a[^']*'/i.test(tag))
    ) {
      yield tag;
    }
    pos = idx + needle.length;
  }
}

function hrefFromOpeningTag(tag) {
  const m = tag.match(/\bhref="([^"]*)"/i) || tag.match(/\bhref='([^']*)'/i);
  return m ? m[1] : null;
}

function extractFirstValidGrokipediaUrl(html) {
  const blocks = html.split(/class="[^"]*web-result/i);
  const searchSpaces = blocks.length > 1 ? blocks.slice(1) : [html];

  for (const block of searchSpaces) {
    for (const tag of iterResultATagOpens(block)) {
      const rawHref = hrefFromOpeningTag(tag);
      if (!rawHref) continue;
      const unwrapped = unwrapDuckduckgoRedirect(rawHref);
      if (!unwrapped) continue;
      if (isValidGrokipediaArticleUrl(unwrapped)) {
        return unwrapped;
      }
    }
  }

  for (const tag of iterResultATagOpens(html)) {
    const rawHref = hrefFromOpeningTag(tag);
    if (!rawHref) continue;
    const unwrapped = unwrapDuckduckgoRedirect(rawHref);
    if (!unwrapped) continue;
    if (isValidGrokipediaArticleUrl(unwrapped)) {
      return unwrapped;
    }
  }

  return null;
}

async function searchFirstGrokipediaResult(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  if (queryCache.has(normalized)) return queryCache.get(normalized);

  const q = `site:grokipedia.com ${query}`;
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html"
    }
  });

  if (!response.ok) {
    throw new Error(`Search fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const first = extractFirstValidGrokipediaUrl(html);
  if (first) {
    queryCache.set(normalized, first);
  }
  return first;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

function stripTags(text) {
  return decodeHtmlEntities(
    text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function pickMetaContent(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const m = html.match(re);
    if (m?.[1]) return stripTags(m[1]);
  }
  return "";
}

function pickTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1] ? stripTags(m[1]) : "";
}

function pickFirstParagraph(html) {
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return m?.[1] ? stripTags(m[1]) : "";
}

function pickFirstGrokipediaProse(html) {
  // Grokipedia renders article prose in spans like:
  // <span data-tts-block="true" class="mb-4 block ..."> ... </span>
  // Grabbing the first <p> often hits modals/nav UI instead.
  const m =
    html.match(
      /<span[^>]*\bdata-tts-block=(?:"[^"]*"|[^\s>]+)[^>]*>([\s\S]*?)<\/span>/i
    ) ||
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

  return m?.[1] ? stripTags(m[1]) : "";
}

function buildSentenceRoundedSnippet(text, minWords = 30) {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const wordMatches = [...normalized.matchAll(/\S+/g)];
  if (wordMatches.length <= minWords) return normalized;

  const cutIndex = wordMatches[minWords - 1].index + wordMatches[minWords - 1][0].length;
  const rest = normalized.slice(cutIndex);
  const sentenceEndOffset = rest.search(/[.!?](?:\s|$)/);

  if (sentenceEndOffset === -1) {
    const hardCapWords = Math.min(wordMatches.length, minWords + 15);
    const hardCapIndex =
      wordMatches[hardCapWords - 1].index + wordMatches[hardCapWords - 1][0].length;
    return `${normalized.slice(0, hardCapIndex).trim()}...`;
  }

  return normalized.slice(0, cutIndex + sentenceEndOffset + 1).trim();
}

async function fetchGrokipediaPreview(url) {
  if (!isValidGrokipediaArticleUrl(url)) return null;
  const cacheKey = `v2:${url}`;
  if (previewCache.has(cacheKey)) return previewCache.get(cacheKey);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html" }
  });
  if (!response.ok) {
    throw new Error(`Preview fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const title = pickTitle(html);
  const contentLead =
    pickFirstGrokipediaProse(html) ||
    pickMetaContent(html, ["description", "og:description", "twitter:description"]) ||
    pickFirstParagraph(html);
  const description = buildSentenceRoundedSnippet(contentLead, 30);

  const preview = {
    title,
    description,
    siteName: "Grokipedia"
  };
  previewCache.set(cacheKey, preview);
  return preview;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "RESOLVE_GROKIPEDIA_RESULT") {
    (async () => {
      try {
        const resolved = await searchFirstGrokipediaResult(message.query || "");
        sendResponse({ ok: true, url: resolved });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    })();
    return true;
  }

  if (message?.type === "GET_GROKIPEDIA_PREVIEW") {
    (async () => {
      try {
        const preview = await fetchGrokipediaPreview(message.url || "");
        sendResponse({ ok: true, preview });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    })();
    return true;
  }

  return false;
});
