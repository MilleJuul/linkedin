"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  return session.user.id;
}

export async function getContentSourcesForWorkspace(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) return [];

  return prisma.contentSource.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteContentSource(id: string, workspaceSlug: string) {
  await getCurrentUserId();
  await prisma.contentSource.delete({ where: { id } });
  revalidatePath(`/app/${workspaceSlug}/library`);
  return { success: true };
}

export async function getContentSourceText(id: string): Promise<string | null> {
  await getCurrentUserId();
  const source = await prisma.contentSource.findUnique({ where: { id } });
  return source?.extractedText ?? null;
}
