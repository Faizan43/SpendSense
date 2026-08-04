import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AuthAlert({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (!error && !message) return null;

  const isError = Boolean(error);
  return (
    <p
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "text-destructive flex items-start gap-2 text-sm"
          : "text-success flex items-start gap-2 text-sm"
      }
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{error ?? message}</span>
    </p>
  );
}
