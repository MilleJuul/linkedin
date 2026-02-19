import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });

  // Videos cannot be rendered as image thumbnails – return null so the UI
  // shows the video-icon placeholder instead of a broken image.
  const isVideo = file.type.startsWith("video/");
  return NextResponse.json({ url: blob.url, thumbnailUrl: isVideo ? null : blob.url });
}
