import { requireWorkspaceAccess } from "@/actions/workspace";
import { getAssetsForWorkspace } from "@/actions/assets";
import { getContentSourcesForWorkspace } from "@/actions/content-sources";
import LibraryClient from "./library-client";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  await requireWorkspaceAccess(workspaceSlug);

  const [assets, contentSources] = await Promise.all([
    getAssetsForWorkspace(workspaceSlug),
    getContentSourcesForWorkspace(workspaceSlug),
  ]);

  const allTags = Array.from(
    new Set(assets.flatMap((a) => a.tags))
  ).sort();

  return (
    <LibraryClient
      assets={assets}
      allTags={allTags}
      contentSources={contentSources}
      workspaceSlug={workspaceSlug}
    />
  );
}
