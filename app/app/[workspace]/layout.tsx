import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { workspace: workspaceSlug } = await params;

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug: workspaceSlug,
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

  const allWorkspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        allWorkspaces={allWorkspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug }))}
        user={{ name: session.user.name ?? null, email: session.user.email ?? "" }}
        userRole={workspace.members[0]?.role ?? "EDITOR"}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
