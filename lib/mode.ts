import { cookies } from "next/headers";
import { DEMO_COOKIE } from "./constants";

export function demoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function isDemoSession() {
  if (!demoModeEnabled()) return false;
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === "1";
}
