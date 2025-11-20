// content.js - Thu thập dữ liệu bài viết/bài đăng theo cấu trúc JSON

function extractStructuredData() {
  const url = window.location.href;
  const title = extractTitle();
  const createdAt = extractPublishedTime();
  const author = extractAuthor();
  const platform = detectPlatform();
  const imageUrls = extractImageUrls();
  const socialPosts = extractSocialPosts();
  const mainArticle = extractArticleText();
  const fallback = extractFallbackText();
  const article = extractArticle({
    socialPosts,
    main: mainArticle,
    fallback,
  });

  return {
    success: true,
    data: {
      url,
      title: title || null,
      article,
      created_at: createdAt || null,
      author: author || null,
      platform: platform || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    },
  };
}

function extractTitle() {
  const metaSelectors = [
    'meta[property="og:title"]',
    'meta[name="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'meta[itemprop="headline"]',
  ];

  for (const selector of metaSelectors) {
    const el = document.querySelector(selector);
    if (el && el.content) {
      return el.content.trim();
    }
  }

  const h1 = document.querySelector("h1");
  if (h1 && h1.innerText.trim().length > 0) {
    return h1.innerText.trim();
  }

  return document.title ? document.title.trim() : null;
}

function extractArticleText() {
  const selectors = [
    "article",
    "main article",
    "main",
    '[role="main"]',
    '[class*="article"]',
    '[class*="Article"]',
    '[class*="content"]',
    '[id*="article"]',
    '[id*="content"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = sanitizeText(el.innerText);
      if (text && text.length > 200) {
        return text;
      }
    }
  }

  const longParagraphs = Array.from(document.querySelectorAll("p"))
    .map((p) => sanitizeText(p.innerText))
    .filter((text) => text && text.length > 80);

  if (longParagraphs.length >= 3) {
    return longParagraphs.join("\n\n");
  }

  return null;
}

function extractFallbackText() {
  const bodyText = sanitizeText(document.body?.innerText || "");
  return bodyText && bodyText.length > 0 ? bodyText : null;
}

function detectPlatform() {
  const hostname = window.location.hostname;

  if (hostname.includes("facebook.com")) return "facebook";
  if (hostname.includes("instagram.com")) return "instagram";
  if (hostname.includes("x.com") || hostname.includes("twitter.com"))
    return "twitter";
  if (hostname.includes("tiktok.com")) return "tiktok";
  if (hostname.includes("youtube.com")) return "youtube";

  return "web";
}

function extractImageUrls() {
  const seen = new Set();
  const addUrl = (raw) => {
    if (!raw) return;
    const resolved = resolveUrl(raw);
    if (resolved) {
      seen.add(resolved);
    }
  };

  const metaImageSelectors = [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[name="twitter:image"]',
    'meta[itemprop="image"]',
  ];

  for (const selector of metaImageSelectors) {
    const el = document.querySelector(selector);
    if (el && el.content) {
      addUrl(el.content);
    }
  }

  const ldJsonImages = extractImagesFromJsonLd();
  for (const src of ldJsonImages) {
    addUrl(src);
  }

  const articleImages = findArticleImages();
  for (const image of articleImages) {
    addUrl(image);
  }

  return Array.from(seen);
}

function findArticleImages() {
  const scopes = ["article", "main article", "main", '[role="main"]'];

  for (const scopeSelector of scopes) {
    const scope = document.querySelector(scopeSelector);
    if (!scope) continue;

    const text = sanitizeText(scope.innerText);
    if (!text || text.length <= 200) {
      continue;
    }

    const urls = collectImagesWithinScope(scope);
    if (urls.length > 0) {
      return urls;
    }
  }

  return [];
}

function collectImagesWithinScope(scope) {
  const seen = new Set();
  const add = (value) => {
    if (!value) return;
    if (value.startsWith("data:")) return;
    seen.add(value);
  };

  const imgNodes = scope.querySelectorAll("img[src], img[srcset]");
  imgNodes.forEach((img) => {
    add(img.getAttribute("src"));
    const srcsetBest = pickBestFromSrcset(img.getAttribute("srcset"));
    if (srcsetBest) {
      add(srcsetBest);
    }
  });

  const sourceNodes = scope.querySelectorAll("picture source[srcset]");
  sourceNodes.forEach((source) => {
    const srcsetBest = pickBestFromSrcset(source.getAttribute("srcset"));
    if (srcsetBest) {
      add(srcsetBest);
    }
  });

  return Array.from(seen);
}

function pickBestFromSrcset(srcset) {
  if (!srcset) return null;

  const parts = srcset
    .split(",")
    .map((segment) => segment.trim().split(" ")[0])
    .filter(Boolean);

  return parts.length > 0 ? parts[parts.length - 1] : null;
}

function extractAuthor() {
  const metaSelectors = [
    'meta[property="article:author"]',
    'meta[name="author"]',
    'meta[name="byl"]',
    'meta[name="dc.creator"]',
    'meta[name="creator"]',
    'meta[itemprop="author"]',
    'meta[name="twitter:creator"]',
  ];

  for (const selector of metaSelectors) {
    const el = document.querySelector(selector);
    if (el && el.content) {
      const cleaned = sanitizeInline(el.content);
      if (cleaned) {
        return stripByPrefix(cleaned);
      }
    }
  }

  const linkAuthor = document.querySelector(
    'a[rel="author"], link[rel="author"]'
  );
  if (linkAuthor) {
    const text = sanitizeInline(
      linkAuthor.textContent || linkAuthor.getAttribute("title")
    );
    if (text) {
      return stripByPrefix(text);
    }
  }

  const authorCandidates = Array.from(
    document.querySelectorAll(
      '[class*="author"], [id*="author"], [itemprop="author"], .byline'
    )
  );
  for (const candidate of authorCandidates) {
    const text = sanitizeInline(candidate.innerText || candidate.textContent);
    if (text && text.length < 120) {
      const refined = stripByPrefix(text);
      if (refined) {
        return refined;
      }
    }
  }

  const jsonLdAuthor = extractAuthorFromJsonLd();
  if (jsonLdAuthor) {
    return jsonLdAuthor;
  }

  const hostname = window.location.hostname;

  if (hostname.includes("facebook.com")) {
    const profileLink = document.querySelector(
      '[role="article"] a[role="link"][tabindex="0"] span'
    );
    const text = sanitizeInline(
      profileLink?.innerText || profileLink?.textContent
    );
    if (text) {
      return text;
    }
  }

  if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    const nameEl = document.querySelector(
      'article div[data-testid="User-Names"] span'
    );
    const text = sanitizeInline(nameEl?.innerText || nameEl?.textContent);
    if (text) {
      return text;
    }
  }

  if (hostname.includes("instagram.com")) {
    const authorMeta = document.querySelector('meta[property="og:title"]');
    if (authorMeta && authorMeta.content) {
      const cleaned = sanitizeInline(authorMeta.content.split("•")[0]);
      if (cleaned) {
        return cleaned;
      }
    }
  }

  return null;
}

function extractSocialPosts() {
  const hostname = window.location.hostname;

  if (hostname.includes("facebook.com")) {
    return Array.from(document.querySelectorAll('[role="article"]'))
      .map((el) => sanitizeText(el.innerText))
      .filter(Boolean);
  }

  if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    return Array.from(
      document.querySelectorAll(
        'article [data-testid="tweetText"], article div[lang]'
      )
    )
      .map((el) => sanitizeText(el.innerText))
      .filter(Boolean);
  }

  if (hostname.includes("instagram.com")) {
    const meta = document.querySelector('meta[property="og:description"]');
    if (meta && meta.content) {
      const cleaned = meta.content.replace(/".*"/g, "").trim();
      return cleaned ? [cleaned] : [];
    }
  }

  return [];
}

function shouldIncludeFacebookText(text, seen) {
  if (!text) return false;
  if (text.length < 20) return false;
  if (seen.has(text)) return false;

  const lower = text.toLowerCase();
  if (/^(thích|chia sẻ|viết bình luận)/i.test(text)) return false;
  if (lower.includes("facebook") && lower.includes("copyright")) return false;

  return true;
}

function extractArticle({ socialPosts, main, fallback }) {
  let text = null;

  if (socialPosts && socialPosts.length > 0) {
    text = socialPosts.join("\n\n---\n\n");
  } else if (main) {
    text = main;
  } else {
    text = fallback || null;
  }

  return cleanArticleText(text);
}

function cleanArticleText(text) {
  if (!text) return text;

  let cleaned = text;
  const upper = cleaned.toUpperCase();
  const stopMarkers = [
    "TIN LIÊN QUAN",
    "TỪ KHÓA",
    "BÌNH LUẬN",
    "GỬI BÌNH LUẬN",
  ];

  let cutIndex = -1;
  for (const marker of stopMarkers) {
    const idx = upper.indexOf(marker);
    if (idx !== -1 && (cutIndex === -1 || idx < cutIndex)) {
      cutIndex = idx;
    }
  }

  if (cutIndex !== -1) {
    cleaned = cleaned.slice(0, cutIndex);
  }

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

function extractPublishedTime() {
  const selectors = [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publish-date"]',
    'meta[name="date"]',
    'meta[name="dcterms.created"]',
    'meta[itemprop="datePublished"]',
    'meta[property="og:updated_time"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.content) {
      const normalized = normalizeDate(el.content);
      if (normalized) {
        return normalized;
      }
    }
  }

  const timeEl = document.querySelector("time[datetime], time[pubdate]");
  if (timeEl) {
    const dateText =
      timeEl.getAttribute("datetime") ||
      timeEl.getAttribute("pubdate") ||
      timeEl.innerText;
    const normalized = normalizeDate(dateText);
    if (normalized) {
      return normalized;
    }
  }

  const ldJsonDate = extractDateFromJsonLd();
  if (ldJsonDate) {
    return normalizeDate(ldJsonDate) || ldJsonDate;
  }

  return null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return raw.trim() || null;
}

function extractDateFromJsonLd() {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      const date = findDateInJsonLd(json);
      if (date) {
        return date;
      }
    } catch (_) {
      // Bỏ qua JSON-LD không hợp lệ
    }
  }

  return null;
}

function extractAuthorFromJsonLd() {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      const author = findAuthorInJsonLd(json);
      if (author) {
        return author;
      }
    } catch (_) {
      // Bỏ qua JSON-LD không hợp lệ
    }
  }

  return null;
}

function extractImagesFromJsonLd() {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );

  const images = new Set();

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      collectImagesFromJsonLd(json, images);
    } catch (_) {
      // Bỏ qua JSON-LD không hợp lệ
    }
  }

  return Array.from(images);
}

function findDateInJsonLd(node) {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const result = findDateInJsonLd(item);
      if (result) return result;
    }
    return null;
  }

  if (typeof node === "object") {
    const dateFields = [
      "datePublished",
      "dateCreated",
      "uploadDate",
      "dateModified",
    ];

    for (const field of dateFields) {
      if (typeof node[field] === "string") {
        return node[field];
      }
    }

    for (const value of Object.values(node)) {
      const result = findDateInJsonLd(value);
      if (result) return result;
    }
  }

  return null;
}

function findAuthorInJsonLd(node) {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const result = findAuthorInJsonLd(item);
      if (result) return result;
    }
    return null;
  }

  if (typeof node === "object") {
    if (typeof node.author === "string") {
      return stripByPrefix(node.author);
    }

    if (node.author && typeof node.author === "object") {
      if (typeof node.author.name === "string") {
        return stripByPrefix(node.author.name);
      }
    }

    for (const value of Object.values(node)) {
      const result = findAuthorInJsonLd(value);
      if (result) return result;
    }
  }

  return null;
}

function collectImagesFromJsonLd(node, images) {
  if (!node) return;

  const addImage = (value) => {
    if (typeof value === "string") {
      images.add(value);
    }
  };

  if (Array.isArray(node)) {
    node.forEach((item) => collectImagesFromJsonLd(item, images));
    return;
  }

  if (typeof node === "object") {
    if (node.image) {
      if (typeof node.image === "string") {
        addImage(node.image);
      } else if (Array.isArray(node.image)) {
        node.image.forEach(addImage);
      } else if (typeof node.image === "object") {
        addImage(node.image.url);
      }
    }

    for (const value of Object.values(node)) {
      collectImagesFromJsonLd(value, images);
    }
  }
}

function sanitizeText(value) {
  if (!value) return "";
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\r]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function sanitizeInline(value) {
  if (!value) return "";
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripByPrefix(value) {
  if (!value) return value;
  return value
    .replace(/^By\s+/i, "")
    .replace(/^Tác giả\s*:\s*/i, "")
    .trim();
}

function resolveUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return url.href;
  } catch (_) {
    return null;
  }
}

// Cho phép các script khác trong tab tái sử dụng hàm trích xuất
window.__trustme_collectData = extractStructuredData;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStructuredData") {
    try {
      const payload = extractStructuredData();
      sendResponse(payload);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});
