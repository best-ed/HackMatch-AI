"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/participant/register", label: "Register" },
  { href: "/participant/confirmation", label: "Confirmation" },
  { href: "/participant/team", label: "My team" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/matching", label: "Matching" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/settings", label: "Settings" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link
            href="/"
            className="inline-flex w-fit items-baseline rounded-md text-2xl font-semibold tracking-tight outline-none ring-primary/20 transition focus-visible:ring-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            HackMatch AI<sup className="text-xs">&reg;</sup>
          </Link>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-1 text-sm text-muted-foreground">
            {navItems.map((item) => {
              const active = item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium outline-none ring-primary/20 transition focus-visible:ring-4",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted hover:text-foreground"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
