export type SiteThemeMode = "dark" | "light" | "system";
export type SiteThemeStyle = "default" | "fluid";

const THEME_COOKIE = "monolith_site_theme";

export function normalizeSiteThemeMode(value: unknown): SiteThemeMode {
  return value === "light" || value === "system" ? value : "dark";
}

export function normalizeSiteThemeStyle(value: unknown): SiteThemeStyle {
  return value === "fluid" ? "fluid" : "default";
}

/** 根据 mode 获取实际生效的明暗模式 */
function effectiveThemeMode(mode: SiteThemeMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

/** 将 明暗模式 × 视觉风格 应用到 DOM + theme-color，并同步缓存 cookie（供下次首屏内联脚本读取） */
export function applySiteTheme(mode: SiteThemeMode, style: SiteThemeStyle): void {
  const effective = effectiveThemeMode(mode);
  document.documentElement.setAttribute("data-theme", effective);
  document.documentElement.setAttribute("data-style", style);
  const themeColor =
    style === "fluid"
      ? effective === "light"
        ? "#f6f4fb"
        : "#0d0b1a"
      : effective === "light"
        ? "#ffffff"
        : "#0d1117";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColor);
  writeThemeCookie(mode, style);
}

/** 读取首屏缓存的主题（与 index.html 内联脚本解析逻辑保持一致） */
export function readThemeCookie(): { mode: SiteThemeMode; style: SiteThemeStyle } | null {
  const match = document.cookie.match(/(?:^|;\s*)monolith_site_theme=([^;]+)/);
  if (!match) return null;
  try {
    const [mode, style] = decodeURIComponent(match[1]).split("|");
    if (!mode || !style) return null;
    return { mode: normalizeSiteThemeMode(mode), style: normalizeSiteThemeStyle(style) };
  } catch {
    return null;
  }
}

function writeThemeCookie(mode: SiteThemeMode, style: SiteThemeStyle): void {
  try {
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(`${mode}|${style}`)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookie 写入失败不影响本次会话的主题生效
  }
}
