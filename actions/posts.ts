"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  CreatePostSchema,
  UpdatePostSchema,
  CreateCommentSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { PostStatus } from "@prisma/client";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  return session.user.id;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPostsForWorkspace(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return [];

  return prisma.post.findMany({
    where: { workspaceId: workspace.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      comments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPostById(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      comments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      auditEvents: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getPostsThisWeek(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return [];

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Mandag
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Søndag
  endOfWeek.setHours(23, 59, 59, 999);

  return prisma.post.findMany({
    where: {
      workspaceId: workspace.id,
      scheduledAt: { gte: startOfWeek, lte: endOfWeek },
      status: { in: ["SCHEDULED", "APPROVED", "PUBLISHED"] },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPost(workspaceSlug: string, formData: FormData) {
  const userId = await getCurrentUserId();

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return { success: false, error: "Workspace ikke fundet" };

  const raw = {
    title: formData.get("title"),
    hook: formData.get("hook") || "",
    bodyText: formData.get("bodyText") || "",
    cta: formData.get("cta") || "",
    hashtags: formData.getAll("hashtags").filter(Boolean) as string[],
    assetIds: formData.getAll("assetIds").filter(Boolean) as string[],
    scheduledAt: formData.get("scheduledAt") || undefined,
    status: (formData.get("status") as PostStatus) || "DRAFT",
  };

  const parsed = CreatePostSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const post = await prisma.post.create({
    data: {
      workspaceId: workspace.id,
      title: parsed.data.title,
      hook: parsed.data.hook,
      bodyText: parsed.data.bodyText,
      cta: parsed.data.cta,
      hashtags: parsed.data.hashtags,
      assetIds: parsed.data.assetIds,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      status: parsed.data.status,
      createdById: userId,
    },
  });

  await prisma.auditEvent.create({
    data: {
      entityType: "Post",
      entityId: post.id,
      action: "CREATED",
      userId,
      diffJson: { status: post.status },
    },
  });

  revalidatePath(`/app/${workspaceSlug}/prepared`);
  return { success: true, data: post };
}

export async function updatePost(
  postId: string,
  workspaceSlug: string,
  data: Record<string, unknown>
) {
  const userId = await getCurrentUserId();

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) return { success: false, error: "Post ikke fundet" };

  const parsed = UpdatePostSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedById: userId,
  };

  if (parsed.data.scheduledAt) {
    updateData.scheduledAt = new Date(parsed.data.scheduledAt);
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: updateData,
  });

  await prisma.auditEvent.create({
    data: {
      entityType: "Post",
      entityId: postId,
      action: "UPDATED",
      userId,
      diffJson: parsed.data,
    },
  });

  revalidatePath(`/app/${workspaceSlug}/prepared`);
  revalidatePath(`/app/${workspaceSlug}/overview`);
  return { success: true, data: post };
}

export async function updatePostStatus(
  postId: string,
  workspaceSlug: string,
  newStatus: PostStatus
) {
  const userId = await getCurrentUserId();

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) return { success: false, error: "Post ikke fundet" };

  const post = await prisma.post.update({
    where: { id: postId },
    data: { status: newStatus, updatedById: userId },
  });

  await prisma.auditEvent.create({
    data: {
      entityType: "Post",
      entityId: postId,
      action: "STATUS_CHANGED",
      userId,
      diffJson: { from: existing.status, to: newStatus },
    },
  });

  revalidatePath(`/app/${workspaceSlug}/prepared`);
  revalidatePath(`/app/${workspaceSlug}/overview`);
  revalidatePath(`/app/${workspaceSlug}/insights`);
  return { success: true, data: post };
}

export async function deletePost(postId: string, workspaceSlug: string) {
  const userId = await getCurrentUserId();

  await prisma.auditEvent.deleteMany({ where: { entityId: postId } });
  await prisma.comment.deleteMany({ where: { postId } });
  await prisma.post.delete({ where: { id: postId } });

  revalidatePath(`/app/${workspaceSlug}/prepared`);
  return { success: true };
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(postId: string, workspaceSlug: string, formData: FormData) {
  const userId = await getCurrentUserId();

  const raw = { body: formData.get("body") as string };
  const parsed = CreateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId,
      body: parsed.data.body,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  revalidatePath(`/app/${workspaceSlug}/prepared`);
  return { success: true, data: comment };
}

// ─── Weekly Plan ──────────────────────────────────────────────────────────────

export async function createPostsFromWeeklyPlan(
  workspaceSlug: string,
  drafts: {
    title: string;
    postIdea: string;
    suggestedDay: string;
    hook?: string;
    hashtags?: string[];
  }[]
) {
  const userId = await getCurrentUserId();

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace) return { success: false, error: "Workspace ikke fundet" };

  const posts = await Promise.all(
    drafts.map((draft) =>
      prisma.post.create({
        data: {
          workspaceId: workspace.id,
          title: draft.title,
          hook: draft.hook ?? "",
          bodyText: draft.postIdea,
          hashtags: draft.hashtags ?? [],
          scheduledAt: new Date(draft.suggestedDay),
          status: "DRAFT",
          createdById: userId,
        },
      })
    )
  );

  revalidatePath(`/app/${workspaceSlug}/prepared`);
  revalidatePath(`/app/${workspaceSlug}/overview`);
  return { success: true, data: posts };
}
