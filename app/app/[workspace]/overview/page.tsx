import { getPostsThisWeek } from "@/actions/posts";
import { requireWorkspaceAccess } from "@/actions/workspace";
import { getAssetsForWorkspace } from "@/actions/assets";
import { getBrandKit } from "@/actions/brand-kit";
import { formatDateTime, POST_STATUS_LABELS, POST_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Calendar,
  FileText,
  BarChart2,
  Image as ImageIcon,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import OverviewClient from "./overview-client";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAccess(workspaceSlug);

  const [weekPosts, brandKit, assets] = await Promise.all([
    getPostsThisWeek(workspaceSlug),
    getBrandKit(workspaceSlug),
    getAssetsForWorkspace(workspaceSlug),
  ]);

  const DAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const postsOnDay = weekPosts.filter((p) => {
      if (!p.scheduledAt) return false;
      const pd = new Date(p.scheduledAt);
      return (
        pd.getDate() === d.getDate() &&
        pd.getMonth() === d.getMonth() &&
        pd.getFullYear() === d.getFullYear()
      );
    });
    return { day: DAYS[i], date: d, posts: postsOnDay };
  });

  const isToday = (d: Date) =>
    d.toDateString() === today.toDateString();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Overblik
        </h1>
        <p className="text-gray-500 text-sm">
          Velkommen til {workspace.name}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Calendar className="w-4 h-4" />}
          label="Planlagt denne uge"
          value={weekPosts.length}
          color="blue"
        />
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="I biblioteket"
          value={assets.length}
          color="purple"
        />
        <StatCard
          icon={<ImageIcon className="w-4 h-4" />}
          label="Brand kit"
          value={brandKit ? "Sat op" : "Mangler"}
          color="green"
          isText
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Platform"
          value="LinkedIn"
          color="orange"
          isText
        />
      </div>

      {/* This week calendar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Denne uge
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Planlagte posts for indeværende uge
            </p>
          </div>
          <Link
            href={`/app/${workspaceSlug}/prepared`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Se alle →
          </Link>
        </div>

        {weekPosts.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              Ingen planlagte posts denne uge
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Gå til &ldquo;Klargjorte posts&rdquo; for at planlægge indhold
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(({ day, date, posts }) => (
              <div
                key={day}
                className={cn(
                  "rounded-xl border p-2 min-h-[100px]",
                  isToday(date)
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-100 bg-gray-50"
                )}
              >
                <div className="mb-2">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      isToday(date) ? "text-blue-700" : "text-gray-500"
                    )}
                  >
                    {day}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold leading-none",
                      isToday(date) ? "text-blue-700" : "text-gray-700"
                    )}
                  >
                    {date.getDate()}
                  </p>
                </div>
                <div className="space-y-1">
                  {posts.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "text-xs px-1.5 py-1 rounded-md truncate font-medium",
                        POST_STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"
                      )}
                      title={p.title}
                    >
                      {p.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI section + Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Analyser data (placeholder) */}
        <OverviewClient workspaceSlug={workspaceSlug} />

        {/* Hurtige genveje */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Hurtig navigation
          </h2>
          <div className="space-y-2">
            {[
              {
                href: `prepared`,
                icon: <FileText className="w-4 h-4" />,
                label: "Klargjorte posts",
                desc: "Se og administrér alle posts",
              },
              {
                href: `library`,
                icon: <ImageIcon className="w-4 h-4" />,
                label: "Billedbibliotek",
                desc: "Upload og organiser assets",
              },
              {
                href: `settings`,
                icon: <Sparkles className="w-4 h-4" />,
                label: "Brand Kit",
                desc: "Tone of voice & guidelines",
              },
              {
                href: `insights`,
                icon: <BarChart2 className="w-4 h-4" />,
                label: "Indsigter",
                desc: "Performance & analytics",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={`/app/${workspaceSlug}/${item.href}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "purple" | "green" | "orange";
  isText?: boolean;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
          colors[color]
        )}
      >
        {icon}
      </div>
      <p className={cn("font-bold mb-0.5", isText ? "text-lg" : "text-2xl")}>
        {value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
