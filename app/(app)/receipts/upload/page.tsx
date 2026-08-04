import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ReceiptUploader } from "@/components/receipts/receipt-uploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hasAnthropicKey } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Upload receipts" };

export default async function UploadReceiptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const extractionEnabled = hasAnthropicKey();

  return (
    <>
      <PageHeader
        title="Upload receipts"
        description="Every line is read out and categorised. You get to check it before anything is saved."
      />

      {!extractionEnabled ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>Receipt reading is switched off</AlertTitle>
          <AlertDescription>
            No <code>ANTHROPIC_API_KEY</code> is configured, so uploads are
            stored but not read. You can still type the items in on the review
            screen.
          </AlertDescription>
        </Alert>
      ) : null}

      <ReceiptUploader userId={user.id} extractionEnabled={extractionEnabled} />
    </>
  );
}
