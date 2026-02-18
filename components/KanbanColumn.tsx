"use client";

import { Post, User, Asset } from "@prisma/client";
import PostCard from "./PostCard";
import { POST_STATUS_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: string;
  posts: (Post & {
    createdBy: Pick<User, "id" | "name" | "email">;
    comments: { id: string }[];
  })[];
  assets: Asset[];
  onPostClick: (post: Post) => void;
  colorClass?: string;
}

const columnColors: Record<string, string> = {
  DRAFT: "border-t-gray-300",
  REVIEW: "border-t-yellow-400",
  APPROVED: "border-t-green-400",
  SCHEDULED: "border-t-blue-400",
  PUBLISHED: "border-t-purple-400",
  ARCHIVED: "border-t-red-300",
};

export default function KanbanColumn({
  status,
  posts,
  assets,
  onPostClick,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-72 bg-gray-50 rounded-xl border border-gray-200 border-t-4 overflow-hidden",
        columnColors[status] ?? "border-t-gray-300"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            {POST_STATUS_LABELS[status] ?? status}
          </h3>
          <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {posts.length}
          </span>
        </div>
      </div>

      {/* Posts */}
      <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {posts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-400">Ingen posts her endnu</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              assets={assets}
              onClick={() => onPostClick(post)}
            />
          ))
        )}
      </div>
    </div>
  );
}
