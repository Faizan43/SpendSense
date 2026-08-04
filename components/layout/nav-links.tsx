"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { NAV_ITEMS, isActivePath, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon name={item.icon} className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const primaryItems = NAV_ITEMS.filter((item) => item.primary);
  const moreItems = NAV_ITEMS.filter((item) => !item.primary);
  const moreHasActive = moreItems.some((item) => isActivePath(pathname, item.href));
  // Collapsed by default so a new user sees five options, not eleven — but
  // stays open once they're actually on one of the "More" pages.
  const [expanded, setExpanded] = useState(moreHasActive);

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {primaryItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActivePath(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")}
        />
        More
      </button>

      {expanded
        ? moreItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))
        : null}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.primary);

  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
