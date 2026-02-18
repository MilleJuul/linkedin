import { requireWorkspaceAccess } from "@/actions/workspace";
import { getPostsForWorkspace } from "@/actions/posts";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { BarChart2, TrendingUp, Eye, Heart, MessageCircle, ArrowUpRight } from "lucide-react";

// Dummy performance data – i produktion: hent fra LinkedIn API
function getMockPerformance(postId: string) {
  const seed = postId.charCodeAt(0) + postId.charCodeAt(2);
  return {
    impressions: Math.floor((seed * 137) % 8000) + 200,
    likes: Math.floor((seed * 37) % 300) + 5,
    comments: Math.floor((seed * 13) % 50),
    shares: Math.floor((seed * 7) % 30),
    ctr: ((seed % 40) / 10 + 0.5).toFixed(1) + "%",
  };
}

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  await requireWorkspaceAccess(workspaceSlug);

  const posts = await getPostsForWorkspace(workspaceSlug);

  const publishedPosts = posts.filter(
    (p) => p.status === "PUBLISHED" || p.status === "ARCHIVED"
  );

  // Aggregate dummy stats
  const totalImpressions = publishedPosts.reduce(
    (sum, p) => sum + getMockPerformance(p.id).impressions,
    0
  );
  const totalLikes = publishedPosts.reduce(
    (sum, p) => sum + getMockPerformance(p.id).likes,
    0
  );
  const totalComments = publishedPosts.reduce(
    (sum, p) => sum + getMockPerformance(p.id).comments,
    0
  );
  const avgEngagement =
    publishedPosts.length > 0
      ? ((totalLikes + totalComments) / totalImpressions * 100).toFixed(2)
      : "0.00";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Indsigter</h1>
        <p className="text-sm text-gray-500">
          Performance-overblik for dit LinkedIn-indhold
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            Demo-data
          </span>
        </p>
      </div>

      {publishedPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-700 mb-2">
            Ingen indsigter endnu
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Publicér dine posts for at se performance-data her. I MVP vises
            demo-data – tilslut LinkedIn API for rigtige tal.
          </p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard
              icon={<Eye className="w-4 h-4" />}
              label="Samlede visninger"
              value={totalImpressions.toLocaleString("da-DK")}
              trend="+12% vs. forrige periode"
              color="blue"
            />
            <KpiCard
              icon={<Heart className="w-4 h-4" />}
              label="Reaktioner"
              value={totalLikes.toLocaleString("da-DK")}
              trend="+8% vs. forrige periode"
              color="red"
            />
            <KpiCard
              icon={<MessageCircle className="w-4 h-4" />}
              label="Kommentarer"
              value={totalComments.toLocaleString("da-DK")}
              trend="+23% vs. forrige periode"
              color="green"
            />
            <KpiCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Gns. engagement"
              value={`${avgEngagement}%`}
              trend="Branche-gns: 1.5%"
              color="purple"
            />
          </div>

          {/* Posts table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                Post-performance
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Klik på et opslag for at se detaljer (demo-data)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Opslag
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
                      Planlagt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                      Visninger
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                      Likes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                      Komm.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {publishedPosts.map((post) => {
                    const perf = getMockPerformance(post.id);
                    const engRate = (
                      ((perf.likes + perf.comments) / perf.impressions) *
                      100
                    ).toFixed(2);
                    return (
                      <tr
                        key={post.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                            {post.hook || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={post.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(post.scheduledAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          {perf.impressions.toLocaleString("da-DK")}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {perf.likes}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {perf.comments}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-xs font-semibold ${
                              parseFloat(engRate) >= 2
                                ? "text-green-600"
                                : parseFloat(engRate) >= 1
                                ? "text-yellow-600"
                                : "text-red-500"
                            }`}
                          >
                            {engRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Tilslut LinkedIn API i produktion for rigtige performancetal
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  color: "blue" | "red" | "green" | "purple";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-500",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xs text-green-600 font-medium">{trend}</p>
    </div>
  );
}
