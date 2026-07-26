import { getBackendUrl } from "./_shared";

// Cloudflare Pages Function — 边缘 HTML 增强中间件
//
// 职责概览：
// 1) [上游原有] 社交/搜索爬虫访问 /posts/:slug 时注入文章 OG meta
// 2) [浅草物语本地魔改] 任意 UA 访问 /page/link 时，把友链绝对 URL 注入首包 HTML
//    —— 解决 SPA 空壳导致友链自动检测脚本误判「未收录」
//
// 普通用户浏览器仍会加载 SPA；注入块仅保证「不执行 JS 的抓取」也能看到 <a href>。
// 后端失败时一律 context.next() 回退纯 SPA，避免 500。

const BOT_UA_REGEX =
  /bot|crawl|spider|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Discordbot|Embedly|Quora Link Preview|Showyoubot|outbrain|pinterest|vkShare|W3C_Validator|baiduspider|yandex|sogou|360Spider/i;

// ========== BEGIN LOCAL MOD: friend-link SSR for /page/link (浅草物语) ==========
// 合并 upstream 时：整块保留。upstream 若重写本文件，把本段 onRequest 分支与 helpers 再贴回去。
// 依赖：GET {API_BASE}/api/friends 返回原生审核通过的友链 JSON；旧 /page/link 只保留兼容入口。
// 策略：对所有 UA 注入（友链检测器常用普通浏览器 UA，不能只认 bot）。
const FRIEND_LINK_PAGE_SLUG = "link";
const FRIEND_LINK_PATH = `/page/${FRIEND_LINK_PAGE_SLUG}`;

/** 转义写入 HTML 属性/文本的字符串 */
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 构建供互链检测器读取的无障碍隐藏链接列表。 */
function buildFriendLinkPrerenderBlock(links: { href: string; label: string }[]): string {
  const items = links
    .map(
      (l) =>
        `    <li><a href="${escapeHtmlAttr(l.href)}" rel="noopener noreferrer">${escapeHtmlAttr(l.label)}</a></li>`
    )
    .join("\n");

  // id 稳定，便于调试；visually-hidden 风格：对人眼几乎不可见，curl/检测器仍可读 DOM
  // 不用 display:none：少数简陋脚本会跳过；用近零尺寸 + 裁剪更稳
  return [
    `<!-- LOCAL MOD: friend-link prerender for crawlers / mutual-link checkers; data from /api/friends -->`,
    `<nav id="friend-links-prerender" aria-label="Friend links" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">`,
    `  <ul>`,
    items,
    `  </ul>`,
    `</nav>`,
  ].join("\n");
}

async function tryInjectFriendLinks(
  context: EventContext<Env, any, Record<string, unknown>>,
  request: Request
): Promise<Response | null> {
  const backend = getBackendUrl(context.env);
  if (!backend) return null;
  try {
    const dataResponse = await fetch(`${backend}/api/friends`, {
      headers: { Accept: "application/json", "User-Agent": "MonolithFriendLinkPrerender/1.0" },
    });
    if (!dataResponse.ok) return null;
    const entries = await dataResponse.json() as Array<{ name?: string; url?: string }>;
    const links = entries
      .filter((entry) => typeof entry.url === "string" && /^https?:\/\//i.test(entry.url))
      .map((entry) => ({ href: entry.url!, label: entry.name?.trim() || entry.url! }));
    if (!links.length) return null;

    const pageResponse = await context.next();
    const contentType = pageResponse.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return pageResponse;
    const html = await pageResponse.text();
    const injected = buildFriendLinkPrerenderBlock(links);
    const bodyEnd = html.lastIndexOf("</body>");
    const enhanced = bodyEnd >= 0
      ? `${html.slice(0, bodyEnd)}${injected}${html.slice(bodyEnd)}`
      : `${html}${injected}`;

    return new Response(enhanced, {
      status: pageResponse.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
        "X-Robots-Tag": "index, follow",
        "X-Friend-Link-Prerender": String(links.length),
      },
    });
  } catch {
    return null;
  }
}

// ========== END LOCAL MOD: friend-link SSR for /page/link ==========

interface Env {
  API_BASE: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ========== BEGIN LOCAL MOD: route /page/link (all UA) ==========
  // 必须放在文章 bot 逻辑之前；失败则 null → 继续后面或 SPA
  if (pathname === FRIEND_LINK_PATH || pathname === `${FRIEND_LINK_PATH}/`) {
    const injected = await tryInjectFriendLinks(context, request);
    if (injected) return injected;
    return context.next();
  }
  // ========== END LOCAL MOD: route /page/link ==========

  // 仅处理文章页路径 /posts/:slug （上游逻辑）
  const postMatch = pathname.match(/^\/posts\/([^/]+)$/);
  if (!postMatch) {
    return context.next();
  }

  // 检测 User-Agent 是否为爬虫
  const ua = request.headers.get("user-agent") || "";
  if (!BOT_UA_REGEX.test(ua)) {
    // 普通用户 → 直接返回 SPA
    return context.next();
  }

  // 爬虫请求 → 从后端获取文章数据
  const slug = postMatch[1];
  const backend = getBackendUrl(context.env);
  if (!backend) {
    return context.next();
  }

  try {
    const apiRes = await fetch(`${backend}/api/posts/${slug}`, {
      headers: { "User-Agent": "Monolith-Prerender/1.0" },
    });

    if (!apiRes.ok) {
      // 文章不存在，返回正常 SPA 处理 404
      return context.next();
    }

    const post = (await apiRes.json()) as {
      title: string;
      excerpt: string;
      content: string;
      slug: string;
      tags: string[];
      createdAt: string;
      updatedAt: string;
    };

    // 获取原始 index.html（用根路径请求静态资源）
    const indexUrl = new URL("/", request.url);
    const assetRes = await context.env.ASSETS.fetch(new Request(indexUrl.toString()));
    let html = await assetRes.text();

    // 循环清理 HTML 标签（防止嵌套标签如 <scr<script>ipt> 绕过）
    const stripHtml = (s: string) => {
      let result = s;
      let prev = "";
      while (prev !== result) {
        prev = result;
        result = result.replace(/<[^>]*>?/g, "");
      }
      return result.replace(/\s+/g, " ").trim();
    };
    const description = post.excerpt || (post.content ? stripHtml(post.content).slice(0, 160) : "");
    const siteOrigin = url.origin;
    const articleUrl = `${siteOrigin}/posts/${post.slug}`;
    const ogImage = `${siteOrigin}/og-default.png`;

    // 转义 HTML 特殊字符
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 替换 <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(post.title)} | Monolith</title>`);

    // 替换 OG 标签
    html = html.replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${esc(post.title)}$2`
    );
    html = html.replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${esc(description)}$2`
    );
    html = html.replace(
      /(<meta\s+property="og:type"\s+content=")[^"]*(")/,
      `$1article$2`
    );
    html = html.replace(
      /(<meta\s+property="og:image"\s+content=")[^"]*(")/i,
      `$1${ogImage}$2`
    );

    // 替换 Twitter Card 标签
    html = html.replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      `$1${esc(post.title)}$2`
    );
    html = html.replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
      `$1${esc(description)}$2`
    );

    // 替换 meta description
    html = html.replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${esc(description)}$2`
    );

    // 注入 canonical URL 和 article 元数据（在 </head> 前插入）
    const extraMeta = [
      `<link rel="canonical" href="${esc(articleUrl)}" />`,
      `<meta property="og:url" content="${esc(articleUrl)}" />`,
      `<meta property="article:published_time" content="${esc(post.createdAt)}" />`,
      post.updatedAt ? `<meta property="article:modified_time" content="${esc(post.updatedAt)}" />` : "",
      ...(post.tags || []).map((tag) => `<meta property="article:tag" content="${esc(tag)}" />`),
    ]
      .filter(Boolean)
      .join("\n    ");

    html = html.replace("</head>", `    ${extraMeta}\n  </head>`);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Robots-Tag": "index, follow",
      },
    });
  } catch {
    // 后端请求失败，回退到 SPA
    return context.next();
  }
};
