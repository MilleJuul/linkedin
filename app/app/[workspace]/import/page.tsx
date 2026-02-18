import { requireWorkspaceAccess } from "@/actions/workspace";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import ImportClient from "./import-client";
import { Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";

export const metadata = {
  title: "Data / Import | LinkedIn Content Planner",
};

const STATUS_MAP = {
  PROCESSING: { label: "Behandler…", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  DONE: { label: "Fuldført", icon: CheckCircle, color: "text-green-700 bg-green-50" },
  PARTIAL: { label: "Delvist importeret", icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
  FAILED: { label: "Fejlet", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

export default async function ImportPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  await requireWorkspaceAccess(workspaceSlug);

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  const batches = workspace
    ? await prisma.importBatch.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { uploadedAt: "desc" },
        take: 10,
        include: {
          uploadedBy: { select: { name: true, email: true } },
        },
      })
    : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Data / Import</h1>
        <p className="text-sm text-gray-500">
          Upload Hootsuite Analytics CSV for at importere dine publicerede posts og performance-data
        </p>
      </div>

      {/* Upload widget */}
      <ImportClient workspaceSlug={workspaceSlug} />

      {/* Import history */}
      {batches.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Importhistorik
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fil
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                    Posts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                    Uploadet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                    Af
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map((batch) => {
                  const s = STATUS_MAP[batch.status] ?? STATUS_MAP.DONE;
                  const Icon = s.icon;
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 font-medium truncate max-w-xs">
                            {batch.originalFilename}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${s.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {batch.importedCount}
                        <span className="text-gray-400 text-xs ml-1">
                          / {batch.rowCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(batch.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate">
                        {batch.uploadedBy.name ?? batch.uploadedBy.email}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
