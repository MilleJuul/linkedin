"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateWorkspaceSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getWorkspacesForUser() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceBySlug(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.workspace.findFirst({
    where: {
      slug,
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      brandKit: true,
    },
  });
}

export async function createWorkspace(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");

  const raw = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string || slugify(formData.get("name") as string || ""),
  };

  const parsed = CreateWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const existing = await prisma.workspace.findUnique({
    where: { slug: parsed.data.slug },
  });

  if (existing) {
    return { success: false, error: "Dette slug er allerede i brug" };
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      members: {
        create: {
          userId: session.user.id,
          role: "ADMIN",
        },
      },
    },
  });

  revalidatePath("/");
  redirect(`/app/${workspace.slug}/overview`);
}

export async function requireWorkspaceAccess(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!workspace) {
    redirect("/");
  }

  return {
    workspace,
    userId: session.user.id,
    role: workspace.members[0]?.role ?? "EDITOR",
  };
}
