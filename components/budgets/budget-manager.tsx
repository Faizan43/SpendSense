"use client";

import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  copyBudgetsFromPreviousMonth,
  deleteBudget,
  saveBudget,
} from "@/app/(app)/budgets/actions";
import { BudgetProgressBar } from "@/components/budgets/budget-progress-bar";
import { useMoney } from "@/components/money-provider";
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
import { currencySymbol, minorToInput } from "@/lib/money";
import type { BudgetProgress, CategoryRow } from "@/lib/types/database";

type EditorState = {
  open: boolean;
  budgetId?: string;
  categoryId: string | null;
  amount: string;
  threshold: string;
};

const CLOSED: EditorState = {
  open: false,
  categoryId: null,
  amount: "",
  threshold: "80",
};

export function BudgetManager({
  month,
  budgets,
  categories,
  defaultThreshold,
}: {
  month: string;
  budgets: BudgetProgress[];
  categories: CategoryRow[];
  defaultThreshold: number;
}) {
  const router = useRouter();
  const { currency } = useMoney();
  const [editor, setEditor] = useState<EditorState>(CLOSED);
  const [pending, startTransition] = useTransition();

  const overall = budgets.find((b) => b.category_id === null);
  const categoryBudgets = budgets.filter((b) => b.category_id !== null);
  const budgetedCategoryIds = new Set(categoryBudgets.map((b) => b.category_id));
  const availableCategories = categories.filter(
    (c) => !budgetedCategoryIds.has(c.id) || c.id === editor.categoryId,
  );

  function openEditor(budget?: BudgetProgress, categoryId: string | null = null) {
    setEditor({
      open: true,
      budgetId: budget?.budget_id,
      categoryId: budget ? budget.category_id : categoryId,
      amount: budget ? minorToInput(budget.amount_minor) : "",
      threshold: String(budget?.alert_threshold_pct ?? defaultThreshold),
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await saveBudget({
        periodMonth: month,
        categoryId: editor.categoryId,
        amount: editor.amount,
        alertThresholdPct: Number(editor.threshold) || defaultThreshold,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Budget saved");
      setEditor(CLOSED);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteBudget(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Budget removed");
      router.refresh();
    });
  }

  function copyForward() {
    startTransition(async () => {
      const result = await copyBudgetsFromPreviousMonth(month);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Copied ${result.count} budgets from last month`);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Overall monthly budget</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyForward} disabled={pending}>
                <Copy className="size-3.5" /> Copy last month
              </Button>
              <Button size="sm" onClick={() => openEditor(overall, null)}>
                {overall ? (
                  <>
                    <Pencil className="size-3.5" /> Edit
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" /> Set budget
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {overall ? (
            <BudgetProgressBar
              label="All spending"
              spentMinor={overall.spent_minor}
              amountMinor={overall.amount_minor}
              sublabel={`We'll tell you once you pass ${overall.alert_threshold_pct}%.`}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No overall budget for this month yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Category budgets</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={availableCategories.length === 0}
              onClick={() =>
                openEditor(undefined, availableCategories[0]?.id ?? null)
              }
            >
              <Plus className="size-3.5" /> Add a category budget
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {categoryBudgets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing capped by category yet. These are useful for the things
              that quietly creep — snacks, takeaway coffee, household bits.
            </p>
          ) : (
            categoryBudgets.map((budget) => (
              <div key={budget.budget_id} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <BudgetProgressBar
                    label={budget.category_name}
                    spentMinor={budget.spent_minor}
                    amountMinor={budget.amount_minor}
                  />
                </div>
                <div className="flex shrink-0 gap-1 pt-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit the ${budget.category_name} budget`}
                    onClick={() => openEditor(budget)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove the ${budget.category_name} budget`}
                    onClick={() => remove(budget.budget_id)}
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
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
              {editor.budgetId ? "Edit budget" : "Set a budget"}
            </DialogTitle>
            <DialogDescription>
              Budgets are per month. Changing this one doesn&apos;t affect other
              months.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget-category">Applies to</Label>
              <NativeSelect
                id="budget-category"
                value={editor.categoryId ?? ""}
                disabled={Boolean(editor.budgetId)}
                onChange={(e) =>
                  setEditor((s) => ({
                    ...s,
                    categoryId: e.target.value || null,
                  }))
                }
              >
                <option value="">All spending</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget-amount">Monthly limit</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  {currencySymbol(currency)}
                </span>
                <Input
                  id="budget-amount"
                  inputMode="decimal"
                  className="pl-6"
                  placeholder="400.00"
                  value={editor.amount}
                  onChange={(e) =>
                    setEditor((s) => ({ ...s, amount: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget-threshold">Warn me at</Label>
              <NativeSelect
                id="budget-threshold"
                value={editor.threshold}
                onChange={(e) =>
                  setEditor((s) => ({ ...s, threshold: e.target.value }))
                }
              >
                {[50, 60, 70, 75, 80, 85, 90, 95].map((pct) => (
                  <option key={pct} value={pct}>
                    {pct}% of the limit
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(CLOSED)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
