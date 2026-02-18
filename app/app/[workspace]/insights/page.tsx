import { requireWorkspaceAccess } from "@/actions/workspace";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { BarChart2, TrendingUp, Eye, Heart, MessageCircle, MousePointerClick, Upload, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import InsightsClient from "./insights-client";
import Link from "next/link";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  await requireWorkspaceAccess(workspaceSlug);

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) return null;

  // ── Fetch posts + latest snapshot ────────────────────────────────────────
  const importedPosts = await prisma.importedPost.findMany({
    where: { workspaceId: workspace.id },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  const hasData = importedPosts.length > 0;

  // ── Build rows with latest snapshot ──────────────────────────────────────
  const rows = importedPosts
    .map((post) => {
      const snap = post.snapshots[0] ?? null;
      return {
        id: post.id,
        text: post.text,
        publishedAt: post.publishedAt,
        impressions: snap?.impressions ?? null,
        likes: snap?.likes ?? null,
        comments: snap?.comments ?? null,
        shares: snap?.shares ?? null,
        clicks: snap?.clicks ?? null,
        engagementRate: snap?.engagementRate ?? null,
        ctr: snap?.ctr ?? null,
        isPartial: post.isPartial,
      };
    });

  // ── Aggregate KPIs ────────────────────────────────────────────────────────
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalLikes = rows.reduce((s, r) => s + (r.likes ?? 0), 0);
  const totalComments = rows.reduce((s, r) => s + (r.comments ?? 0), 0);
  const totalShares = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);

  const rowsWithEng = rows.filter((r) => r.engagementRate !== null);
  const avgEngRate = rowsWithEng.length > 0
    ? rowsWithEng.reduce((s, r) => s + r.engagementRate!, 0) / rowsWithEng.length
    : null;

  const rowsWithCtr = rows.filter((r) => r.ctr !== null);
  const avgCtr = rowsWithCtr.length > 0
    ? rowsWithCtr.reduce((s, r) => s + r.ctr!, 0) / rowsWithCtr.length
    : null;

  // ── Delta vs. previous half period ───────────────────────────────────────
  // Split posts into two halves by publishedAt to compute delta
  let deltaImpressions: number | null = null;
  let deltaEngRate: number | null = null;

  if (rows.length >= 4) {
    const sorted = [...rows].sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    );
    const half = Math.floor(sorted.length / 2);
    const prev = sorted.slice(0, half);
    const curr = sorted.slice(half);

    const prevImpr = prev.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const currImpr = curr.reduce((s, r) => s + (r.impressions ?? 0), 0);
    if (prevImpr > 0) {
      deltaImpressions = (currImpr - prevImpr) / prevImpr;
    }

    const prevEng = prev.filter((r) => r.engagementRate !== null);
    const currEng = curr.filter((r) => r.engagementRate !== null);
    if (prevEng.length > 0 && currEng.length > 0) {
      const pe = prevEng.reduce((s, r) => s + r.engagementRate!, 0) / prevEng.length;
      const ce = currEng.reduce((s, r) => s + r.engagementRate!, 0) / currEng.length;
      if (pe > 0) deltaEngRate = (ce - pe) / pe;
    }
  }

  // ── Winning patterns ────────────────────────────────────────────────────
  const patterns = await prisma.winningPattern.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { avgEngRate: "desc" },
    take: 3,
  });

  const HOOK_LABELS: Record<string, string> = {
    number_list: "Nummereret liste",
    question: "Spørgsmål som hook",
    most_people: "'De fleste…'-format",
    we_tested: "'Vi testede X'",
    bold_statement: "Bold statement",
    result_first: "Resultat-først",
    mistake: "Fejlhistorie",
    other: "Andet",
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Indsigter</h1>
          <p className="text-sm text-gray-500">
            Performance-overblik baseret på importerede Hootsuite-data
            {hasData && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {importedPosts.length} importerede posts
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/app/${workspaceSlug}/import`}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Upload className="w-4 h-4" />
          Upload CSV
        </Link>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-700 mb-2">
            Ingen importerede data endnu
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            Upload en Hootsuite Analytics CSV-fil for at se dit indholds performance her.
          </p>
          <Link
            href={`/app/${workspaceSlug}/import`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            Gå til Import
          </Link>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <KpiCard
              icon={<Eye className="w-4 h-4" />}
              label="Samlede visninger"
              value={totalImpressions.toLocaleString("da-DK")}
              delta={deltaImpressions}
              color="blue"
            />
            <KpiCard
              icon={<Heart className="w-4 h-4" />}
              label="Reaktioner"
              value={totalLikes.toLocaleString("da-DK")}
              color="red"
            />
            <KpiCard
              icon={<MessageCircle className="w-4 h-4" />}
              label="Kommentarer"
              value={totalComments.toLocaleString("da-DK")}
              color="green"
            />
            <KpiCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Gns. engagement"
              value={avgEngRate != null ? `${(avgEngRate * 100).toFixed(2)}%` : "—"}
              delta={deltaEngRate}
              color="purple"
            />
            <KpiCard
              icon={<MousePointerClick className="w-4 h-4" />}
              label="Gns. CTR"
              value={avgCtr != null ? `${(avgCtr * 100).toFixed(2)}%` : "—"}
              color="orange"
            />
          </div>

          {/* Winning patterns */}
          {patterns.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                🏆 Winning patterns
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Disse post-formater performer bedst i dit workspace – AI-generatoren bruger dem som reference
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {patterns.map((p) => {
                  const feat = p.features as Record<string, unknown>;
                  return (
                    <div key={p.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        {HOOK_LABELS[p.hookType] ?? p.hookType}
                      </p>
                      <p className="text-lg font-bold text-blue-700 mb-2">
                        {(p.avgEngRate * 100).toFixed(2)}%
                        <span className="text-xs font-normal text-gray-400 ml-1">eng. rate</span>
                      </p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>~{Math.round(Number(feat.avgLengthWords ?? 0))} ord</p>
                        <p>{Math.round(Number(feat.avgBullets ?? 0))} bullets i snit</p>
                        <p>{p.postCount} posts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Post table – client for sorting */}
          <InsightsClient rows={rows} />

          <div className="mt-4 px-2">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Data fra sidst uploadede Hootsuite CSV-rapport
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const pct = (delta * 100).toFixed(1);
  if (delta > 0.005) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
        <ArrowUpRight className="w-3 h-3" />+{pct}%
      </span>
    );
  }
  if (delta < -0.005) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
        <ArrowDownRight className="w-3 h-3" />{pct}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400 font-medium">
      <Minus className="w-3 h-3" />Uændret
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
  color: "blue" | "red" | "green" | "purple" | "orange";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-500",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-500",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {delta !== undefined && <DeltaBadge delta={delta ?? null} />}
    </div>
  );
}
