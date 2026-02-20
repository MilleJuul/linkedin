import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil modtaget" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Filtype ikke tilladt. Brug PNG, JPG, GIF, MP4 eller MOV." },
      { status: 400 }
    );
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Filen er for stor. Maks 50 MB." },
      { status: 400 }
    );
  }

  const isVideo = file.type.startsWith("video/");

  // --- Vercel Blob (production) ---
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({
      url: blob.url,
      thumbnailUrl: isVideo ? null : blob.url,
    });
  }

  // --- Local fallback (development without Vercel Blob token) ---
  const suffix = randomBytes(6).toString("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${suffix}-${safeName}`;
  const uploadsDir = join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadsDir, filename), buffer);

  const url = `/uploads/${filename}`;
  return NextResponse.json({ url, thumbnailUrl: isVideo ? null : url });
}
