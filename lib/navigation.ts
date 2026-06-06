export type NavItem = {
  href: string;
  label: string;
};

export const primaryNavItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/participant/register", label: "Register" },
  { href: "/participant/team", label: "My team" },
  { href: "/admin", label: "Admin" }
];

export const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/matching", label: "Matching" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/settings", label: "Settings" }
];

export const contextualParticipantRoutes: NavItem[] = [
  { href: "/participant/confirmation", label: "Confirmation" }
];

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminSectionActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
