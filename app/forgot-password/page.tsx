"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField, AuthShell } from "@/components/auth-form";
import { Button, FieldError } from "@/components/ui";
import { requestResetAction } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email a link if the address is registered."
      footer={
        <Link href="/login" className="font-medium text-blue-600">
          Back to sign in
        </Link>
      }
    >
      <form
        action={async (formData) => {
          const result = await requestResetAction(formData);
          setError(result.error ?? null);
          setSuccess(result.success ?? null);
        }}
      >
        <AuthField label="Email" name="email" type="email" required />
        <FieldError message={error ?? undefined} />
        {success ? <p className="mb-3 text-sm text-emerald-600">{success}</p> : null}
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
