"use client";

import { useState, useTransition, useRef } from "react";
import { Post, User, Comment, Asset } from "@prisma/client";
import { updatePost, updatePostStatus, addComment } from "@/actions/posts";
import { matchAssetsToPost } from "@/lib/ai";
import { formatDateTime, formatRelative, POST_STATUS_LABELS } from "@/lib/utils";
import Modal from "./ui/Modal";
import StatusBadge from "./StatusBadge";
import Button from "./ui/Button";
import AssetGrid from "./AssetGrid";
import {
  Save,
  Send,
  CheckCircle,
  Calendar,
  Archive,
  Wand2,
  MessageCircle,
  ChevronDown,
  X,
  Hash,
  Clock,
} from "lucide-react";

type PostWithRelations = Post & {
  createdBy: Pick<User, "id" | "name" | "email">;
  updatedBy?: Pick<User, "id" | "name" | "email"> | null;
  comments: (Comment & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

interface PostEditorProps {
  post: PostWithRelations;
  workspaceSlug: string;
  allAssets: Asset[];
  onClose: () => void;
}

const STATUS_TRANSITIONS: Record<string, { label: string; nextStatus: string; icon: React.ReactNode }[]> = {
  DRAFT: [
    { label: "Send til review", nextStatus: "REVIEW", icon: <Send className="w-4 h-4" /> },
  ],
  REVIEW: [
    { label: "Godkend", nextStatus: "APPROVED", icon: <CheckCircle className="w-4 h-4" /> },
    { label: "Tilbage til kladde", nextStatus: "DRAFT", icon: <ChevronDown className="w-4 h-4" /> },
  ],
  APPROVED: [
    { label: "Planlæg", nextStatus: "SCHEDULED", icon: <Calendar className="w-4 h-4" /> },
    { label: "Publicér nu", nextStatus: "PUBLISHED", icon: <CheckCircle className="w-4 h-4" /> },
  ],
  SCHEDULED: [
    { label: "Publicér nu", nextStatus: "PUBLISHED", icon: <CheckCircle className="w-4 h-4" /> },
    { label: "Arkivér", nextStatus: "ARCHIVED", icon: <Archive className="w-4 h-4" /> },
  ],
  PUBLISHED: [
    { label: "Arkivér", nextStatus: "ARCHIVED", icon: <Archive className="w-4 h-4" /> },
  ],
  ARCHIVED: [
    { label: "Gendan som kladde", nextStatus: "DRAFT", icon: <ChevronDown className="w-4 h-4" /> },
  ],
};

export default function PostEditor({
  post,
  workspaceSlug,
  allAssets,
  onClose,
}: PostEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"edit" | "assets" | "comments" | "history">("edit");
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  // Form state
  const [title, setTitle] = useState(post.title);
  const [hook, setHook] = useState(post.hook);
  const [bodyText, setBodyText] = useState(post.bodyText);
  const [cta, setCta] = useState(post.cta);
  const [hashtagInput, setHashtagInput] = useState(post.hashtags.join(", "));
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(post.assetIds);
  const [suggestedAssetIds, setSuggestedAssetIds] = useState<string[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [saved, setSaved] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const selectedAssets = allAssets.filter((a) => selectedAssetIds.includes(a.id));
  const currentStatus = post.status;
  const transitions = STATUS_TRANSITIONS[currentStatus] ?? [];

  async function handleSave() {
    const hashtags = hashtagInput
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    startTransition(async () => {
      await updatePost(post.id, workspaceSlug, {
        title,
        hook,
        bodyText,
        cta,
        hashtags,
        assetIds: selectedAssetIds,
        scheduledAt: scheduledAt || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      await updatePostStatus(post.id, workspaceSlug, newStatus as Post["status"]);
      onClose();
    });
  }

  async function handleSuggestAssets() {
    const idea = `${title} ${hook} ${bodyText}`;
    const ids = await matchAssetsToPost({ postIdea: idea, assets: allAssets });
    setSuggestedAssetIds(ids);
    setActiveTab("assets");
    setShowAssetPicker(true);
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return;
    const formData = new FormData();
    formData.set("body", commentBody);
    startTransition(async () => {
      await addComment(post.id, workspaceSlug, formData);
      setCommentBody("");
    });
  }

  function toggleAsset(assetId: string) {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  }

  const charCount = bodyText.length;
  const maxChars = 3000;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 w-full bg-transparent border-0 outline-none focus:ring-0 p-0 placeholder:text-gray-400"
            placeholder="Post-titel..."
          />
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={currentStatus} />
            <span className="text-xs text-gray-400">
              Oprettet af {post.createdBy.name ?? post.createdBy.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status transitions */}
          {transitions.map((t) => (
            <Button
              key={t.nextStatus}
              variant={t.nextStatus === "APPROVED" || t.nextStatus === "PUBLISHED" ? "primary" : "outline"}
              size="sm"
              onClick={() => handleStatusChange(t.nextStatus)}
              disabled={isPending}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={isPending}
          >
            <Save className="w-4 h-4" />
            {saved ? "Gemt!" : "Gem"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-100 px-6 flex-shrink-0">
        {(["edit", "assets", "comments", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "edit" && "Rediger"}
            {tab === "assets" && `Assets (${selectedAssets.length})`}
            {tab === "comments" && `Kommentarer (${post.comments.length})`}
            {tab === "history" && "Historik"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Edit tab */}
        {activeTab === "edit" && (
          <div className="p-6 space-y-5">
            {/* Hook */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Hook (åbningslinje)
              </label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Det første sætning der stopper scrollet..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Indhold
                </label>
                <span className={`text-xs ${charCount > maxChars * 0.9 ? "text-orange-500" : "text-gray-400"}`}>
                  {charCount}/{maxChars}
                </span>
              </div>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Skriv dit LinkedIn-indhold her..."
                rows={8}
                maxLength={maxChars}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Call to action
              </label>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Hvad skal læseren gøre? Fx 'Kommentér nedenfor'..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Hash className="w-3.5 h-3.5 inline mr-1" />
                Hashtags (kommasepareret)
              </label>
              <input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="#LinkedIn, #B2BMarketing, #ContentStrategy"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {hashtagInput && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hashtagInput.split(",").map((h, i) => {
                    const tag = h.trim();
                    return tag ? (
                      <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Scheduled at */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Planlagt tidspunkt
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* AI suggest assets */}
            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestAssets}
                className="text-purple-600 hover:bg-purple-50"
              >
                <Wand2 className="w-4 h-4" />
                AI: Foreslå matchende assets
              </Button>
            </div>
          </div>
        )}

        {/* Assets tab */}
        {activeTab === "assets" && (
          <div className="p-6">
            {selectedAssets.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Valgte assets ({selectedAssets.length})
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedAssets.map((asset) => (
                    <div key={asset.id} className="relative group">
                      {asset.thumbnailUrl && (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.filename}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <button
                        onClick={() => toggleAsset(asset.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestedAssetIds.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 mb-1">
                  AI-anbefalede assets
                </p>
                <p className="text-xs text-purple-600">
                  Baseret på dit indhold anbefaler AI disse {suggestedAssetIds.length} assets.
                </p>
              </div>
            )}

            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Alle assets – klik for at vælge/fravælge
            </h4>
            <AssetGrid
              assets={suggestedAssetIds.length > 0
                ? [
                    ...allAssets.filter((a) => suggestedAssetIds.includes(a.id)),
                    ...allAssets.filter((a) => !suggestedAssetIds.includes(a.id)),
                  ]
                : allAssets}
              workspaceSlug={workspaceSlug}
              selectable
              selectedIds={selectedAssetIds}
              onSelect={toggleAsset}
            />
          </div>
        )}

        {/* Comments tab */}
        {activeTab === "comments" && (
          <div className="p-6">
            <div className="space-y-4 mb-6">
              {post.comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Ingen kommentarer endnu</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vær den første til at kommentere på dette opslag
                  </p>
                </div>
              ) : (
                post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-500">
                        {(comment.user.name ?? comment.user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {comment.user.name ?? comment.user.email}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatRelative(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <div className="border-t border-gray-100 pt-4">
              <textarea
                ref={commentRef}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Skriv en kommentar..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={isPending || !commentBody.trim()}
              >
                <MessageCircle className="w-4 h-4" />
                Tilføj kommentar
              </Button>
            </div>
          </div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <div className="p-6">
            <div className="space-y-3">
              {/* Created event */}
              <div className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">
                      {post.createdBy.name ?? post.createdBy.email}
                    </span>{" "}
                    oprettede dette opslag
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(post.createdAt)}
                  </p>
                </div>
              </div>

              {post.updatedBy && (
                <div className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-300 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">
                        {post.updatedBy.name ?? post.updatedBy.email}
                      </span>{" "}
                      opdaterede dette opslag
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(post.updatedAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Status info */}
              <div className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">
                    Nuværende status:{" "}
                    <span className="font-medium">
                      {POST_STATUS_LABELS[currentStatus]}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
