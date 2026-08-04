import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-2.5"
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );
}
