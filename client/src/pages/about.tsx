import { Separator } from "@/components/ui/separator";
import { SeoHead } from "@/components/seo-head";
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
  Lock
} from "lucide-react";

export function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] py-[40px] lg:py-[64px] px-[16px] md:px-[32px]">
      <SeoHead
        title="关于我"
        description="关于浅草丶纳凉 —— 计算机科学学生、折腾型极客、INTP-A 逻辑学家。"
        url="/about"
      />

      {/* 1. Hero Section: 身份内核 */}
      <div className="relative group overflow-hidden bg-card border border-border/50 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center gap-8 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative">
          <img 
            src="https://pic1.imgdb.cn/item/687e291958cb8da5c8ca019b.webp" 
            className="w-32 h-32 md:w-36 md:h-36 rounded-2xl border-2 border-border/80 shadow-2xl object-cover transform group-hover:scale-105 transition-transform duration-500"
            alt="avatar" 
          />
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
            INTP-A
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">浅草丶纳凉</h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              <strong>计算机科学专业学生</strong>。二次元重度患者，折腾型极客迷，易学入门学者。
              享受将服务塞入容器的成就感，日常在实用主义与唯美主义之间反复横跳，致力于在全栈工程中寻找最优解。
            </p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {["独立开发", "Home Lab", "系统魔改", "二次元"].map(tag => (
              <span key={tag} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-secondary border border-border/40 text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Bento Grid 核心布局 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 左侧：系统参数卡 (跨 4 列) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-card border border-border/40 rounded-3xl p-6 flex-1 hover:border-border/60 transition-colors flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground/80 mb-6 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> 系统参数
              </h3>
              <div className="space-y-4">
                {[
                  { label: "初始版本", val: "v2002.0", color: "text-blue-400 font-mono" },
                  { label: "当前进程", val: "全栈工程 & 系统设计", color: "text-amber-400 font-medium" },
                  { label: "编译状态", val: "持续迭代中", color: "text-emerald-400 font-medium" },
                  { label: "物理坐标", val: "Node 86 (China)", color: "text-purple-400 font-medium" }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-border/10 last:border-0">
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                    <span className={`${item.color} tracking-tight`}>
                      {item.val}
                    </span>
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
                <p><span className="text-foreground font-semibold">Morning:</span> 浓郁冰美式，专治逻辑卡顿与高数疲劳。</p>
                <p><span className="text-foreground font-semibold">Night:</span> 温润西湖龙井，让思维在茶香中回归稳态。</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：极客升级进化路 (跨 8 列) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-border/60 transition-colors h-full flex flex-col">
            <h3 className="text-sm font-bold text-muted-foreground/80 mb-6 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> 极客升级进化路
            </h3>
            
            <div className="relative pl-8 space-y-5 flex-1 flex flex-col justify-between before:absolute before:left-3 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-blue-500 via-emerald-500 to-border/30">
              
              {/* Level 1 */}
              <div className="relative group/step w-full">
                <div className="absolute -left-[32px] top-3 w-6 h-6 rounded-full bg-background border-2 border-blue-500 flex items-center justify-center shadow-md z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="bg-secondary/15 border border-border/30 rounded-2xl p-4 transition-all hover:bg-secondary/25 hover:border-blue-500/30">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-foreground">Level 1：独立探索者 (Explorer)</h4>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">Completed</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed"><strong>技能点：</strong>语言基础打牢 / 软硬件魔改 / 独立单兵作战环境搭建。</p>
                </div>
              </div>

              {/* Level 2 */}
              <div className="relative group/step w-full">
                <div className="absolute -left-[32px] top-3 w-6 h-6 rounded-full bg-background border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 z-10">
                  <CircleDot className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                </div>
                <div className="bg-secondary/30 border border-border/60 rounded-2xl p-4 transition-all hover:border-emerald-500/40 shadow-sm shadow-emerald-500/5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-emerald-400">Level 2：深度潜行者 (Deep Diver)</h4>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold animate-pulse">Active Loading...</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed"><strong>正在攻克：</strong>计算机理论底层重构 / 高可用网络编排 / 硬核内功闭关修炼。</p>
                </div>
              </div>

              {/* Level 3 */}
              <div className="relative group/step w-full opacity-50 transition-opacity hover:opacity-80">
                <div className="absolute -left-[32px] top-3 w-6 h-6 rounded-full bg-background border-2 border-muted flex items-center justify-center shadow-md z-10">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="bg-secondary/5 border border-dashed border-border/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-muted-foreground">Level 3：造物主模式 (Architect)</h4>
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Locked</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed"><strong>终极远景：</strong>自由定义边缘原生全栈生态，让科技与生活达成完美无缝融合。</p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* 🛠️ 装备库与折腾清单 (全宽 3 列布局) */}
      <div className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border/40 rounded-2xl p-5 hover:border-border/80 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Cloud className="w-4 h-4 text-blue-500" />
            </div>
            <h4 className="text-sm font-bold mb-2">Cloud & Edge Native</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              热衷于探索现代云原生与边缘计算生态，从宏观上编排分布式应用，追求无感丝滑的极致体验，坚信真正的连接应当打破边界、润物无声。
            </p>
          </div>
          
          <div className="bg-card border border-border/40 rounded-2xl p-5 hover:border-border/80 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Cpu className="w-4 h-4 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold mb-2">Home Lab & Virtualization</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              低功耗低成本的 N100 架构 Home Lab。在 ESXi 虚拟化与 Docker 矩阵里亲手搭建起专属的自托管服务与 Emby 影音生态。
            </p>
          </div>

          <div className="bg-card border border-border/40 rounded-2xl p-5 hover:border-border/80 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Smartphone className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-bold">Mobile Core Modification</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              拒绝出厂系统的束缚。Android 手机必拿满 root 权限，在 APatch、Magisk 和 LSPosed 的微调下达成最纯净、完全自主掌控的系统底层状态。
            </p>
          </div>
        </div>
      </div>

      {/* 3. 兴趣偏好全宽展示区 */}
      <div className="bg-card border border-border/50 rounded-[32px] p-8 mt-6 transition-all hover:border-border/80">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
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

        {/* 追番列表 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {[
            { name: "CLANNAD", src: "https://pic.imgdb.cn/item/658d73d2c458853aef9a8db7.png", url: "https://www.bilibili.com/bangumi/play/ss1177", desc: "写作CL，读作人生" },
            { name: "我们仍未知道那天所看见的花的名字。", src: "https://pic.imgdb.cn/item/658d7433c458853aef9c901b.jpg", url: "https://www.bilibili.com/bangumi/play/ss835", desc: "盛夏里的泪水与救赎" },
            { name: "紫罗兰永恒花园", src: "https://bu.dusays.com/2023/05/24/646db43983d99.webp", url: "https://www.bilibili.com/bangumi/media/md8892/", desc: "极致作画与细腻的爱" },
            { name: "可塑性记忆", src: "https://jsd.cdn.zzko.cn/gh/Asakushen/pic/2023/12/28/13bd0b.png", url: "https://www.bilibili.com/bangumi/play/ss1552", desc: "关于时光与告别的浪漫" },
            { name: "孤独摇滚！", src: "https://jsd.cdn.zzko.cn/gh/Asakushen/pic/2023/12/28/69733d.png", url: "https://www.bilibili.com/bangumi/play/ss43164", desc: "社恐人的摇滚乌托邦" }
          ].map((anime) => (
            <a 
              href={anime.url} 
              target="_blank" 
              rel="noopener noreferrer"
              key={anime.name} 
              className="group flex flex-col gap-3"
            >
              <div className="relative aspect-[3/4.2] rounded-2xl overflow-hidden shadow-md ring-1 ring-border/50 group-hover:ring-primary/50 transition-all duration-300">
                <img src={anime.src} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt={anime.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold truncate group-hover:text-primary transition-colors">{anime.name}</h4>
                <p className="text-[10px] text-muted-foreground truncate">{anime.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 4. Footer 金句座右铭 */}
      <div className="mt-16 flex flex-col items-center gap-6">
        <Separator className="w-24 bg-border/60" />
        <div className="text-center space-y-3">
          <p className="text-xl md:text-2xl italic font-serif text-foreground/90 tracking-tight">
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
      </div>
    </div>
  );
}