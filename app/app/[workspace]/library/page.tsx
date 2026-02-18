import { requireWorkspaceAccess } from "@/actions/workspace";
import { getAssetsForWorkspace } from "@/actions/assets";
import LibraryClient from "./library-client";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  await requireWorkspaceAccess(workspaceSlug);

  const assets = await getAssetsForWorkspace(workspaceSlug);

  // Collect all unique tags
  const allTags = Array.from(
    new Set(assets.flatMap((a) => a.tags))
  ).sort();

  return (
    <LibraryClient
      assets={assets}
      allTags={allTags}
      workspaceSlug={workspaceSlug}
    />
  );
}
