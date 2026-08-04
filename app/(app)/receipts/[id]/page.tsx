import { redirect } from "next/navigation";

/**
 * The review screen already shows the image, the extracted lines and the saved
 * state, so a separate read-only detail page would only be a worse copy of it.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/receipts/${id}/review`);
}
