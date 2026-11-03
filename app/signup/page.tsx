"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField, AuthShell } from "@/components/auth-form";
import { Button, FieldError } from "@/components/ui";
import { signUpAction } from "@/lib/actions/auth";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <AuthShell
      title="Create your journal"
      subtitle="Open email sign-up. Confirm the inbox before the first sign-in."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600">
            Sign in
          </Link>
        </>
      }
    >
      <form
        action={async (formData) => {
          const result = await signUpAction(formData);
          setError(result.error ?? null);
          setSuccess(result.success ?? null);
        }}
      >
        <AuthField label="Display name" name="displayName" required />
        <AuthField label="Email" name="email" type="email" autoComplete="email" required />
        <AuthField label="Password" name="password" type="password" autoComplete="new-password" required />
        <FieldError message={error ?? undefined} />
        {success ? <p className="mb-3 text-sm text-emerald-600">{success}</p> : null}
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
