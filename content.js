(() => {
  "use strict";

  const GROKIPEDIA_BASE_URL = "https://grokipedia.com/page/";
  const GROKIPEDIA_ICON_URL = "https://grokipedia.com/favicon.ico";
  const WIKI_HOST_PATTERN = /(^|\.)wikipedia\.org$/i;
  const WIKI_PATH_PATTERN = /^\/wiki\/([^#?]+)/i;

  let queryBasedReplacementUrl = null;
  const previewCache = new Map();

  function decodeWikiTitle(encodedTitle) {
    try {
      return decodeURIComponent(encodedTitle).replace(/_/g, " ");
    } catch {
      return encodedTitle.replace(/_/g, " ");
    }
  }

  function encodeWikiTitle(title) {
    return encodeURIComponent(title.replace(/\s+/g, "_")).replace(/%2F/g, "/");
  }

  function toGrokipediaUrl(wikipediaUrl) {
    let url;
    try {
      url = new URL(wikipediaUrl);
    } catch {
      return null;
    }

    if (!WIKI_HOST_PATTERN.test(url.hostname)) return null;
    const pathMatch = url.pathname.match(WIKI_PATH_PATTERN);
    if (!pathMatch) return null;

    const wikiTitle = decodeWikiTitle(pathMatch[1]);
    const normalizedBase = GROKIPEDIA_BASE_URL.endsWith("/")
      ? GROKIPEDIA_BASE_URL
      : `${GROKIPEDIA_BASE_URL}/`;

    return `${normalizedBase}${encodeWikiTitle(wikiTitle)}`;
  }

  function isUsableGrokipediaArticleUrl(candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname.replace(/^www\./i, "").toLowerCase() !== "grokipedia.com") {
        return false;
      }
      const m = parsed.pathname.match(/^\/page\/([^/?#]+)/i);
      return Boolean(m?.[1]);
    } catch {
      return false;
    }
  }

  function effectiveWikipediaUrlFromString(href) {
    if (!href || typeof href !== "string") return null;
    try {
      const u = new URL(href);
      if (!WIKI_HOST_PATTERN.test(u.hostname)) return null;
      if (!WIKI_PATH_PATTERN.test(u.pathname)) return null;
      return u.toString();
    } catch {
      return null;
    }
  }

  function effectiveWikipediaUrlFromAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return null;
    try {
      const u = new URL(anchor.href, document.baseURI);
      return effectiveWikipediaUrlFromString(u.href);
    } catch {
      return null;
    }
  }

  function replaceTextIfNeeded(el, fromDomain, toDomain) {
    if (!el || !el.textContent) return;
    if (!el.textContent.toLowerCase().includes(fromDomain)) return;
    el.textContent = el.textContent.replace(new RegExp(fromDomain, "gi"), toDomain);
  }

  function replaceWordInTextNodes(root, fromWord, toWord) {
    if (!(root instanceof Element)) return;
    const re = new RegExp(`\\b${fromWord}\\b`, "gi");
    const testRe = new RegExp(`\\b${fromWord}\\b`, "i");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue || !testRe.test(node.nodeValue)) continue;
      node.nodeValue = node.nodeValue.replace(re, toWord);
    }
  }

  function setReadableTitleText(anchor, replacementUrl) {
    try {
      const parsed = new URL(replacementUrl);
      const wikiMatch = parsed.pathname.match(/^\/page\/([^/?#]+)/i);
      if (!wikiMatch) return;
      const decodedTitle = decodeWikiTitle(wikiMatch[1]);
      if (anchor.textContent && anchor.textContent.trim().length > 0) {
        anchor.textContent = decodedTitle;
      }
    } catch {
      // Ignore parse errors; URL replacement still works.
    }
  }

  function isSidebarCard(container) {
    if (!(container instanceof Element)) return false;
    return Boolean(
      container.closest(
        ".sidebar, .module--about, .zci, [class*='sidebar'], [data-layout='sidebar']"
      )
    );
  }

  function isMainResultCard(container) {
    if (!(container instanceof Element)) return false;
    if (isSidebarCard(container)) return false;
    if (container.classList.contains("result")) return true;
    return Boolean(container.closest("#links, main, [data-layout='organic']"));
  }

  function pickSnippetTarget(container) {
    const direct =
      container.querySelector(".result__snippet") ||
      container.querySelector("[data-result='snippet']") ||
      container.querySelector(".result-snippet") ||
      container.querySelector("[class~='snippet']");
    if (direct instanceof HTMLElement) return direct;

    const candidates = container.querySelectorAll("p, div, span");
    let best = null;
    let bestLen = Number.POSITIVE_INFINITY;
    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest("a, cite")) continue;
      const text = (el.textContent || "").trim();
      if (text.length < 50 || text.length > 320) continue;
      if (text.includes("http")) continue;
      if (el.querySelector("a, button, input, img")) continue;
      if (text.length < bestLen) {
        best = el;
        bestLen = text.length;
      }
    }
    return best;
  }

  function findResultCard(anchor) {
    return (
      anchor.closest(".result") ||
      anchor.closest("[data-layout='organic']") ||
      anchor.closest("article") ||
      anchor.closest("li") ||
      anchor.closest("div")
    );
  }

  function updateResultIcon(container) {
    if (!(container instanceof Element)) return;
    const iconImg =
      container.querySelector("img[src*='wikipedia.org']") ||
      container.querySelector("img[alt*='wikipedia' i]") ||
      container.querySelector(".result__icon img") ||
      container.querySelector("img");

    if (!iconImg) return;
    iconImg.src = GROKIPEDIA_ICON_URL;
    iconImg.setAttribute("alt", "Grokipedia");
  }

  function requestGrokipediaPreview(url) {
    const cacheKey = `v2:${url}`;
    if (previewCache.has(cacheKey)) return Promise.resolve(previewCache.get(cacheKey));
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_GROKIPEDIA_PREVIEW", url }, (response) => {
        if (chrome.runtime.lastError || !response?.ok || !response.preview) {
          resolve(null);
          return;
        }
        previewCache.set(cacheKey, response.preview);
        resolve(response.preview);
      });
    });
  }

  function applyPreviewToContainer(container, preview) {
    if (!(container instanceof Element) || !preview) return;

    replaceWordInTextNodes(container, "wikipedia", "Grokipedia");
    replaceTextIfNeeded(container, "wikipedia.org", "grokipedia.com");

    if (isMainResultCard(container)) {
      const snippetTarget = pickSnippetTarget(container);
      if (snippetTarget && preview.description) {
        snippetTarget.textContent = preview.description;
      }
      updateResultIcon(container);
    }
  }

  async function updateAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return;
    if (anchor.hasAttribute("data-grokipedia-rewritten")) return;

    const wikiArticleUrl = effectiveWikipediaUrlFromAnchor(anchor);
    if (!wikiArticleUrl) return;

    const resolved =
      queryBasedReplacementUrl && isUsableGrokipediaArticleUrl(queryBasedReplacementUrl)
        ? queryBasedReplacementUrl
        : null;
    const newUrl = resolved || toGrokipediaUrl(wikiArticleUrl);
    if (!newUrl || anchor.href === newUrl) return;

    anchor.href = newUrl;
    anchor.setAttribute("data-grokipedia-rewritten", "true");
    replaceTextIfNeeded(anchor, "wikipedia.org", "grokipedia.com");
    setReadableTitleText(anchor, newUrl);

    const resultContainer = findResultCard(anchor);
    if (resultContainer) {
      const nearby = resultContainer.querySelectorAll("cite");
      for (const node of nearby) {
        replaceTextIfNeeded(node, "wikipedia.org", "grokipedia.com");
      }

      const preview = await requestGrokipediaPreview(newUrl);
      applyPreviewToContainer(resultContainer, preview);
    }
  }

  function collectWikipediaAnchors(root) {
    const out = new Set();
    if (!(root instanceof Element) && root !== document) return out;
    const scope = root === document ? document : root;

    for (const a of scope.querySelectorAll("a[href*='wikipedia.org/wiki/']")) {
      out.add(a);
    }
    return out;
  }

  function rewriteAllWikipediaLinks(root = document) {
    for (const anchor of collectWikipediaAnchors(root)) {
      updateAnchor(anchor);
    }
  }

  function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("q") || "").trim();
  }

  function requestFirstGrokipediaResult(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "RESOLVE_GROKIPEDIA_RESULT", query },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          if (!response?.ok || !response?.url) {
            resolve(null);
            return;
          }
          resolve(response.url);
        }
      );
    });
  }

  function isSearchResultsPage() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    const onDuckDuckGo = host === "duckduckgo.com" && (path === "/" || path === "/html");
    const onBrave = host === "search.brave.com" && path === "/search";
    return (onDuckDuckGo || onBrave) && params.has("q");
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.matches?.("a[href*='wikipedia.org/wiki/']") ||
            (node.matches?.("a") && effectiveWikipediaUrlFromAnchor(node))
          ) {
            updateAnchor(node);
          }
          rewriteAllWikipediaLinks(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async function init() {
    if (!isSearchResultsPage()) return;

    const query = getSearchQuery();
    if (query) {
      const candidate = await requestFirstGrokipediaResult(query);
      queryBasedReplacementUrl = isUsableGrokipediaArticleUrl(candidate) ? candidate : null;
    }

    rewriteAllWikipediaLinks();
    startObserver();
  }

  init();
})();
