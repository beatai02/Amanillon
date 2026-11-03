"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE } from "@/lib/constants";
import { demoModeEnabled } from "@/lib/mode";
import { resetDemoState } from "@/lib/data/demo-store";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { authSchema, resetPasswordSchema, resetRequestSchema, signupSchema } from "@/lib/validations";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInAction(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }
  if (!supabaseConfigured()) {
    return { error: "Supabase is not configured. Use demo mode or add env vars." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/app");
}

export async function signUpAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }
  if (!supabaseConfigured()) {
    return { error: "Supabase is not configured. Use demo mode or add env vars." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  return { success: "Check your email to confirm the account, then sign in." };
}

export async function requestResetAction(formData: FormData) {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  }
  if (!supabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: "If that inbox exists, a reset link is on the way." };
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your passwords" };
  }
  if (!supabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/app");
}

export async function signOutAction() {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  if (supabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function enterDemoAction() {
  if (!demoModeEnabled()) {
    return { error: "Demo mode is turned off." };
  }
  resetDemoState();
  const store = await cookies();
  store.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/app");
}
