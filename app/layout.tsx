import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackMatch AI",
  description: "Deterministic hackathon team matching with explainable scoring."
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/participant/register", label: "Register" },
  { href: "/participant/team", label: "My team" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/matching", label: "Matching" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/settings", label: "Settings" }
];

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              HackMatch AI
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
