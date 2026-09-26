import DOMPurify from "dompurify";

/** 注入片段：位置、作用域与同意策略均可独立控制 */
export type CustomSnippet = {
  id: string;
  name: string;
  position: "head" | "body-end";
  scope: "all" | "home" | "post" | "archive" | "path";
  pathPrefix?: string;
  enabled: boolean;
  requireConsent: boolean;
  code: string;
};

const CUSTOM_INJECTION_ATTR = "data-monolith-custom-injection";

const SANITIZE_CONFIG = {
  ADD_TAGS: ["script"],
  ADD_ATTR: ["src", "async", "defer"],
  FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

const VALID_POSITIONS = new Set(["head", "body-end"]);
const VALID_SCOPES = new Set(["all", "home", "post", "archive", "path"]);

function sanitizeCustomHtml(html: string) {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/** 将片段代码安全注入容器：仅允许带 src 的外部脚本，透传 async、defer、data- 属性与 crossorigin */
function injectHtml(container: HTMLElement, html: string) {
  const temp = document.createElement("div");
  temp.innerHTML = sanitizeCustomHtml(html);
  Array.from(temp.childNodes).forEach((node) => {
    if (node instanceof HTMLScriptElement) {
      if (!node.src) return; // 禁止内联脚本，只允许带 src 的外部脚本
      const script = document.createElement("script");
      script.src = node.src;
      if (node.async) script.async = true;
      if (node.defer) script.defer = true;
      if (node.crossOrigin) script.crossOrigin = node.crossOrigin;
      for (const attribute of node.getAttributeNames()) {
        if (attribute.startsWith("data-")) script.setAttribute(attribute, node.getAttribute(attribute) ?? "");
      }
      container.appendChild(script);
    } else {
      container.appendChild(node.cloneNode(true));
    }
  });
}

const EXTERNAL_RESOURCE_TAGS = new Set(["audio", "embed", "img", "link", "object", "script", "source", "track", "video"]);

function isExternalResourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return false;

  try {
    const url = new URL(trimmed, window.location.href);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function hasExternalResources(html: string) {
  const temp = document.createElement("div");
  temp.innerHTML = sanitizeCustomHtml(html);
  return Array.from(temp.querySelectorAll<HTMLElement>("*")).some((node) => {
    const tagName = node.tagName.toLowerCase();
    if (EXTERNAL_RESOURCE_TAGS.has(tagName)) {
      return ["src", "href", "poster", "data"].some((attribute) => {
        const value = node.getAttribute(attribute);
        return value ? isExternalResourceUrl(value) : false;
      });
    }

    const style = node.getAttribute("style");
    return Boolean(style && /url\(\s*["']?(?:https?:|\/\/)/i.test(style));
  });
}

/** 解析片段列表；键缺失或 JSON 非法时返回 null（调用方回退到旧版 custom_header/custom_footer） */
export function parseCustomSnippets(value: string): CustomSnippet[] | null {
  if (!value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : `snippet-${index}`,
        name: typeof item.name === "string" ? item.name : `片段 ${index + 1}`,
        position: item.position === "body-end" ? "body-end" : "head",
        scope: typeof item.scope === "string" && VALID_SCOPES.has(item.scope) ? item.scope as CustomSnippet["scope"] : "all",
        pathPrefix: typeof item.pathPrefix === "string" ? item.pathPrefix : undefined,
        enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        requireConsent: typeof item.requireConsent === "boolean" ? item.requireConsent : true,
        code: typeof item.code === "string" ? item.code : "",
      }));
  } catch {
    return null;
  }
}

export function serializeCustomSnippets(snippets: CustomSnippet[]): string {
  return JSON.stringify(snippets.map((snippet) => ({
    id: snippet.id,
    name: snippet.name.trim(),
    position: VALID_POSITIONS.has(snippet.position) ? snippet.position : "head",
    scope: VALID_SCOPES.has(snippet.scope) ? snippet.scope : "all",
    pathPrefix: snippet.scope === "path" ? (snippet.pathPrefix ?? "").trim() : undefined,
    enabled: snippet.enabled,
    requireConsent: snippet.requireConsent,
    code: snippet.code,
  })));
}

/** 旧版 custom_header / custom_footer 迁移为片段 */
export function legacyToSnippets(header: string, footer: string): CustomSnippet[] {
  const snippets: CustomSnippet[] = [];
  if (header.trim()) {
    snippets.push({ id: "legacy-header", name: "旧版 Head 注入", position: "head", scope: "all", enabled: true, requireConsent: hasExternalResources(header), code: header });
  }
  if (footer.trim()) {
    snippets.push({ id: "legacy-footer", name: "旧版 Body 注入", position: "body-end", scope: "all", enabled: true, requireConsent: hasExternalResources(footer), code: footer });
  }
  return snippets;
}

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** 片段是否作用于当前路径 */
export function snippetAppliesTo(snippet: CustomSnippet, pathname: string): boolean {
  switch (snippet.scope) {
    case "home":
      return pathname === "/";
    case "post":
      return pathname.startsWith("/posts/");
    case "archive":
      return matchesPathPrefix(pathname, "/archive");
    case "path":
      return snippet.pathPrefix ? matchesPathPrefix(pathname, snippet.pathPrefix.replace(/\/+$/, "") || "/") : false;
    default:
      return true;
  }
}

export function removeCustomInjection() {
  document.querySelectorAll(`[${CUSTOM_INJECTION_ATTR}="true"]`).forEach((node) => node.remove());
}

/** 注入单个片段；返回是否实际写入 */
function injectSnippet(snippet: CustomSnippet): boolean {
  if (!snippet.code.trim()) return false;
  const container = document.createElement("div");
  container.id = `monolith-snippet-${snippet.id}`;
  container.dataset.monolithCustomInjection = "true";
  injectHtml(container, snippet.code);
  if (snippet.position === "head") {
    Array.from(container.childNodes).forEach((node) => {
      if (node instanceof HTMLElement) node.dataset.monolithCustomInjection = "true";
      document.head.appendChild(node);
    });
  } else {
    document.body.appendChild(container);
  }
  return true;
}

/** 按同意状态拆分并注入片段列表；返回清理函数（移除尚未触发的一次性同意监听） */
export function injectSnippetList(snippets: CustomSnippet[], consentAccepted: boolean): () => void {
  const immediate = snippets.filter((snippet) => !(snippet.requireConsent && hasExternalResources(snippet.code)));
  const pending = snippets.filter((snippet) => snippet.requireConsent && hasExternalResources(snippet.code));

  immediate.forEach((snippet) => injectSnippet(snippet));

  if (pending.length === 0) return () => {};
  if (consentAccepted) {
    pending.forEach((snippet) => injectSnippet(snippet));
    return () => {};
  }
  const handler = () => pending.forEach((snippet) => injectSnippet(snippet));
  window.addEventListener("cookie-consent-accepted", handler, { once: true });
  return () => window.removeEventListener("cookie-consent-accepted", handler);
}

/* ── 常用预设模板 ─────────────────────────── */

export type SnippetPreset = {
  id: string;
  name: string;
  desc: string;
  position: CustomSnippet["position"];
  requireConsent: boolean;
  code: string;
};

// 注入引擎出于安全仅允许「带 src 的外部脚本 + meta/link 等标签」，
// 预设只收录该形态可完整工作的服务；标记 REPLACE_ 的占位符需替换为真实值。
export const SNIPPET_PRESETS: SnippetPreset[] = [
  {
    id: "cloudflare-web-analytics",
    name: "Cloudflare Web Analytics",
    desc: "无 Cookie 分析，data-cf-beacon 传入令牌",
    position: "head",
    requireConsent: true,
    code: '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "REPLACE_TOKEN"}\'></script>',
  },
  {
    id: "umami",
    name: "Umami 分析",
    desc: "自托管或云版，data-website-id 传站点 ID",
    position: "head",
    requireConsent: true,
    code: '<script defer src="https://REPLACE_HOST/script.js" data-website-id="REPLACE_WEBSITE_ID"></script>',
  },
  {
    id: "plausible",
    name: "Plausible 分析",
    desc: "data-domain 传绑定域名",
    position: "head",
    requireConsent: true,
    code: '<script defer data-domain="REPLACE_DOMAIN" src="https://plausible.io/js/script.js"></script>',
  },
  {
    id: "google-site-verification",
    name: "Google Search Console 验证",
    desc: "meta 内容传验证令牌，无需同意即可加载",
    position: "head",
    requireConsent: false,
    code: '<meta name="google-site-verification" content="REPLACE_TOKEN" />',
  },
  {
    id: "bing-site-verification",
    name: "Bing 站长验证",
    desc: "meta 内容传验证令牌，无需同意即可加载",
    position: "head",
    requireConsent: false,
    code: '<meta name="msvalidate.01" content="REPLACE_TOKEN" />',
  },
  {
    id: "blank",
    name: "空白片段",
    desc: "从零编写自定义 HTML",
    position: "head",
    requireConsent: true,
    code: "",
  },
];
