import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
};

async function extractText(file: File, fileType: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileType === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text;
  }

  // txt / md / csv → read as UTF-8
  return buffer.toString("utf-8");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const workspaceSlug = formData.get("workspaceSlug") as string | null;
  const title = (formData.get("title") as string | null) || "";
  const tagsRaw = (formData.get("tags") as string | null) || "";

  if (!file) {
    return NextResponse.json({ error: "Ingen fil modtaget" }, { status: 400 });
  }
  if (!workspaceSlug) {
    return NextResponse.json({ error: "Mangler workspaceSlug" }, { status: 400 });
  }

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Filtype ikke understøttet. Brug PDF, TXT eller MD." },
      { status: 400 }
    );
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Filen er for stor. Maks 20 MB." }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace ikke fundet" }, { status: 404 });
  }

  const extractedText = await extractText(file, fileType);

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const source = await prisma.contentSource.create({
    data: {
      workspaceId: workspace.id,
      title: title || file.name,
      filename: file.name,
      fileType,
      extractedText,
      tags,
    },
  });

  return NextResponse.json({ success: true, id: source.id });
}
