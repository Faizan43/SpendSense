import type { Metadata } from "next";

import { CsvImport } from "@/components/expenses/csv-import";
import { ExpenseEditor } from "@/components/expenses/expense-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProductSuggestions } from "@/lib/expenses/queries";
import { getCategories, getStores } from "@/lib/profile";

export const metadata: Metadata = { title: "Add expenses" };

export default async function NewExpensePage() {
  const [categories, stores, suggestions] = await Promise.all([
    getCategories(),
    getStores(),
    getProductSuggestions(),
  ]);

  return (
    <>
      <PageHeader
        title="Add a shop"
        description="One item or a whole trolley. Start typing something you've bought before and its category and last price fill themselves in."
      />

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Enter items</TabsTrigger>
          <TabsTrigger value="csv">Import a CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <ExpenseEditor
            categories={categories}
            stores={stores.map((s) => ({ id: s.id, name: s.name }))}
            suggestions={suggestions}
            submitLabel="Save shop"
          />
        </TabsContent>

        <TabsContent value="csv">
          <CsvImport
            categories={categories}
            stores={stores.map((s) => ({ id: s.id, name: s.name }))}
            suggestions={suggestions}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
