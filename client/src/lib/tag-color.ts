// 按标签名稳定映射到 .tag-hue-0 ~ .tag-hue-5（globals.css 中的 GitHub 风格彩色标签）
const TAG_HUE_COUNT = 6;

export function tagHueClass(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return `tag-hue-${hash % TAG_HUE_COUNT}`;
}
