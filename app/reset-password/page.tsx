"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField, AuthShell } from "@/components/auth-form";
import { Button, FieldError } from "@/components/ui";
import { updatePasswordAction } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters."
      footer={
        <Link href="/login" className="font-medium text-blue-600">
          Back to sign in
        </Link>
      }
    >
      <form
        action={async (formData) => {
          const result = await updatePasswordAction(formData);
          if (result?.error) setError(result.error);
        }}
      >
        <AuthField label="New password" name="password" type="password" required />
        <AuthField label="Confirm password" name="confirmPassword" type="password" required />
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full">
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
