"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems, isAdminSectionActive, isNavItemActive, primaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link
              href="/"
              className="inline-flex w-fit items-baseline rounded-md text-2xl font-semibold tracking-tight outline-none ring-primary/20 transition focus-visible:ring-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              HackMatch AI<sup className="text-xs">&reg;</sup>
            </Link>
            <nav aria-label="Primary navigation" className="nav-scroll flex gap-1 text-sm text-muted-foreground lg:flex-wrap lg:justify-end">
              {primaryNavItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={navLinkClass(active)}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {isAdminRoute ? (
            <nav
              aria-label="Admin navigation"
              className="nav-scroll mt-4 flex gap-1 border-t border-border/70 pt-3 text-sm text-muted-foreground"
            >
              {adminNavItems.map((item) => {
                const active = isAdminSectionActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(navLinkClass(active), "shrink-0")}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}

function navLinkClass(active: boolean) {
  return cn(
    "shrink-0 rounded-md px-3 py-1.5 font-medium outline-none ring-primary/20 transition focus-visible:ring-4",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "hover:bg-muted hover:text-foreground"
  );
}
