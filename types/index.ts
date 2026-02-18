import {
  User,
  Workspace,
  WorkspaceMember,
  BrandKit,
  Asset,
  Post,
  Comment,
  AuditEvent,
  Role,
  PostStatus,
  Platform,
  AssetType,
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Workspace,
  WorkspaceMember,
  BrandKit,
  Asset,
  Post,
  Comment,
  AuditEvent,
  Role,
  PostStatus,
  Platform,
  AssetType,
};

// ─── Extended Types ────────────────────────────────────────────────────────────

export type PostWithRelations = Post & {
  createdBy: Pick<User, "id" | "name" | "email">;
  updatedBy?: Pick<User, "id" | "name" | "email"> | null;
  comments: (Comment & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

export type WorkspaceWithMembers = Workspace & {
  members: (WorkspaceMember & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

export type AssetWithWorkspace = Asset & {
  workspace: Pick<Workspace, "id" | "name" | "slug">;
};

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type KanbanColumn = {
  status: PostStatus;
  label: string;
  posts: PostWithRelations[];
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Session User ─────────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

declare module "next-auth" {
  interface Session {
    user: SessionUser & {
      image?: string | null;
    };
  }
}
