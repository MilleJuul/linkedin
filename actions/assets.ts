"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateAssetSchema, UpdateAssetSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  return session.user.id;
}

export async function getAssetsForWorkspace(
  workspaceSlug: string,
  options?: {
    type?: "IMAGE" | "VIDEO";
    tags?: string[];
    search?: string;
  }
) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return [];

  const where: Record<string, unknown> = { workspaceId: workspace.id };

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.tags && options.tags.length > 0) {
    where.tags = { hasSome: options.tags };
  }

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Client-side search filter (simpel)
  if (options?.search) {
    const q = options.search.toLowerCase();
    return assets.filter(
      (a) =>
        a.filename.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return assets;
}

export async function getAssetById(assetId: string) {
  return prisma.asset.findUnique({ where: { id: assetId } });
}

export async function getAssetsByIds(assetIds: string[]) {
  if (assetIds.length === 0) return [];
  return prisma.asset.findMany({
    where: { id: { in: assetIds } },
  });
}

export async function createAsset(workspaceSlug: string, formData: FormData) {
  await getCurrentUserId();

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return { success: false, error: "Workspace ikke fundet" };

  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const raw = {
    filename: formData.get("filename") as string,
    url: formData.get("url") as string,
    thumbnailUrl: formData.get("thumbnailUrl") as string | null,
    type: (formData.get("type") as "IMAGE" | "VIDEO") || "IMAGE",
    tags,
  };

  const parsed = CreateAssetSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const asset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      filename: parsed.data.filename,
      url: parsed.data.url,
      thumbnailUrl: parsed.data.thumbnailUrl,
      type: parsed.data.type,
      tags: parsed.data.tags,
    },
  });

  revalidatePath(`/app/${workspaceSlug}/library`);
  return { success: true, data: asset };
}

export async function updateAsset(
  assetId: string,
  workspaceSlug: string,
  data: { filename?: string; tags?: string[] }
) {
  await getCurrentUserId();

  const parsed = UpdateAssetSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: parsed.data,
  });

  revalidatePath(`/app/${workspaceSlug}/library`);
  return { success: true, data: asset };
}

export async function deleteAsset(assetId: string, workspaceSlug: string) {
  await getCurrentUserId();

  await prisma.asset.delete({ where: { id: assetId } });

  revalidatePath(`/app/${workspaceSlug}/library`);
  return { success: true };
}
