export function LegacyHero() {
  return (
    <section className="relative border-b border-border/18 py-[28px] sm:py-[32px]">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-30" />
      <div className="relative min-w-0">
        <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground/42">
          EDGE / DESIGN / CODE
        </p>
        {/* LOCAL MOD: default brand */}
        <h1 className="mt-[10px] max-w-[760px] font-heading text-[34px] font-semibold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[44px] lg:text-[52px]">
          浅草物语
        </h1>
        <p className="mt-[12px] max-w-[560px] text-[14px] leading-[1.7] text-muted-foreground/78 sm:text-[15px]">
          书写代码、设计系统与边缘计算的个人技术档案。
        </p>
      </div>
    </section>
  );
}

export type HeroTopic = {
  title: string;
  desc: string;
};

export type HeroAction = {
  label: string;
  href: string;
};

type HeroProps = {
  title?: string;
  kicker?: string;
  subtitle?: string;
  description?: string;
  actions?: HeroAction[];
  topics?: HeroTopic[];
};

const DEFAULT_ACTIONS: HeroAction[] = [
  { label: "最新文章", href: "#latest-posts" },
  { label: "主题索引", href: "#content-index" },
  { label: "工程笔记", href: "/archive" },
];

const DEFAULT_TOPICS: HeroTopic[] = [
  { title: "系统设计", desc: "从边界、接口和运维成本切入" },
  { title: "阅读体验", desc: "让长文、代码与目录保持同一节奏" },
  { title: "边缘部署", desc: "Workers / D1 / R2 的真实工程路径" },
];

/**
 * LOCAL MOD (home-first): compact brand strip.
 * Keeps identity without a product-landing wall that pushes posts below the fold.
 * Topics prop retained for API compatibility but no longer rendered on home.
 */
export function Hero({
  title = "浅草物语", // LOCAL MOD: default brand
  kicker,
  subtitle = "技术写作 · 系统设计 · 边缘实践",
  description,
  actions = DEFAULT_ACTIONS,
  topics: _topics = DEFAULT_TOPICS,
}: HeroProps) {
  void _topics;
  const visibleActions = actions
    .filter((item) => item.label.trim() && item.href.trim())
    .slice(0, 3);

  // Prefer a short line: subtitle first; only use description if short enough
  const tagline =
    (subtitle && subtitle.trim()) ||
    (description && description.trim().length <= 48 ? description.trim() : "") ||
    "技术写作 · 系统设计 · 边缘实践";

  const showKicker = Boolean(kicker?.trim()) && kicker!.trim().length <= 42;

  return (
    <section className="relative border-b border-border/16 py-[22px] sm:py-[28px] lg:py-[32px]">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-28" />
      <div className="relative flex flex-col gap-[16px] sm:flex-row sm:items-end sm:justify-between sm:gap-[24px]">
        <div className="min-w-0 border-l border-foreground/12 pl-[14px] sm:pl-[16px]">
          {showKicker && (
            <p className="mb-[8px] font-mono text-[10px] tracking-[0.12em] text-muted-foreground/40 uppercase">
              {kicker}
            </p>
          )}
          <h1 className="font-heading text-[32px] font-semibold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[40px] lg:text-[48px]">
            {title}
          </h1>
          <p className="mt-[10px] max-w-[520px] text-[13.5px] leading-[1.65] text-muted-foreground/75 sm:text-[14.5px]">
            {tagline}
          </p>
        </div>

        {visibleActions.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-[6px] sm:justify-end sm:pb-[2px]">
            {visibleActions.map((item) => (
              <a
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="inline-flex min-h-[36px] items-center rounded-md border border-border/16 bg-background/28 px-[11px] text-[12.5px] text-muted-foreground/70 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[1px] hover:border-border/34 hover:bg-card/20 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-[32px]"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
