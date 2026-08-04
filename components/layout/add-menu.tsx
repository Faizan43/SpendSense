"use client"

import { ListChecks, Plus, Receipt } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/receipts/upload" />}>
          <Receipt className="size-4" />
          Upload receipt
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/expenses/new" />}>
          <ListChecks className="size-4" />
          Add expense
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
