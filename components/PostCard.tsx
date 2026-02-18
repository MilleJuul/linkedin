"use client";

import { Post, User, Asset } from "@prisma/client";
import { formatDate, formatDateTime } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import { Calendar, MessageCircle, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface PostCardProps {
  post: Post & {
    createdBy: Pick<User, "id" | "name" | "email">;
    comments: { id: string }[];
  };
  assets?: Asset[];
  onClick?: () => void;
}

export default function PostCard({ post, assets = [], onClick }: PostCardProps) {
  const postAssets = assets.filter((a) => post.assetIds.includes(a.id));

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
    >
      {/* Status + Platform */}
      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={post.status} />
        <span className="text-xs text-gray-400">LinkedIn</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
        {post.title}
      </h3>

      {/* Hook preview */}
      {post.hook && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{post.hook}</p>
      )}

      {/* Asset thumbnails */}
      {postAssets.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {postAssets.slice(0, 4).map((asset) => (
            <div
              key={asset.id}
              className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0"
            >
              {asset.thumbnailUrl ? (
                <Image
                  src={asset.thumbnailUrl}
                  alt={asset.filename}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
          {postAssets.length > 4 && (
            <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-gray-500">+{postAssets.length - 4}</span>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {post.cta && (
        <p className="text-xs text-blue-600 mb-3 line-clamp-1">→ {post.cta}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400 pt-2 border-t border-gray-50">
        {post.scheduledAt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(post.scheduledAt)}
          </span>
        )}
        {post.comments.length > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {post.comments.length}
          </span>
        )}
        <span className="ml-auto truncate">
          {post.createdBy.name ?? post.createdBy.email}
        </span>
      </div>
    </div>
  );
}
