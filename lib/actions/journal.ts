"use server";

import { revalidatePath } from "next/cache";
import {
  addPlaybookImage,
  addTradeImage,
  createAccount,
  deleteAccount,
  deletePlaybook,
  deleteTrade,
  duplicatePlaybook,
  removePlaybookImage,
  savePlaybook,
  saveReview,
  saveTrade,
  updateAccount,
} from "@/lib/data/repository";
import type { TradeImageKind } from "@/lib/types";
import { accountSchema, reviewSchema, type PlaybookDraftInput, type ReviewInput } from "@/lib/validations";

function revalidateJournal() {
  revalidatePath("/app");
  revalidatePath("/app/journal");
  revalidatePath("/app/playbooks");
  revalidatePath("/app/profile");
  revalidatePath("/app/insights");
  revalidatePath("/app/reviews");
}

export async function saveAccountAction(id: string | null, formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    size: formData.get("size"),
    currency: formData.get("currency") || "USD",
    allowedRiskPct: formData.get("allowedRiskPct"),
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the account details" };
  }
  try {
    const account = id ? await updateAccount(id, parsed.data) : await createAccount(parsed.data);
    revalidateJournal();
    return { success: true, id: account.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save account" };
  }
}

export async function deleteAccountAction(id: string) {
  try {
    await deleteAccount(id);
    revalidateJournal();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete account" };
  }
}

export async function savePlaybookAction(id: string | null, input: PlaybookDraftInput) {
  try {
    const playbook = await savePlaybook(id, input);
    revalidateJournal();
    return { success: true, id: playbook.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save playbook" };
  }
}

export async function deletePlaybookAction(id: string) {
  try {
    await deletePlaybook(id);
    revalidateJournal();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete playbook" };
  }
}

export async function duplicatePlaybookAction(id: string) {
  try {
    const playbook = await duplicatePlaybook(id);
    revalidateJournal();
    return { success: true, id: playbook.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not duplicate playbook" };
  }
}

export async function addPlaybookImageAction(playbookId: string, storagePath: string) {
  try {
    const image = await addPlaybookImage(playbookId, storagePath);
    revalidateJournal();
    return { success: true, id: image.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add image" };
  }
}

export async function uploadPlaybookImageAction(playbookId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose an image file" };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;

    if (!(await (await import("@/lib/mode")).isDemoSession())) {
      const { currentUser } = await import("@/lib/data/repository");
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const { supabaseConfigured } = await import("@/lib/supabase/env");
      if (supabaseConfigured()) {
        const user = await currentUser();
        if (!user) return { error: "Sign in to upload evidence" };
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/${playbookId}/${crypto.randomUUID()}.${ext}`;
        const supabase = await createServerSupabase();
        const { error } = await supabase.storage.from("playbook-evidence").upload(path, buffer, {
          contentType: file.type || "image/png",
          upsert: false,
        });
        if (error) return { error: error.message };
        const image = await addPlaybookImage(playbookId, path);
        revalidateJournal();
        return { success: true, id: image.id, path };
      }
    }

    const image = await addPlaybookImage(playbookId, dataUrl);
    revalidateJournal();
    return { success: true, id: image.id, path: dataUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload image" };
  }
}

export async function removePlaybookImageAction(imageId: string, playbookId: string) {
  try {
    await removePlaybookImage(imageId, playbookId);
    revalidateJournal();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not remove image" };
  }
}

export async function saveTradeAction(id: string | null, raw: unknown) {
  try {
    const trade = await saveTrade(id, raw);
    revalidateJournal();
    return { success: true, id: trade.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save trade" };
  }
}

export async function saveReviewAction(input: ReviewInput) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the review" };
  }
  try {
    await saveReview(parsed.data);
    revalidateJournal();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save review" };
  }
}

export async function uploadTradeImageAction(tradeId: string, kind: TradeImageKind, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose an image file" };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
    const { isDemoSession } = await import("@/lib/mode");
    if (!(await isDemoSession())) {
      const { currentUser } = await import("@/lib/data/repository");
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const { supabaseConfigured } = await import("@/lib/supabase/env");
      if (supabaseConfigured()) {
        const user = await currentUser();
        if (!user) return { error: "Sign in to upload evidence" };
        const ext = file.name.split(".").pop() || "png";
        const bucket = kind === "closing" ? "closing-evidence" : "trade-images";
        const path = `${user.id}/${tradeId}/${crypto.randomUUID()}.${ext}`;
        const supabase = await createServerSupabase();
        const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
          contentType: file.type || "image/png",
          upsert: kind === "closing",
        });
        if (error) return { error: error.message };
        const image = await addTradeImage(tradeId, kind, path);
        revalidateJournal();
        return { success: true, id: image.id, path };
      }
    }
    const image = await addTradeImage(tradeId, kind, dataUrl);
    revalidateJournal();
    return { success: true, id: image.id, path: dataUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload image" };
  }
}

export async function deleteTradeAction(id: string) {
  try {
    await deleteTrade(id);
    revalidateJournal();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete trade" };
  }
}
