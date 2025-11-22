// content.js - Thu thập dữ liệu bài viết/bài đăng theo cấu trúc JSON

const FACEBOOK_PERMALINK_SELECTORS = Object.freeze([
  'a[href*="permalink"]',
  'a[href*="/posts/"]',
  'a[href*="/videos/"]',
  'a[href*="/story.php"]',
  'a[href*="/photo"]',
]);

const FACEBOOK_POST_TEXT_SELECTORS = Object.freeze([
  "#_r_qi_",
  '[data-ad-comet-preview="message"]',
  '[data-ad-preview="message"]',
  '[data-lexical-text="true"]',
  "#_r_qi_ div[dir='auto']",
  '[data-ad-comet-preview="message"] div[dir="auto"]',
  '[data-ad-preview="message"] div[dir="auto"]',
  '[data-lexical-text="true"] div[dir="auto"]',
  '[data-lexical-text="true"] span[dir="auto"]',
  '[data-testid="post_message"]',
  '[data-ad-preview="message"]',
  '[data-ad-comet-preview="message"]',
  "div[role='paragraph']",
  "span[role='paragraph']",
  '[data-testid="story-subtitle"] div[dir="auto"]',
  '[data-testid="story-subtitle"] span[dir="auto"]',
  '[data-ad-preview="message"] span[dir="auto"]',
  '[data-ad-comet-preview="message"] span[dir="auto"]',
  "div[role='article'] [data-ad-preview='message']",
  "div[role='article'] [data-ad-comet-preview='message']",
]);

const FACEBOOK_AUTHOR_SELECTORS = Object.freeze([
  "h3#_r_qg_ a b span",
  '[data-ad-rendering-role="profile_name"] a b span',
  '[data-ad-rendering-role="profile_name"] a span',
  '[data-ad-rendering-role="profile_name"] span',
  "header h1 a span",
  "header h2 a span",
  "header h3 a span",
  "h3 a span",
  "h2 a span",
  "strong a span",
  'header [role="presentation"] span a span',
]);

const FACEBOOK_TIME_SELECTORS = Object.freeze([
  "abbr[data-utime]",
  '[data-testid="story-timestamp"]',
  'a[role="link"][tabindex="0"] abbr',
  'a[role="link"][tabindex="0"] time',
  'a[role="link"][tabindex="0"] span',
  'a[href*="permalink"] abbr',
  'a[href*="/posts/"] abbr',
  'a[href*="story.php"] abbr',
  'div[id^="_r_"] a[role="link"] span',
  'div[id^="_r_"] span',
  "time[datetime]",
  "time",
  '[data-testid="story-subtitle"] abbr',
  '[data-testid="story-subtitle"] span',
]);

const FACEBOOK_ALLOWED_IMAGE_HOSTS = Object.freeze([
  "scontent",
  "fbcdn",
  "lookaside.fbsbx.com",
  "safe_image",
  "akamaihd",
]);

const META_TITLE_SELECTORS = Object.freeze([
  'meta[property="og:title"]',
  'meta[name="og:title"]',
  'meta[name="twitter:title"]',
  'meta[name="title"]',
  'meta[itemprop="headline"]',
]);

const ARTICLE_PRIMARY_SELECTORS = Object.freeze([
  "article",
  "main article",
  "main",
  '[role="main"]',
  '[itemprop="articleBody"]',
  '[class*="article-body"]',
  '[class*="ArticleBody"]',
  '[class*="article__body"]',
  '[class*="detail-content"]',
  '[class*="content-detail"]',
  '[class*="content-body"]',
  '[class*="cms-body"]',
  '[class*="main-content"]',
  '[class*="post-content"]',
  '[class*="article"]',
  '[class*="Article"]',
  '[class*="content"]',
  '[id*="article"]',
  '[id*="content"]',
]);

const META_IMAGE_SELECTORS = Object.freeze([
  'meta[property="og:image"]',
  'meta[name="og:image"]',
  'meta[name="twitter:image"]',
  'meta[itemprop="image"]',
]);

const META_PUBLISHED_TIME_SELECTORS = Object.freeze([
  'meta[property="article:published_time"]',
  'meta[name="article:published_time"]',
  'meta[name="pubdate"]',
  'meta[name="publish-date"]',
  'meta[name="date"]',
  'meta[name="dcterms.created"]',
  'meta[itemprop="datePublished"]',
  'meta[property="og:updated_time"]',
]);

function getFacebookScopeRoot(node) {
  if (!node) return null;

  return (
    node.closest('[role="dialog"]') ||
    node.closest('[data-pagelet^="FeedUnit_"]') ||
    node.parentElement ||
    node
  );
}

function extractStructuredData() {
  const url = window.location.href;
  const platform = detectPlatform();

  if (platform === "facebook") {
    const fb = extractFacebookPost();
    return {
      success: fb.success,
      data: fb.data,
    };
  }

  return collectGenericArticleData({ url, platform });
}

function collectGenericArticleData({ url, platform }) {
  const title = extractTitle();
  const createdAt = extractPublishedTime();
  const author = extractAuthor();
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

function extractFacebookPost() {
  const url = normalizeFacebookUrl(window.location.href);
  const context = createFacebookDomContext();

  if (!context) {
    return {
      success: false,
      data: {
        url,
        article: null,
        author: null,
        created_at: null,
        image_urls: null,
      },
      error: "Không tìm thấy container Facebook",
    };
  }

  const permalink = findFacebookPermalink(context) || url;
  const author = extractFacebookAuthor(context);
  const text = extractFacebookPostText(context, author);
  const createdAt = extractFacebookTime(context);
  const images = extractFacebookImages(context);

  return {
    success: true,
    data: {
      url: permalink,
      article: text || null,
      created_at: createdAt || null,
      author: author || null,
      platform: "facebook",
      image_urls: images.length ? images : null,
    },
  };
}

function createFacebookDomContext() {
  const container =
    document.querySelector('[role="dialog"] [role="article"]') ||
    document.querySelector('[role="dialog"]') ||
    document.querySelector('[role="article"]');

  if (!container) {
    return null;
  }

  return {
    container,
    scopeRoot: getFacebookScopeRoot(container),
  };
}

function findFacebookPermalink({ container }) {
  for (const sel of FACEBOOK_PERMALINK_SELECTORS) {
    const a = container.querySelector(sel);
    if (a && a.href) return normalizeFacebookUrl(a.href);
  }
  return null;
}

function normalizeFacebookUrl(url) {
  try {
    const u = new URL(url);
    ["fbclid", "refid", "mibextid", "_rdr"].forEach((k) =>
      u.searchParams.delete(k)
    );
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

function extractFacebookPostText(context, authorName) {
  const texts = [];
  const seen = new Set();
  const scopeRoot = context.scopeRoot || context.container;

  const pushText = (node) => {
    if (!node) return;
    if (isFacebookCommentNode(node)) return;
    if (node.closest("header, footer, form, [aria-label='Xem thêm']")) {
      return;
    }
    const value = node.innerText || node.textContent || "";
    const sanitized = sanitizeText(value);
    if (!sanitized) return;
    if (/^(xem thêm|see more|xem bản dịch|see translation)$/i.test(sanitized)) {
      return;
    }
    if (authorName && sanitized.replace(/\s+/g, " ").trim() === authorName) {
      return;
    }
    if (!shouldIncludeFacebookText(sanitized, seen)) {
      return;
    }
    seen.add(sanitized);
    texts.push(sanitized);
  };

  FACEBOOK_POST_TEXT_SELECTORS.forEach((selector) => {
    let nodes = scopeRoot.querySelectorAll(selector);
    if (!nodes.length && selector.includes("#_r_")) {
      nodes = document.querySelectorAll(selector);
    }
    nodes.forEach((el) => {
      pushText(el);
    });
  });

  if (!texts.length) {
    scopeRoot
      .querySelectorAll("div[dir='auto'], span[dir='auto']")
      .forEach((el) => {
        pushText(el);
      });
  }

  if (!texts.length) {
    scopeRoot.querySelectorAll("p").forEach((p) => {
      pushText(p);
    });
  }

  if (!texts.length) {
    scopeRoot
      .querySelectorAll(
        '[data-visualcompletion="ignore-dynamic"] span[dir="auto"]'
      )
      .forEach((el) => {
        pushText(el);
      });
  }

  if (!texts.length) {
    scopeRoot.querySelectorAll("blockquote").forEach((el) => {
      pushText(el);
    });
  }

  if (!texts.length) {
    const lexicalNodes = Array.from(
      scopeRoot.querySelectorAll(
        '[data-lexical-text="true"] div, [data-lexical-text="true"] span'
      )
    )
      .map((node) => sanitizeText(node.innerText))
      .filter((text) => text && text.length > 40);

    if (lexicalNodes.length) {
      return lexicalNodes.join("\n\n");
    }
  }

  if (!texts.length) {
    const candidates = [];
    scopeRoot
      .querySelectorAll("p, div[dir='auto'], span[dir='auto']")
      .forEach((node) => {
        const text = sanitizeText(node.innerText);
        if (text && text.length > 80) {
          candidates.push(text);
        }
      });

    if (candidates.length) {
      candidates.sort((a, b) => b.length - a.length);
      return candidates[0];
    }
  }

  if (!texts.length) {
    return null;
  }

  if (texts.length > 1) {
    const longest = Math.max(...texts.map((item) => item.length));
    if (longest > 160) {
      const filtered = texts.filter((item) => {
        if (item.length > 60) return true;
        const wordCount = item.split(/\s+/).filter(Boolean).length;
        return wordCount > 8;
      });
      if (filtered.length) {
        return filtered.join("\n\n");
      }
    }
  }

  const mainContentContainer =
    scopeRoot.querySelector("#_r_qi_") || document.querySelector("#_r_qi_");
  if (mainContentContainer) {
    // Trích xuất tất cả các đoạn text bên trong và làm sạch
    const paragraphs = Array.from(
      mainContentContainer.querySelectorAll('div[dir="auto"]')
    )
      .map((el) => sanitizeText(el.innerText))
      .filter((text) => text && text.length > 20); // Chỉ giữ lại đoạn văn dài hơn 20 ký tự

    if (paragraphs.length) {
      return paragraphs.join("\n\n");
    }
  }
  return texts.join("\n\n");
}

function extractFacebookAuthor(context) {
  const container = context?.container;
  if (!container) return null;

  const seen = new Set();
  const scopeRoot = context.scopeRoot || container;

  const tryPick = (node) => {
    if (!node) return null;
    if (isFacebookCommentNode(node)) return null;
    if (node.closest("footer, form")) return null;
    const text = sanitizeInline(node.innerText || node.textContent || "");
    if (!text) return null;
    if (text.length > 120) return null;
    if (/^(thích|chia sẻ|bình luận|comment|xem thêm|see more)$/i.test(text)) {
      return null;
    }
    if (/\d/.test(text) && /(phút|giờ|ngày|tháng|năm)/i.test(text)) {
      return null;
    }
    if (seen.has(text)) return null;
    seen.add(text);
    return text;
  };

  for (const selector of FACEBOOK_AUTHOR_SELECTORS) {
    let node = scopeRoot.querySelector(selector);
    if (!node && selector.includes("#_r_")) {
      node = document.querySelector(selector);
    }
    const picked = tryPick(node);
    if (picked) {
      return picked;
    }
  }

  const fallbackNodes = Array.from(
    scopeRoot.querySelectorAll(
      'a[role="link"] span, strong a span, span[dir="auto"]'
    )
  );

  for (const node of fallbackNodes) {
    const picked = tryPick(node);
    if (picked) {
      return picked;
    }
  }

  const dialogHeader = scopeRoot.querySelector("header");
  if (dialogHeader) {
    const dialogCandidates = dialogHeader.querySelectorAll(
      'a[role="link"] span, strong span, h2 span, h3 span'
    );
    for (const node of dialogCandidates) {
      const picked = tryPick(node);
      if (picked) {
        return picked;
      }
    }
  }

  return null;
}

function extractFacebookImages(context) {
  const root = context.scopeRoot || context.container;
  const urls = new Set();
  const fallbackUrls = new Set();
  const add = (value, node = null) => {
    if (!value) return;
    if (node && isFacebookCommentNode(node)) return;
    if (value.includes("emoji.php")) return;
    if (value.startsWith("data:")) return;
    if (/\/rsrc\.php/i.test(value)) return;
    const resolved = resolveUrl(value) || value;
    if (!resolved) return;
    const lower = resolved.toLowerCase();
    const hasAllowedHost = FACEBOOK_ALLOWED_IMAGE_HOSTS.some((marker) =>
      lower.includes(marker)
    );
    if (hasAllowedHost) {
      urls.add(resolved);
    } else {
      fallbackUrls.add(resolved);
    }
  };

  root.querySelectorAll("img").forEach((img) => {
    if (isFacebookCommentNode(img)) return;
    add(img.getAttribute("src"), img);
    add(img.getAttribute("data-src"), img);
    add(img.currentSrc, img);
    const best = pickBestFromSrcset(img.getAttribute("srcset"));
    add(best, img);
  });

  root
    .querySelectorAll(
      '[style*="background-image"], [data-visualcompletion="media-vc-image"]'
    )
    .forEach((node) => {
      if (isFacebookCommentNode(node)) return;
      const style = node.getAttribute("style") || "";
      const match = style.match(/url\((['"]?)([^"')]+)\1\)/i);
      if (match && match[2]) {
        add(match[2], node);
      }
    });

  root.querySelectorAll("video source").forEach((source) => {
    if (isFacebookCommentNode(source)) return;
    add(source.getAttribute("src"), source);
    const best = pickBestFromSrcset(source.getAttribute("srcset"));
    add(best, source);
  });

  root.querySelectorAll("video").forEach((video) => {
    if (isFacebookCommentNode(video)) return;
    add(video.getAttribute("poster"), video);
    add(video.currentSrc, video);
  });

  if (urls.size) {
    return Array.from(urls);
  }

  return fallbackUrls.size ? Array.from(fallbackUrls) : [];
}

function extractFacebookTime(context) {
  const container = context?.container;
  if (!container) return null;

  const scopeRoot = context.scopeRoot || container;

  const tryExtract = (node) => interpretFacebookTimeNode(node);

  for (const selector of FACEBOOK_TIME_SELECTORS) {
    let nodes = scopeRoot.querySelectorAll(selector);
    if (!nodes.length && selector.includes("#_r_")) {
      nodes = document.querySelectorAll(selector);
    }
    for (const node of nodes) {
      const timestamp = tryExtract(node);
      if (timestamp) {
        return timestamp;
      }
    }
  }

  const fallbackNode = scopeRoot.querySelector("[data-utime]");
  if (fallbackNode) {
    const timestamp = tryExtract(fallbackNode);
    if (timestamp) {
      return timestamp;
    }
  }

  const timeNode = scopeRoot.querySelector("time, abbr, span");
  return tryExtract(timeNode);
}

function interpretFacebookTimeNode(node) {
  if (!node) return null;
  if (isFacebookCommentNode(node)) return null;

  const candidates = collectFacebookTimeCandidates(node);
  for (const raw of candidates) {
    const parsed = parseFacebookTimestamp(raw);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function collectFacebookTimeCandidates(node) {
  const candidates = new Set([
    node.getAttribute("data-utime"),
    node.getAttribute("data-tooltip-content"),
    node.getAttribute("data-date-time"),
    node.getAttribute("aria-label"),
    node.getAttribute("datetime"),
    node.getAttribute("title"),
    node.innerText,
    node.textContent,
  ]);

  addAriaLinkedText(node, "aria-labelledby", candidates);
  addAriaLinkedText(node, "aria-describedby", candidates);

  const anchor = node.closest('a[role="link"]');
  if (anchor) {
    candidates.add(anchor.getAttribute("aria-label"));
    candidates.add(anchor.getAttribute("data-tooltip-content"));
    candidates.add(anchor.textContent);
    candidates.add(anchor.innerText);
  }

  return candidates;
}

function addAriaLinkedText(node, attribute, sink) {
  const value = node.getAttribute(attribute);
  if (!value) return;

  value
    .split(/\s+/)
    .map((id) => id && document.getElementById(id))
    .filter(Boolean)
    .forEach((linkedNode) => {
      sink.add(linkedNode.innerText || linkedNode.textContent);
    });
}

function parseFacebookTimestamp(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!Number.isNaN(value)) {
      const ms = trimmed.length >= 13 ? value : value * 1000;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  const localized = parseVietnameseFacebookDate(trimmed);
  if (localized) {
    return localized;
  }

  const relative = parseRelativeVietnameseFacebookDate(trimmed);
  if (relative) {
    return relative;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function parseVietnameseFacebookDate(text) {
  if (!text) return null;

  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/[·•]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const dateRegex =
    /(?:ngày\s*)?(\d{1,2})\s*(?:th(?:á|a)ng|thg)\s*(\d{1,2})(?:\s*(?:năm)?\s*(\d{4}))?/i;
  const dateMatch = normalized.match(dateRegex);
  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  let year = dateMatch[3] ? Number(dateMatch[3]) : new Date().getFullYear();

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const timeRegexes = [
    /lúc\s*(\d{1,2})(?:[:h](\d{2}))?/,
    /(\d{1,2})\s*giờ(?:\s*(\d{1,2})\s*phút)?/,
  ];

  let hours = 0;
  let minutes = 0;
  for (const timeRegex of timeRegexes) {
    const timeMatch = normalized.match(timeRegex);
    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2] ?? "0");
      break;
    }
  }

  if (hours > 23 || minutes > 59) {
    hours = 0;
    minutes = 0;
  }

  const now = new Date();
  if (!dateMatch[3]) {
    const tentative = new Date(year, month - 1, day, hours, minutes);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (tentative.getTime() - now.getTime() > sevenDays) {
      year -= 1;
    }
  }

  const result = new Date(year, month - 1, day, hours, minutes);
  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result.toISOString();
}

function parseRelativeVietnameseFacebookDate(text) {
  if (!text) return null;

  const normalized = text
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[·•]/g, " ")
    .replace(/[,|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return null;
  }

  if (/vừa\s*xong|mới\s*đây|just\s+now/.test(normalized)) {
    return new Date().toISOString();
  }

  const lucMatch = normalized.match(/\blúc\b/);
  let relativeSection = normalized;
  let timeSection = "";
  if (lucMatch) {
    relativeSection = normalized.slice(0, lucMatch.index).trim();
    timeSection = normalized.slice(lucMatch.index + lucMatch[0].length).trim();
  }

  const { matched, minutes } = computeRelativeMinutes(relativeSection);
  if (!matched) {
    return null;
  }

  const resultDate = new Date(Date.now() - minutes * 60 * 1000);
  if (timeSection) {
    applyExplicitTimeSection(resultDate, timeSection);
  }

  return resultDate.toISOString();
}

function computeRelativeMinutes(section) {
  if (!section) {
    return { matched: false, minutes: 0 };
  }

  let matched = false;
  let totalMinutes = 0;

  const addMinutes = (value) => {
    if (!value) return;
    matched = true;
    totalMinutes += value;
  };

  if (/hôm\s*kia/.test(section)) {
    addMinutes(2 * 24 * 60);
  }
  if (/hôm\s*qua/.test(section)) {
    addMinutes(24 * 60);
  }
  if (/hôm\s*nay/.test(section)) {
    matched = true;
  }

  for (const match of section.matchAll(
    /(\d+)\s*(?:tuần)(?:\s*(?:trước)?)?/gi
  )) {
    addMinutes(Number(match[1]) * 7 * 24 * 60);
  }

  for (const match of section.matchAll(
    /(\d+)\s*(?:tháng)(?:\s*(?:trước)?)?/gi
  )) {
    addMinutes(Number(match[1]) * 30 * 24 * 60);
  }

  for (const match of section.matchAll(
    /(\d+)\s*(?:ngày)(?:\s*(?:trước)?)?/gi
  )) {
    addMinutes(Number(match[1]) * 24 * 60);
  }

  for (const match of section.matchAll(
    /(\d+)\s*(?:giờ|h|tiếng)(?:\s*(?:trước)?)?/gi
  )) {
    addMinutes(Number(match[1]) * 60);
  }

  for (const match of section.matchAll(
    /(\d+)\s*(?:phút|p)(?:\s*(?:trước)?)?/gi
  )) {
    addMinutes(Number(match[1]));
  }

  for (const match of section.matchAll(
    /(\d+)\s*(?:giây)(?:\s*(?:trước)?)?/gi
  )) {
    addMinutes(Number(match[1]) / 60);
  }

  return { matched, minutes: totalMinutes };
}

function applyExplicitTimeSection(date, section) {
  if (!date || !section) return;

  const cleaned = section.replace(/^khoảng\s*/, "").trim();
  if (!cleaned) return;

  const match = cleaned.match(/(\d{1,2})(?:[:h](\d{2}))?/);
  if (!match) return;

  let hours = Number(match[1]);
  let minutes = Number(match[2] ?? "0");
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return;
  }

  if (/(chiều|tối|pm)/.test(cleaned) && hours < 12) {
    hours += 12;
  } else if (/(sáng|am)/.test(cleaned) && hours === 12) {
    hours = 0;
  }

  date.setHours(hours, minutes, 0, 0);
}

function extractTitle() {
  for (const selector of META_TITLE_SELECTORS) {
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
  let bestText = null;

  const considerText = (el) => {
    if (!el) return;
    if (el.closest("header, nav, footer")) {
      return;
    }
    const text = sanitizeText(el.innerText);
    if (!text) {
      return;
    }
    if (text.length < 160) {
      return;
    }
    if (!bestText || text.length > bestText.length) {
      bestText = text;
    }
  };

  for (const selector of ARTICLE_PRIMARY_SELECTORS) {
    const nodes = document.querySelectorAll(selector);
    if (!nodes || nodes.length === 0) {
      continue;
    }

    nodes.forEach(considerText);

    if (bestText && bestText.length > 800) {
      break;
    }
  }

  if (bestText) {
    return bestText;
  }

  const paragraphScopes = document.querySelectorAll(
    "article, main, [role='main']"
  );
  for (const scope of paragraphScopes) {
    const paragraphs = Array.from(scope.querySelectorAll("p"))
      .map((p) => sanitizeText(p.innerText))
      .filter((text) => text && text.length > 60);
    if (paragraphs.length >= 3) {
      return paragraphs.join("\n\n");
    }
  }

  const longParagraphs = Array.from(document.querySelectorAll("p"))
    .map((p) => sanitizeText(p.innerText))
    .filter((text) => text && text.length > 60);

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

  if (
    hostname.includes("facebook.com") ||
    hostname.includes("web.facebook.com") ||
    hostname.includes("m.facebook.com") ||
    hostname.includes("mbasic.facebook.com") ||
    hostname.includes("business.facebook.com")
  ) {
    return "facebook";
  }

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

  for (const selector of META_IMAGE_SELECTORS) {
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

  if (
    hostname.includes("facebook.com") ||
    hostname.includes("web.facebook.com") ||
    hostname.includes("m.facebook.com") ||
    hostname.includes("mbasic.facebook.com") ||
    hostname.includes("business.facebook.com")
  ) {
    return [];
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

function isFacebookCommentNode(node) {
  if (!node || typeof node.closest !== "function") {
    return false;
  }

  const commentSelectors = [
    '[data-testid^="UFI2Comment"]',
    '[data-ad-rendering-role="comment"]',
    '[data-ad-preview="comment"]',
    '[aria-label*="bình luận" i]',
    '[aria-label*="comment" i]',
    '[aria-label*="phản hồi" i]',
    '[aria-label*="reply" i]',
  ];

  for (const selector of commentSelectors) {
    if (node.closest(selector)) {
      return true;
    }
  }

  const listParent = node.closest("ul[role='list']");
  if (listParent) {
    const labelled = listParent.closest("[aria-label]");
    if (labelled) {
      const label = labelled.getAttribute("aria-label") || "";
      if (/bình luận|comment|phản hồi|reply/i.test(label)) {
        return true;
      }
    }
  }

  return false;
}

function shouldIncludeFacebookText(text, seen) {
  if (!text) return false;
  const normalized = text.trim();
  if (!normalized) return false;
  if (seen.has(normalized)) return false;

  const lower = normalized.toLowerCase();
  if (/^(thích|chia sẻ|viết bình luận|xem thêm|see more)/i.test(normalized)) {
    return false;
  }
  if (lower.includes("facebook") && lower.includes("copyright")) {
    return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 3 && normalized.length < 15) {
    return false;
  }

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
    if (idx === -1) {
      continue;
    }

    const beforeMarker = cleaned.slice(0, idx).replace(/\s+/g, " ").trim();

    if (beforeMarker.length < 80) {
      continue; // bỏ qua marker nằm ở đầu trang hoặc chưa có nội dung chính
    }

    if (cutIndex === -1 || idx < cutIndex) {
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
  for (const selector of META_PUBLISHED_TIME_SELECTORS) {
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
    } catch (_) {}
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
    } catch (_) {}
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
