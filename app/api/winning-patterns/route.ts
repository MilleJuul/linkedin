import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWinningPatternSummary } from "@/lib/winning-patterns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("workspace");
  if (!slug) return NextResponse.json([]);

  const workspace = await prisma.workspace.findFirst({
    where: { slug, members: { some: { userId: session.user.id } } },
  });
  if (!workspace) return NextResponse.json([]);

  const patterns = await getWinningPatternSummary(workspace.id);
  return NextResponse.json(patterns);
}
