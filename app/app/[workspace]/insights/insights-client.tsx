"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

type SortKey = "publishedAt" | "impressions" | "engagementRate" | "likes" | "comments";

interface Row {
  id: string;
  text: string;
  publishedAt: Date;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  engagementRate: number | null;
  ctr: number | null;
  isPartial: boolean;
}

export default function InsightsClient({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("engagementRate");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    if (av instanceof Date && bv instanceof Date) {
      return sortDir === "desc"
        ? bv.getTime() - av.getTime()
        : av.getTime() - bv.getTime();
    }
    const an = typeof av === "number" ? av : new Date(av as string).getTime();
    const bn = typeof bv === "number" ? bv : new Date(bv as string).getTime();
    return sortDir === "desc" ? bn - an : an - bn;
  });

  function SortHeader({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition group"
      >
        {label}
        <span className="text-gray-300 group-hover:text-gray-400">
          {active ? (
            sortDir === "desc" ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-40" />
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Post-performance</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Klik på en række for at se post-tekst
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Sortér efter:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="engagementRate">Engagement rate</option>
            <option value="impressions">Visninger</option>
            <option value="likes">Likes</option>
            <option value="comments">Kommentarer</option>
            <option value="publishedAt">Dato</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left w-auto">
                <SortHeader col="publishedAt" label="Dato" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Opslag
                </span>
              </th>
              <th className="px-4 py-3 text-right w-24">
                <div className="flex justify-end">
                  <SortHeader col="impressions" label="Visn." />
                </div>
              </th>
              <th className="px-4 py-3 text-right w-20">
                <div className="flex justify-end">
                  <SortHeader col="likes" label="Likes" />
                </div>
              </th>
              <th className="px-4 py-3 text-right w-20">
                <div className="flex justify-end">
                  <SortHeader col="comments" label="Komm." />
                </div>
              </th>
              <th className="px-4 py-3 text-right w-28">
                <div className="flex justify-end">
                  <SortHeader col="engagementRate" label="Eng. rate" />
                </div>
              </th>
              <th className="px-4 py-3 text-right w-20">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  CTR
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row) => {
              const engPct = row.engagementRate != null
                ? (row.engagementRate * 100).toFixed(2)
                : null;
              const ctrPct = row.ctr != null
                ? (row.ctr * 100).toFixed(2)
                : null;
              const engVal = engPct ? parseFloat(engPct) : 0;
              const isExpanded = expandedId === row.id;

              return [
                <tr
                  key={row.id}
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(row.publishedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {row.isPartial && (
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" title="Delvist data" />
                      )}
                      <p className="text-sm text-gray-800 line-clamp-2 max-w-sm">
                        {row.text}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    {row.impressions?.toLocaleString("da-DK") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {row.likes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {row.comments ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {engPct ? (
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          engVal >= 3
                            ? "text-green-700 bg-green-50"
                            : engVal >= 1.5
                            ? "text-yellow-700 bg-yellow-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        {engPct}%
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {ctrPct ? `${ctrPct}%` : "—"}
                  </td>
                </tr>,
                isExpanded && (
                  <tr key={`${row.id}-expand`} className="bg-blue-50">
                    <td colSpan={7} className="px-4 py-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Full tekst
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-w-2xl">
                        {row.text}
                      </p>
                      <div className="mt-3 flex gap-4 text-xs text-gray-500">
                        {row.shares != null && <span>Delinger: <strong>{row.shares}</strong></span>}
                        {row.clicks != null && <span>Klik: <strong>{row.clicks}</strong></span>}
                        {row.isPartial && (
                          <span className="text-orange-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Delvist data – nogle kolonner manglede i CSV
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            Ingen posts at vise
          </div>
        )}
      </div>
    </div>
  );
}
