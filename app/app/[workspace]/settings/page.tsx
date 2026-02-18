import { requireWorkspaceAccess } from "@/actions/workspace";
import { getBrandKit } from "@/actions/brand-kit";
import SettingsClient from "./settings-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);

  const brandKit = await getBrandKit(workspaceSlug);

  return (
    <SettingsClient
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
      brandKit={brandKit}
      workspaceSlug={workspaceSlug}
    />
  );
}
