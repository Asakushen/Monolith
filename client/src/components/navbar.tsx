"use client";

import { Link, useLocation } from "wouter";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminGate } from "@/components/admin-gate";
import { SearchTrigger } from "@/components/search";
import { fetchNavPages, type NavPage } from "@/lib/api";
import { useSiteSettings } from "@/lib/site-settings";

const fixedStart = [{ href: "/", label: "首页" }];
const fixedEnd = [
  { href: "/archive", label: "归档" },
  { href: "/friends", label: "友链" },
  { href: "/guestbook", label: "留言" },
  { href: "/about", label: "关于" },
];

export function Navbar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [navPages, setNavPages] = useState<NavPage[]>([]);
  const { settings } = useSiteSettings();
  // LOCAL MOD: hydrate brand from localStorage cache to avoid first-paint Monolith/empty icon flash
  const [brand, setBrand] = useState(() => {
    try {
      const raw = localStorage.getItem("monolith_public_brand");
      if (raw) {
        const parsed = JSON.parse(raw) as { title?: string; icon?: string };
        const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
        const icon = typeof parsed.icon === "string" ? parsed.icon.trim() : "";
        if (title || icon) {
          return {
            title: title || "浅草物语",
            icon: icon || "/favicon.png",
          };
        }
      }
    } catch {
      // ignore
    }
    return { title: "浅草物语", icon: "/favicon.png" }; // LOCAL MOD: static favicon fallback
  });

  useEffect(() => {
    fetchNavPages().then(setNavPages);
  }, []);

  // LOCAL MOD: keep brand cache in sync with server settings (shared hook)
  useEffect(() => {
    if (!settings.site_title && !settings.site_icon) return;
    const next = {
      title: settings.site_title?.trim() || "浅草物语", // LOCAL MOD: default brand
      icon: settings.site_icon?.trim() || "/favicon.png",
    };
    setBrand(next);
    try {
      localStorage.setItem(
        "monolith_public_brand",
        JSON.stringify({ ...next, updatedAt: Date.now() }),
      );
    } catch {
      // ignore
    }
  }, [settings]);

  const navLinks = useMemo(
    () => [
      ...fixedStart,
      ...navPages.map((p) => ({ href: `/page/${p.slug}`, label: p.title })),
      ...fixedEnd,
    ],
    [navPages],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setGateOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogoDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGateOpen(true);
  }, []);

  const isAdmin = location.startsWith("/admin");

  return (
    <>
      <header className="app-header sticky top-0 z-50 w-full border-b border-border/30 bg-background/82 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-[56px] max-w-[1440px] items-center justify-between px-[20px] lg:px-[40px]">
          <Link
            href="/"
            className="group flex items-center gap-[10px] select-none animate-slide-in-left"
            onDoubleClick={handleLogoDoubleClick}
          >
            <div className="relative flex h-[32px] w-[32px] shrink-0 items-center justify-center">
              {brand.icon ? (
                <img
                  src={brand.icon}
                  alt=""
                  className="h-[28px] w-[28px] rounded-md object-cover transition-transform duration-300 group-hover:-translate-y-[2px]"
                />
              ) : (
                <div className="absolute inset-0 rounded-[3px] bg-gradient-to-b from-foreground/90 to-foreground/44 transition-all duration-300 group-hover:from-foreground group-hover:to-foreground/62" />
              )}
            </div>
            <span className="max-w-[180px] truncate text-[18px] font-semibold tracking-[-0.03em] text-foreground sm:max-w-[240px]">
              {brand.title}
            </span>
          </Link>

          <nav className="hidden items-center gap-[8px] md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-[12px] py-[6px] text-[14px] transition-colors duration-200 ${
                  location === link.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {location === link.href && (
                  <span className="absolute bottom-0 left-[12px] right-[12px] h-[1.5px] bg-foreground rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-[4px]">
            <SearchTrigger />
            <ThemeToggle />

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                className="ml-[4px] inline-flex h-[44px] w-[44px] items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
                aria-label="打开导航菜单"
              >
                <Menu className="h-[18px] w-[18px]" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-background/95 backdrop-blur-xl">
                <nav className="flex flex-col gap-[4px] pt-[40px]">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`rounded-md px-[16px] py-[12px] text-[15px] transition-colors duration-200 ${
                        location === link.href
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {!isAdmin && (
        <AdminGate open={gateOpen} onClose={() => setGateOpen(false)} />
      )}
    </>
  );
}
