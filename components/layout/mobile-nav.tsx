"use client";

import { Menu, Wallet } from "lucide-react";
import { useState } from "react";

import { NavLinks } from "@/components/layout/nav-links";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * The bottom bar covers the pages people use constantly; this drawer
 * carries the rest so nothing is unreachable on a phone.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="size-4" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-3 pb-0">
          <SheetTitle className="flex items-center gap-2 font-heading text-base">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full">
              <Wallet className="size-4" />
            </span>
            SpendSense
          </SheetTitle>
          <SheetDescription className="sr-only">
            Application navigation
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t p-2">
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
