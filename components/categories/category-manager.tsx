"use client";

import { Loader2, Merge, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteCategory,
  deleteRule,
  mergeCategories,
  reapplyRules,
  saveCategory,
  saveRule,
} from "@/app/(app)/categories/actions";
import { CATEGORY_ICON_NAMES, Icon } from "@/components/icon";
import { useMoney } from "@/components/money-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { chartSlotColor } from "@/lib/categories";
import type { CategoryRow, CategoryRuleRow } from "@/lib/types/database";

type CategoryStat = { categoryId: string; itemCount: number; totalMinor: number };

export function CategoryManager({
  categories,
  rules,
  stats,
}: {
  categories: CategoryRow[];
  rules: Array<CategoryRuleRow & { categoryName: string }>;
  stats: CategoryStat[];
}) {
  const router = useRouter();
  const { format } = useMoney();
  const [pending, startTransition] = useTransition();

  const [editor, setEditor] = useState<{
    open: boolean;
    id?: string;
    name: string;
    icon: string;
    chartSlot: number;
  }>({ open: false, name: "", icon: "package", chartSlot: 0 });

  const [merge, setMerge] = useState<{ open: boolean; sourceId?: string; targetId: string }>(
    { open: false, targetId: "" },
  );

  const [rule, setRule] = useState({ pattern: "", categoryId: "" });

  const statById = new Map(stats.map((s) => [s.categoryId, s]));

  function refresh(message: string) {
    toast.success(message);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Categories</CardTitle>
            <Button
              size="sm"
              onClick={() =>
                setEditor({ open: true, name: "", icon: "package", chartSlot: 0 })
              }
            >
              <Plus className="size-3.5" /> New category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {categories.map((category) => {
              const stat = statById.get(category.id);
              return (
                <li key={category.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${chartSlotColor(category.chart_slot)} 18%, transparent)`,
                      color: chartSlotColor(category.chart_slot),
                    }}
                  >
                    <Icon name={category.icon} className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {category.name}
                      {category.is_system ? null : (
                        <Badge variant="secondary" className="ml-2">
                          Custom
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {stat
                        ? `${stat.itemCount} items · ${format(stat.totalMinor)}`
                        : "Nothing filed here yet"}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${category.name}`}
                      onClick={() =>
                        setEditor({
                          open: true,
                          id: category.id,
                          name: category.name,
                          icon: category.icon,
                          chartSlot: category.chart_slot,
                        })
                      }
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Merge ${category.name} into another category`}
                      onClick={() =>
                        setMerge({
                          open: true,
                          sourceId: category.id,
                          targetId:
                            categories.find((c) => c.id !== category.id)?.id ?? "",
                        })
                      }
                    >
                      <Merge className="size-3.5" />
                    </Button>
                    {!category.is_system ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${category.name}`}
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteCategory(category.id);
                            if (!result.ok) {
                              toast.error(result.error);
                              return;
                            }
                            refresh("Category deleted");
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Your rules</CardTitle>
              <p className="text-muted-foreground text-sm">
                A rule beats everything else the categoriser knows — including
                what it read off the receipt.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await reapplyRules();
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  refresh(
                    result.changed > 0
                      ? `Re-filed ${result.changed} past items`
                      : "Everything was already where your rules put it",
                  );
                })
              }
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Apply to past items
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!rule.pattern || !rule.categoryId) return;
              startTransition(async () => {
                const result = await saveRule({
                  pattern: rule.pattern,
                  categoryId: rule.categoryId,
                });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setRule({ pattern: "", categoryId: "" });
                refresh("Rule added");
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="rule-pattern" className="text-muted-foreground text-xs">
                When an item contains
              </Label>
              <Input
                id="rule-pattern"
                className="w-52"
                placeholder="oat milk"
                value={rule.pattern}
                onChange={(e) => setRule((r) => ({ ...r, pattern: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-category" className="text-muted-foreground text-xs">
                File it under
              </Label>
              <NativeSelect
                id="rule-category"
                className="w-52"
                value={rule.categoryId}
                onChange={(e) => setRule((r) => ({ ...r, categoryId: e.target.value }))}
              >
                <option value="">Choose a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" /> Add rule
            </Button>
          </form>

          {rules.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No rules of your own yet. Correcting a category on the expenses
              screen quietly creates one for you.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                    {r.pattern}
                  </code>
                  <span className="text-muted-foreground">→</span>
                  <span className="min-w-0 flex-1 truncate">{r.categoryName}</span>
                  <Badge variant="secondary">
                    {r.source === "user" ? "Yours" : "Learned"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete the rule for ${r.pattern}`}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteRule(r.id);
                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }
                        refresh("Rule deleted");
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor.id ? "Edit category" : "New category"}
            </DialogTitle>
            <DialogDescription>
              The colour is used in charts. Eight are available; several
              categories can share one because the name is always shown too.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={editor.name}
                onChange={(e) =>
                  setEditor((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-icon">Icon</Label>
              <NativeSelect
                id="category-icon"
                value={editor.icon}
                onChange={(e) =>
                  setEditor((s) => ({ ...s, icon: e.target.value }))
                }
              >
                {CATEGORY_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name.replace(/-/g, " ")}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label>Chart colour</Label>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-label={slot === 0 ? "Neutral grey" : `Colour ${slot}`}
                    aria-pressed={editor.chartSlot === slot}
                    onClick={() => setEditor((s) => ({ ...s, chartSlot: slot }))}
                    className={`size-7 rounded-full ring-offset-2 ring-offset-[var(--card)] ${
                      editor.chartSlot === slot ? "ring-foreground ring-2" : ""
                    }`}
                    style={{ backgroundColor: chartSlotColor(slot) }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditor((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await saveCategory({
                    id: editor.id,
                    name: editor.name,
                    icon: editor.icon,
                    chartSlot: editor.chartSlot,
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  setEditor((s) => ({ ...s, open: false }));
                  refresh("Category saved");
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={merge.open}
        onOpenChange={(open) => setMerge((m) => ({ ...m, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge categories</DialogTitle>
            <DialogDescription>
              Every item, rule and product memory moves across. Your historical
              totals don&apos;t change — only how they&apos;re grouped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="merge-target">Move everything into</Label>
            <NativeSelect
              id="merge-target"
              value={merge.targetId}
              onChange={(e) =>
                setMerge((m) => ({ ...m, targetId: e.target.value }))
              }
            >
              {categories
                .filter((c) => c.id !== merge.sourceId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </NativeSelect>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMerge((m) => ({ ...m, open: false }))}
            >
              Cancel
            </Button>
            <Button
              disabled={pending || !merge.sourceId || !merge.targetId}
              onClick={() =>
                startTransition(async () => {
                  const result = await mergeCategories(
                    merge.sourceId!,
                    merge.targetId,
                  );
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  setMerge({ open: false, targetId: "" });
                  refresh(result.message ?? "Categories merged");
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
