"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField, AuthShell } from "@/components/auth-form";
import { Button, FieldError } from "@/components/ui";
import { signInAction } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/config";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <AuthShell
      title={`Sign in to ${APP_NAME}`}
      subtitle="Use the email and password for your journal."
      demoEnabled={demoEnabled}
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-blue-600">
            Create an account
          </Link>
        </>
      }
    >
      <form
        action={async (formData) => {
          const result = await signInAction(formData);
          if (result?.error) setError(result.error);
        }}
      >
        <AuthField label="Email" name="email" type="email" autoComplete="email" required />
        <AuthField label="Password" name="password" type="password" autoComplete="current-password" required />
        <div className="mb-4 text-right">
          <Link href="/forgot-password" className="text-xs text-blue-600">
            Forgot password?
          </Link>
        </div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
