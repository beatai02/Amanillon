"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { enterDemoAction } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/config";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  demoEnabled = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  demoEnabled?: boolean;
}) {
  const [demoError, setDemoError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo />
          <h1 className="mt-6 font-[family-name:var(--font-geist-sans)] text-2xl font-semibold text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
        {demoEnabled ? (
          <form
            className="mt-4"
            action={async () => {
              const result = await enterDemoAction();
              if (result?.error) setDemoError(result.error);
            }}
          >
            <Button variant="secondary" type="submit" className="w-full">
              Open demo journal
            </Button>
            <FieldError message={demoError ?? undefined} />
          </form>
        ) : null}
        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        <p className="mt-6 text-center text-xs text-slate-400">
          {APP_NAME} keeps each journal private to the signed-in trader.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-slate-400 hover:text-slate-600">
            Back to home
          </Link>
        </p>
      </Card>
    </div>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} required={required} />
    </div>
  );
}
