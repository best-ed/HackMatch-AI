"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  adminNavItems,
  contextualParticipantRoutes,
  isAdminSectionActive,
  isNavItemActive,
  isParticipantSectionActive,
  navAriaCurrent,
  participantNavItems,
  primaryNavItems
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isParticipantRoute = pathname === "/participant" || pathname.startsWith("/participant/");
  const participantSubnavItems = pathname.startsWith("/participant/confirmation")
    ? [...participantNavItems, ...contextualParticipantRoutes]
    : participantNavItems;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link
              href="/"
              className="inline-flex w-fit shrink-0 items-baseline rounded-md text-2xl font-semibold tracking-tight outline-none ring-primary/20 transition focus-visible:ring-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              HackMatch AI<sup className="text-xs">&reg;</sup>
            </Link>
            <nav aria-label="Primary navigation" className="nav-scroll flex gap-1 text-sm text-muted-foreground lg:flex-wrap lg:justify-end">
              {primaryNavItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    aria-current={navAriaCurrent(pathname, item.href, active)}
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
                    aria-current={navAriaCurrent(pathname, item.href, active)}
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
          {isParticipantRoute ? (
            <nav
              aria-label="Participant navigation"
              className="nav-scroll mt-4 flex gap-1 border-t border-border/70 pt-3 text-sm text-muted-foreground"
            >
              {participantSubnavItems.map((item) => {
                const active = isParticipantSectionActive(pathname, item.href);
                return (
                  <Link
                    aria-current={navAriaCurrent(pathname, item.href, active)}
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
    "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-medium outline-none ring-primary/20 transition focus-visible:ring-4",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "hover:bg-muted hover:text-foreground"
  );
}
