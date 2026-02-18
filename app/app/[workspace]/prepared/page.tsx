import { getPostsForWorkspace } from "@/actions/posts";
import { getAssetsForWorkspace } from "@/actions/assets";
import { requireWorkspaceAccess } from "@/actions/workspace";
import { PostStatus } from "@prisma/client";
import PreparedClient from "./prepared-client";

const KANBAN_ORDER: PostStatus[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function PreparedPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  await requireWorkspaceAccess(workspaceSlug);

  const [posts, assets] = await Promise.all([
    getPostsForWorkspace(workspaceSlug),
    getAssetsForWorkspace(workspaceSlug),
  ]);

  // Group by status
  const columns = KANBAN_ORDER.map((status) => ({
    status,
    posts: posts.filter((p) => p.status === status),
  }));

  return (
    <PreparedClient
      initialColumns={columns}
      allAssets={assets}
      workspaceSlug={workspaceSlug}
    />
  );
}
