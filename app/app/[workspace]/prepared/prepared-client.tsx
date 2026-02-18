"use client";

import { useState } from "react";
import { Post, Asset, User, Comment } from "@prisma/client";
import { PostStatus } from "@prisma/client";
import KanbanColumn from "@/components/KanbanColumn";
import Modal from "@/components/ui/Modal";
import PostEditor from "@/components/PostEditor";
import Button from "@/components/ui/Button";
import CreatePostModal from "@/components/CreatePostModal";
import WeeklyPlanModal from "@/components/WeeklyPlanModal";
import { Plus, Wand2, LayoutList, Columns } from "lucide-react";
import { POST_STATUS_LABELS, POST_STATUS_COLORS, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

type PostWithRelations = Post & {
  createdBy: Pick<User, "id" | "name" | "email">;
  updatedBy?: Pick<User, "id" | "name" | "email"> | null;
  comments: (Comment & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

interface PreparedClientProps {
  initialColumns: { status: PostStatus; posts: PostWithRelations[] }[];
  allAssets: Asset[];
  workspaceSlug: string;
}

export default function PreparedClient({
  initialColumns,
  allAssets,
  workspaceSlug,
}: PreparedClientProps) {
  const [selectedPost, setSelectedPost] = useState<PostWithRelations | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const totalPosts = initialColumns.reduce((sum, col) => sum + col.posts.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Klargjorte posts</h1>
            <p className="text-sm text-gray-400 mt-0.5">{totalPosts} posts i alt</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                  view === "kanban"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Columns className="w-3.5 h-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                  view === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Liste
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeeklyModal(true)}
            >
              <Wand2 className="w-4 h-4" />
              Ugeplan
            </Button>

            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              Nyt opslag
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {totalPosts === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Ingen posts endnu
            </h3>
            <p className="text-sm text-gray-500 mb-5 max-w-xs">
              Opret dit første LinkedIn-opslag eller generér en ugeplan med AI.
            </p>
            <div className="flex items-center gap-2 justify-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowWeeklyModal(true)}
              >
                <Wand2 className="w-4 h-4" />
                Generér ugeplan
              </Button>
              <Button size="md" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" />
                Nyt opslag
              </Button>
            </div>
          </div>
        </div>
      ) : view === "kanban" ? (
        /* Kanban view */
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 min-w-max h-full">
            {initialColumns.map(({ status, posts }) => (
              <KanbanColumn
                key={status}
                status={status}
                posts={posts}
                assets={allAssets}
                onPostClick={(post) => setSelectedPost(post as PostWithRelations)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Titel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                    Planlagt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
                    Kommentarer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {initialColumns.flatMap(({ posts }) =>
                  posts.map((post) => (
                    <tr
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {post.title}
                        </p>
                        {post.hook && (
                          <p className="text-xs text-gray-400 truncate max-w-sm mt-0.5">
                            {post.hook}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(post.scheduledAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {post.comments.length > 0 ? (
                          <span>{post.comments.length} kommentarer</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post editor modal */}
      <Modal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        size="2xl"
      >
        {selectedPost && (
          <PostEditor
            post={selectedPost}
            workspaceSlug={workspaceSlug}
            allAssets={allAssets}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </Modal>

      {/* Create post modal */}
      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        workspaceSlug={workspaceSlug}
      />

      {/* Weekly plan modal */}
      <WeeklyPlanModal
        open={showWeeklyModal}
        onClose={() => setShowWeeklyModal(false)}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
