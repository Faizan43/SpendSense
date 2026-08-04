export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Shown in the mobile tab bar (max five, including the add button). */
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard", primary: true },
  { href: "/expenses", label: "Expenses", icon: "list-checks", primary: true },
  { href: "/receipts", label: "Receipts", icon: "receipt", primary: true },
  { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
  { href: "/budgets", label: "Budgets", icon: "wallet", primary: true },
  { href: "/insights", label: "Insights", icon: "sparkles" },
  { href: "/stores", label: "Stores", icon: "store" },
  { href: "/products", label: "Products", icon: "shopping-basket" },
  { href: "/categories", label: "Categories", icon: "tags" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/settings", label: "Settings", icon: "settings", primary: true },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
