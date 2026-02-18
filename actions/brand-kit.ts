"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandKitSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  return session.user.id;
}

export async function getBrandKit(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { brandKit: true },
  });
  return workspace?.brandKit ?? null;
}

export async function upsertBrandKit(workspaceSlug: string, formData: FormData) {
  await getCurrentUserId();

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return { success: false, error: "Workspace ikke fundet" };

  const parseWords = (raw: string | null): string[] =>
    raw
      ? raw
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean)
      : [];

  const parseExamples = (raw: FormDataEntryValue[]): string[] =>
    raw.map((v) => (v as string).trim()).filter(Boolean);

  const raw = {
    toneOfVoice: formData.get("toneOfVoice") as string || "",
    doWords: parseWords(formData.get("doWords") as string | null),
    dontWords: parseWords(formData.get("dontWords") as string | null),
    ctaStyle: formData.get("ctaStyle") as string || "",
    hashtagStyle: formData.get("hashtagStyle") as string || "",
    emojiPolicy: formData.get("emojiPolicy") as string || "",
    examples: parseExamples(formData.getAll("examples")),
  };

  const parsed = BrandKitSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const brandKit = await prisma.brandKit.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      ...parsed.data,
    },
    update: parsed.data,
  });

  revalidatePath(`/app/${workspaceSlug}/settings`);
  return { success: true, data: brandKit };
}
