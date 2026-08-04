import {
  Baby,
  BarChart3,
  Beef,
  Bell,
  Carrot,
  ChartColumn,
  ChartPie,
  Cookie,
  Croissant,
  CupSoda,
  HandHeart,
  Lamp,
  LayoutDashboard,
  Lightbulb,
  List,
  ListChecks,
  Milk,
  Package,
  Receipt,
  ReceiptText,
  Settings,
  ShoppingBasket,
  Snowflake,
  SprayCan,
  Sparkles,
  Store,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons are stored in the database as kebab-case names so a user can pick a
 * different one for a category without shipping code. Unknown names fall back
 * to a neutral package icon rather than crashing the row.
 */
const ICONS: Record<string, LucideIcon> = {
  baby: Baby,
  "bar-chart-3": BarChart3,
  beef: Beef,
  bell: Bell,
  carrot: Carrot,
  "chart-column": ChartColumn,
  "chart-pie": ChartPie,
  cookie: Cookie,
  croissant: Croissant,
  "cup-soda": CupSoda,
  "hand-heart": HandHeart,
  lamp: Lamp,
  "layout-dashboard": LayoutDashboard,
  lightbulb: Lightbulb,
  list: List,
  "list-checks": ListChecks,
  milk: Milk,
  package: Package,
  receipt: Receipt,
  "receipt-text": ReceiptText,
  settings: Settings,
  "shopping-basket": ShoppingBasket,
  snowflake: Snowflake,
  sparkles: Sparkles,
  "spray-can": SprayCan,
  store: Store,
  tags: Tags,
  target: Target,
  wallet: Wallet,
};

/** The names offered in the category icon picker. */
export const CATEGORY_ICON_NAMES = [
  "carrot",
  "milk",
  "beef",
  "croissant",
  "cookie",
  "cup-soda",
  "snowflake",
  "lamp",
  "hand-heart",
  "baby",
  "spray-can",
  "shopping-basket",
  "package",
];

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Component = ICONS[name] ?? Package;
  return <Component className={className} aria-hidden="true" />;
}
