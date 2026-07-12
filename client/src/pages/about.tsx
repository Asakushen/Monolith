import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Separator } from "@/components/ui/separator";
import { SeoHead } from "@/components/seo-head";
import { AnimateIn } from "@/hooks/use-animate";
import {
  Terminal,
  MapPin,
  Cpu,
  Dna,
  Coffee,
  Gamepad2,
  Monitor,
  Music,
  Tv,
  Rocket,
  Cloud,
  Smartphone,
  CheckCircle2,
  CircleDot,
  Lock,
} from "lucide-react";

/**
 * 浅草物语 · About 页（本地魔改）
 *
 * ========== BEGIN LOCAL MOD: about-page cinematic polish (2026-07-12) ==========
 * 合并 upstream 时：本文件整体为本地品牌页，优先保留本版；若上游改 about 路由/依赖，
 * 只合并 import 路径，交互层（流体光、滚动进度、鼠标追光）整块保留。
 *
 * 动效三件套（无 framer-motion 依赖）：
 * 1) Hero 背景 CSS 流体光斑（conic + blur，慢速旋转）
 * 2) 进化路线条：IntersectionObserver 驱动「经验值」进度与节点点亮
 * 3) Bento 装备卡：鼠标位置驱动 radial glow（非线性 ease 跟手）
 * prefers-reduced-motion：关闭持续旋转与鼠标追光，仅保留静态布局。
 * ========== END LOCAL MOD notes ==========
 */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

/** 鼠标追光卡片 — 光斑跟随指针，轻微 tilt */
function GlowCard({
  children,
  className = "",
  glow = "rgba(120, 160, 255, 0.22)",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const raf = useRef<number | null>(null);
  const target = useRef({ x: 50, y: 50 });
  const current = useRef({ x: 50, y: 50 });

  const tick = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 非线性阻尼跟随（类似 spring 的一阶近似）
    current.current.x += (target.current.x - current.current.x) * 0.14;
    current.current.y += (target.current.y - current.current.y) * 0.14;
    el.style.setProperty("--glow-x", `${current.current.x}%`);
    el.style.setProperty("--glow-y", `${current.current.y}%`);
    const dx = (current.current.x - 50) / 50;
    const dy = (current.current.y - 50) / 50;
    el.style.setProperty("--tilt-x", `${(-dy * 4).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(dx * 4).toFixed(2)}deg`);
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (reduced) return;
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [reduced, tick]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    target.current = {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  const onLeave = () => {
    target.current = { x: 50, y: 50 };
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`about-glow-card relative overflow-hidden ${className}`}
      style={
        {
          "--glow-color": glow,
          transform: reduced
            ? undefined
            : "perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
          transition: reduced ? undefined : "transform 0.15s ease-out",
        } as CSSProperties
      }
    >
      {!reduced && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--glow-x, 50%) var(--glow-y, 50%), var(--glow-color), transparent 55%)",
            opacity: 1,
          }}
        />
      )}
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}

/** 进化路线：滚动驱动进度条 */
function EvolutionPath() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 元素进入视口中段时进度 0→1
      const start = vh * 0.85;
      const end = vh * 0.25;
      const raw = (start - rect.top) / (start - end + rect.height * 0.35);
      const p = Math.min(1, Math.max(0, raw));
      // 轻微 ease-out 非线性
      const eased = 1 - Math.pow(1 - p, 2.2);
      setProgress(reduced ? 1 : eased);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reduced]);

  type Step = {
    title: string;
    badge: string;
    badgeClass: string;
    ring: string;
    icon: React.ReactNode;
    body: React.ReactNode;
    cardClass: string;
    unlockAt: number;
    titleClass?: string;
    active?: boolean;
    locked?: boolean;
  };

  const steps: Step[] = [
    {
      title: "Level 1：独立探索者 (Explorer)",
      badge: "Completed",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      ring: "border-blue-500",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
      body: (
        <>
          <strong>技能点：</strong>语言基础打牢 / 软硬件魔改 / 独立单兵作战环境搭建。
        </>
      ),
      cardClass: "bg-secondary/15 border-border/30 hover:bg-secondary/25 hover:border-blue-500/30",
      unlockAt: 0.12,
    },
    {
      title: "Level 2：深度潜行者 (Deep Diver)",
      badge: "Active Loading...",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold",
      ring: "border-emerald-500",
      icon: <CircleDot className="w-3.5 h-3.5 text-emerald-500" />,
      body: (
        <>
          <strong>正在攻克：</strong>计算机理论底层重构 / 高可用网络编排 / 硬核内功闭关修炼。
        </>
      ),
      cardClass:
        "bg-secondary/30 border-border/60 hover:border-emerald-500/40 shadow-sm shadow-emerald-500/5",
      titleClass: "text-emerald-400",
      unlockAt: 0.45,
      active: true,
    },
    {
      title: "Level 3：造物主模式 (Architect)",
      badge: "Locked",
      badgeClass: "bg-muted text-muted-foreground",
      ring: "border-muted",
      icon: <Lock className="w-3.5 h-3.5 text-muted-foreground" />,
      body: (
        <>
          <strong>终极远景：</strong>自由定义边缘原生全栈生态，让科技与生活达成完美无缝融合。
        </>
      ),
      cardClass: "bg-secondary/5 border-dashed border-border/60",
      unlockAt: 0.82,
      locked: true,
    },
  ];

  return (
    <div ref={wrapRef} className="relative pl-8 space-y-5 flex-1 flex flex-col justify-between">
      {/* 背景轨道 */}
      <div
        aria-hidden
        className="absolute left-3 top-3 bottom-3 w-[2px] rounded-full bg-border/30 overflow-hidden"
      >
        <div
          className="w-full origin-top rounded-full bg-gradient-to-b from-blue-500 via-emerald-500 to-violet-500/80"
          style={{
            height: `${Math.max(8, progress * 100)}%`,
            boxShadow: "0 0 12px color-mix(in oklch, var(--primary) 35%, transparent)",
            transition: reduced ? undefined : "height 80ms linear",
          }}
        />
      </div>

      {steps.map((step) => {
        const lit = progress >= step.unlockAt;
        const intensity = Math.min(1, Math.max(0, (progress - step.unlockAt) / 0.2));
        return (
          <div
            key={step.title}
            className="relative group/step w-full"
            style={{
              opacity: step.locked ? 0.45 + intensity * 0.4 : 0.55 + intensity * 0.45,
              transform: lit && !reduced ? `translateY(${(1 - intensity) * 6}px)` : undefined,
              transition: "opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div
              className={`absolute -left-[32px] top-3 w-6 h-6 rounded-full bg-background border-2 ${step.ring} flex items-center justify-center shadow-md z-10 ${
                step.active && lit ? "shadow-emerald-500/30" : ""
              }`}
              style={{
                transform: lit && !reduced ? `scale(${1 + intensity * 0.08})` : undefined,
              }}
            >
              {step.icon}
            </div>
            <div
              className={`border rounded-2xl p-4 transition-all ${step.cardClass}`}
              style={{
                borderColor: lit && step.active ? "color-mix(in oklch, #34d399 40%, transparent)" : undefined,
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                <h4 className={`text-sm font-bold ${step.titleClass ?? "text-foreground"}`}>
                  {step.title}
                </h4>
                <span
                  className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${step.badgeClass} ${
                    step.active && lit ? "about-badge-pulse" : ""
                  }`}
                >
                  {step.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              {step.active && (
                <div className="mt-3 h-1 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                    style={{
                      width: `${Math.min(100, Math.max(12, progress * 100))}%`,
                      transition: reduced ? undefined : "width 90ms linear",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AboutPage() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[960px] py-[40px] lg:py-[64px] px-[16px] md:px-[32px]">
      <SeoHead
        title="关于我"
        description="关于浅草丶纳凉 —— 计算机科学学生、折腾型极客、INTP-A 逻辑学家。"
        url="/about"
      />

      {/* 1. Hero Section: 身份内核 + 流体光斑 */}
      <AnimateIn animation="animate-fade-in-up" className="mb-8">
        <div className="relative group overflow-hidden bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 about-hero-shell">
          {/* LOCAL MOD: ambient fluid orbs */}
          {!reduced && (
            <div aria-hidden className="about-fluid absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="about-fluid-blob about-fluid-blob-a" />
              <div className="about-fluid-blob about-fluid-blob-b" />
              <div className="about-fluid-blob about-fluid-blob-c" />
              <div className="absolute inset-0 bg-card/40 backdrop-blur-[2px]" />
            </div>
          )}
          {reduced && (
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
          )}

          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/30 via-emerald-400/20 to-violet-500/30 opacity-60 blur-md group-hover:opacity-90 transition-opacity duration-700" />
            <img
              src="https://pic1.imgdb.cn/item/687e291958cb8da5c8ca019b.webp"
              className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl border-2 border-border/80 shadow-2xl object-cover transform group-hover:scale-105 transition-transform duration-500"
              alt="avatar"
            />
            <div className="absolute -bottom-2 -right-2 text-[10px] font-semibold px-2.5 py-1 rounded-lg shadow-sm about-badge-float about-intp-badge">
              INTP-A
            </div>
          </div>

          <div className="relative flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 about-title-shimmer">
                浅草丶纳凉
              </h1>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                <strong>计算机科学专业学生</strong>。二次元重度患者，折腾型极客迷，易学入门学者。
                享受将服务塞入容器的成就感，日常在实用主义与唯美主义之间反复横跳，致力于在全栈工程中寻找最优解。
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {["独立开发", "Home Lab", "系统魔改", "二次元"].map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-secondary/80 border border-border/40 text-secondary-foreground backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnimateIn>

      {/* 2. Bento Grid 核心布局 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <AnimateIn animation="animate-slide-in-left" delay="delay-1" className="md:col-span-4 flex flex-col gap-6">
          <GlowCard
            className="group/card bg-card border border-border/40 rounded-3xl p-6 flex-1 hover:border-border/60 transition-colors flex flex-col justify-between"
            glow="rgba(96, 165, 250, 0.18)"
          >
            <div>
              <h3 className="text-sm font-bold text-muted-foreground/80 mb-6 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> 系统参数
              </h3>
              <div className="space-y-4">
                {[
                  { label: "初始版本", val: "v2002.0", color: "text-blue-400 font-mono" },
                  { label: "当前进程", val: "全栈工程 & 系统设计", color: "text-amber-400 font-medium" },
                  { label: "编译状态", val: "持续迭代中", color: "text-emerald-400 font-medium" },
                  { label: "物理坐标", val: "Node 86 (China)", color: "text-purple-400 font-medium" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-0"
                  >
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                    <span className={`${item.color} tracking-tight`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Separator className="my-6 bg-border/40" />
              <h3 className="text-sm font-bold text-muted-foreground/80 mb-4 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-primary" /> 续命方案
              </h3>
              <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <p>
                  <span className="text-foreground font-semibold">Morning:</span> 浓郁冰美式，专治逻辑卡顿与高数疲劳。
                </p>
                <p>
                  <span className="text-foreground font-semibold">Night:</span> 温润西湖龙井，让思维在茶香中回归稳态。
                </p>
              </div>
            </div>
          </GlowCard>
        </AnimateIn>

        <AnimateIn animation="animate-fade-in-up" delay="delay-2" className="md:col-span-8 flex flex-col gap-6">
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-border/60 transition-colors h-full flex flex-col">
            <h3 className="text-sm font-bold text-muted-foreground/80 mb-6 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> 极客升级进化路
            </h3>
            <EvolutionPath />
          </div>
        </AnimateIn>
      </div>

      {/* 装备库 */}
      <div className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Cloud className="w-4 h-4 text-blue-500" />,
              iconBg: "bg-blue-500/10",
              glow: "rgba(59, 130, 246, 0.22)",
              title: "Cloud & Edge Native",
              body: "热衷于探索现代云原生与边缘计算生态，从宏观上编排分布式应用，追求无感丝滑的极致体验，坚信真正的连接应当打破边界、润物无声。",
              delay: "delay-1",
            },
            {
              icon: <Cpu className="w-4 h-4 text-emerald-500" />,
              iconBg: "bg-emerald-500/10",
              glow: "rgba(16, 185, 129, 0.22)",
              title: "Home Lab & Virtualization",
              body: "低功耗低成本的 N100 架构 Home Lab。在 ESXi 虚拟化与 Docker 矩阵里亲手搭建起专属的自托管服务与 Emby 影音生态。",
              delay: "delay-2",
            },
            {
              icon: <Smartphone className="w-4 h-4 text-purple-500" />,
              iconBg: "bg-purple-500/10",
              glow: "rgba(168, 85, 247, 0.22)",
              title: "Mobile Core Modification",
              body: "拒绝出厂系统的束缚。Android 手机必拿满 root 权限，在 APatch、Magisk 和 LSPosed 的微调下达成最纯净、完全自主掌控的系统底层状态。",
              delay: "delay-3",
            },
          ].map((card) => (
            <AnimateIn key={card.title} animation="animate-scale-in" delay={card.delay}>
              <GlowCard
                className="group/card bg-card border border-border/40 rounded-2xl p-5 hover:border-border/80 transition-all h-full"
                glow={card.glow}
              >
                <div
                  className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center mb-3 group-hover/card:scale-110 transition-transform`}
                >
                  {card.icon}
                </div>
                <h4 className="text-sm font-bold mb-2">{card.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{card.body}</p>
              </GlowCard>
            </AnimateIn>
          ))}
        </div>
      </div>

      {/* 兴趣偏好 */}
      <AnimateIn animation="animate-fade-in-up" delay="delay-2" className="mt-6">
        <div className="bg-card border border-border/50 rounded-[32px] p-8 transition-all hover:border-border/80 relative overflow-hidden">
          {!reduced && (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full opacity-40 blur-3xl"
              style={{
                background: "radial-gradient(circle, rgba(167,139,250,0.35), transparent 70%)",
                animation: "about-orb-drift 14s ease-in-out infinite alternate",
              }}
            />
          )}
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Dna className="w-5 h-5 text-primary" /> 精神偏好与兴趣雷达
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gamepad2 className="w-3.5 h-3.5" /> 3A & Indie
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Monitor className="w-3.5 h-3.5" /> Hardware
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Music className="w-3.5 h-3.5" /> JAY & ACG
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {[
              {
                name: "CLANNAD",
                src: "https://pic.imgdb.cn/item/658d73d2c458853aef9a8db7.png",
                url: "https://www.bilibili.com/bangumi/play/ss1177",
                desc: "写作CL，读作人生",
              },
              {
                name: "我们仍未知道那天所看见的花的名字。",
                src: "https://pic.imgdb.cn/item/658d7433c458853aef9c901b.jpg",
                url: "https://www.bilibili.com/bangumi/play/ss835",
                desc: "盛夏里的泪水与救赎",
              },
              {
                name: "紫罗兰永恒花园",
                src: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21827-ubzq619ZA2E9.png",
                url: "https://www.bilibili.com/bangumi/media/md8892/",
                desc: "极致作画与细腻的爱",
              },
              {
                name: "可塑性记忆",
                src: "https://cdn.jsdelivr.net/gh/Asakushen/pic@main/2023/12/28/13bd0b.png",
                url: "https://www.bilibili.com/bangumi/play/ss1552",
                desc: "关于时光与告别的浪漫",
              },
              {
                name: "孤独摇滚！",
                src: "https://cdn.jsdelivr.net/gh/Asakushen/pic@main/2023/12/28/69733d.png",
                url: "https://www.bilibili.com/bangumi/play/ss43164",
                desc: "社恐人的摇滚乌托邦",
              },
            ].map((anime, idx) => (
              <a
                href={anime.url}
                target="_blank"
                rel="noopener noreferrer"
                key={anime.name}
                className="group flex flex-col gap-3"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden shadow-md ring-1 ring-border/50 group-hover:ring-primary/50 transition-all duration-300 about-anime-card">
                  <img
                    src={anime.src}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    alt={anime.name}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                    {anime.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground truncate">{anime.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </AnimateIn>

      {/* Footer 金句 */}
      <AnimateIn animation="animate-fade-in" delay="delay-3" className="mt-16 flex flex-col items-center gap-6">
        <Separator className="w-24 bg-border/60" />
        <div className="text-center space-y-3">
          <p className="text-xl md:text-2xl italic font-serif text-foreground/90 tracking-tight about-quote">
            “乱花渐欲迷人眼，浅草才能没马蹄。”
          </p>
          <p className="text-[11px] text-muted-foreground max-w-[400px] leading-relaxed">
            在浮躁喧嚣的世界里，愿我们都能找到自己的那片土壤，踏实走好每一步。
          </p>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground/20">
          <Tv className="w-4 h-4" />
          <Terminal className="w-4 h-4" />
          <MapPin className="w-4 h-4" />
        </div>
      </AnimateIn>
    </div>
  );
}
