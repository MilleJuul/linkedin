import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  parseCsvContent,
  normaliseRows,
  contentHash,
  type ColumnMapping,
} from "@/lib/csv-parser";
import { recomputeWinningPatterns } from "@/lib/winning-patterns";

// ─── POST /api/import/hootsuite ───────────────────────────────────────────────
// Phase 1 (parse=true):  Parse CSV, return headers + preview + detected mapping
// Phase 2 (parse=false): Commit import with confirmed mapping
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 60; // seconds – allow large CSVs

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // ── Phase 1: Parse & preview ──────────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const phase = (formData.get("phase") as string) ?? "parse";

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil uploadet" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    if (phase === "parse") {
      const parsed = parseCsvContent(csvText);
      return NextResponse.json({
        headers: parsed.headers,
        detectedMapping: parsed.detectedMapping,
        preview: parsed.preview,
        totalRows: parsed.totalRows,
        filename: file.name,
        // Pass raw CSV back encoded so client can send it in phase 2
        csvContent: Buffer.from(csvText).toString("base64"),
      });
    }

    // ── Phase 2: Commit import ──────────────────────────────────────────────
    if (phase === "import") {
      const workspaceSlug = formData.get("workspaceSlug") as string;
      const mappingRaw = formData.get("mapping") as string;

      if (!workspaceSlug || !mappingRaw) {
        return NextResponse.json(
          { error: "Mangler workspaceSlug eller mapping" },
          { status: 400 }
        );
      }

      const mapping: ColumnMapping = JSON.parse(mappingRaw);

      const workspace = await prisma.workspace.findFirst({
        where: {
          slug: workspaceSlug,
          members: { some: { userId: session.user.id } },
        },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: "Workspace ikke fundet" },
          { status: 404 }
        );
      }

      const parsed = parseCsvContent(csvText);
      const rows = normaliseRows(parsed.rawData, mapping);

      // Filter out rows with no text or no date
      const validRows = rows.filter((r) => r.text.length > 5 && r.publishedAt);

      // Create import batch
      const batch = await prisma.importBatch.create({
        data: {
          workspaceId: workspace.id,
          uploadedByUserId: session.user.id,
          originalFilename: file.name,
          rowCount: rows.length,
          status: "PROCESSING",
        },
      });

      let importedCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];

      for (const row of validRows) {
        try {
          const hash = contentHash(row.text, row.publishedAt);

          // Derived metrics
          const impressions = row.impressions ?? null;
          const likes = row.likes ?? null;
          const comments = row.comments ?? null;
          const shares = row.shares ?? null;
          const clicks = row.clicks ?? null;

          let engagementRate: number | null = null;
          let ctr: number | null = null;

          if (impressions && impressions > 0) {
            const engActions =
              (likes ?? 0) + (comments ?? 0) + (shares ?? 0);
            engagementRate = engActions / impressions;
            if (clicks != null) {
              ctr = clicks / impressions;
            }
          }

          // Upsert ImportedPost
          const importedPost = await prisma.importedPost.upsert({
            where: { workspaceId_contentHash: { workspaceId: workspace.id, contentHash: hash } },
            create: {
              workspaceId: workspace.id,
              externalId: row.externalId,
              text: row.text,
              contentHash: hash,
              publishedAt: row.publishedAt!,
              isPartial: row.isPartial,
            },
            update: {
              // On re-import, update externalId if we now have it
              ...(row.externalId ? { externalId: row.externalId } : {}),
              isPartial: row.isPartial,
            },
          });

          // Always create a new snapshot (preserves history across imports)
          await prisma.postMetricSnapshot.create({
            data: {
              postId: importedPost.id,
              batchId: batch.id,
              impressions,
              likes,
              comments,
              shares,
              clicks,
              reach: row.reach,
              engagementRate,
              ctr,
              isPartial: row.isPartial,
            },
          });

          // Track new vs updated
          if (importedPost.createdAt.getTime() === importedPost.createdAt.getTime()) {
            importedCount++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Række fejl: ${msg}`);
          if (errors.length >= 10) break; // cap errors
        }
      }

      // Update batch status
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          importedCount: validRows.length,
          updatedCount,
          status: errors.length > 0 && importedCount === 0 ? "FAILED" :
                  errors.length > 0 ? "PARTIAL" : "DONE",
          errors: errors.length > 0 ? errors : null,
        },
      });

      // Recompute winning patterns async (don't await to keep response fast)
      recomputeWinningPatterns(workspace.id).catch(console.error);

      return NextResponse.json({
        success: true,
        batchId: batch.id,
        importedCount: validRows.length,
        skippedCount: rows.length - validRows.length,
        errorCount: errors.length,
        errors: errors.slice(0, 5),
      });
    }
  }

  return NextResponse.json({ error: "Ugyldig request" }, { status: 400 });
}

// ─── GET /api/import/hootsuite?workspaceSlug=xxx  ─────────────────────────────
// Returns import history for a workspace

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("workspaceSlug");
  if (!slug) {
    return NextResponse.json({ error: "Mangler workspaceSlug" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst({
    where: { slug, members: { some: { userId: session.user.id } } },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace ikke fundet" }, { status: 404 });
  }

  const batches = await prisma.importBatch.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { uploadedAt: "desc" },
    take: 20,
    include: {
      uploadedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ batches });
}
