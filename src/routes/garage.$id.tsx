import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MediaUploader, type MediaItem } from "@/components/media-uploader";
import { ReactionBar } from "@/components/reaction-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  createComment,
  deleteComment,
  deletePost,
  getPost,
  listComments,
  updateComment,
  updatePost,
  type GarageComment,
  type GaragePost,
} from "@/lib/garage/server";

export const Route = createFileRoute("/garage/$id")({
  component: GaragePostPage,
});

function GaragePostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();

  const [post, setPost] = useState<GaragePost | null>(null);
  const [comments, setComments] = useState<GarageComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  // Post edit mode
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editMedia, setEditMedia] = useState<MediaItem[]>([]);
  const [savingPost, setSavingPost] = useState(false);

  // Comment composer
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentMedia, setCommentMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPending) return;
    setLoading(true);
    void Promise.all([
      getPost({ data: { id } }).catch(() => null),
      listComments({ data: { postId: id } }).catch(() => []),
    ])
      .then(([p, c]) => {
        if (!p) {
          setNotFoundState(true);
          return;
        }
        setPost(p);
        setComments(c);
      })
      .finally(() => setLoading(false));
  }, [id, isPending]);

  if (isPending || loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading post…</p>
      </main>
    );
  }

  if (notFoundState || !post) throw notFound();

  const isOwner = user?.id === post.userId;

  function startEditPost() {
    if (!post) return;
    setEditTitle(post.title ?? "");
    setEditBody(post.body ?? "");
    setEditMedia(post.media);
    setEditingPost(true);
  }

  async function saveEditPost() {
    if (!post) return;
    if (!editTitle.trim() && !editBody.trim() && editMedia.length === 0) {
      toast.error("Post can't be empty.");
      return;
    }
    setSavingPost(true);
    try {
      const r = await updatePost({
        data: {
          id: post.id,
          title: editTitle.trim() || undefined,
          body: editBody.trim() || undefined,
          media: editMedia,
        },
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not update.");
        return;
      }
      // Reload the post.
      const fresh = await getPost({ data: { id: post.id } });
      if (fresh) setPost(fresh);
      setEditingPost(false);
      toast.success("Post updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setSavingPost(false);
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() && commentMedia.length === 0) {
      toast.error("Add a message or media.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createComment({
        data: {
          postId: id,
          body: commentBody.trim(),
          media: commentMedia,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCommentBody("");
      setCommentMedia([]);
      setCommentOpen(false);
      const fresh = await listComments({ data: { postId: id } });
      setComments(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePost() {
    if (!post) return;
    if (!confirm("Delete this post?")) return;
    const r = await deletePost({ data: { id: post.id } });
    if (!r.ok) {
      toast.error(r.error ?? "Could not delete.");
      return;
    }
    toast.success("Post deleted.");
    void navigate({ to: "/garage" });
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const r = await deleteComment({ data: { id: commentId } });
    if (!r.ok) {
      toast.error(r.error ?? "Could not delete.");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleSaveComment(
    commentId: string,
    body: string,
    media: MediaItem[],
  ) {
    const r = await updateComment({ data: { id: commentId, body } });
    if (!r.ok) {
      toast.error(r.error ?? "Could not update.");
      return false;
    }
    // Media update — reuses updateComment? No, we don't support media edit yet.
    // If media changed, update the row directly would need a second endpoint.
    // For now, allow text edit only for comments.
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, body } : c)),
    );
    toast.success("Comment updated.");
    return true;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/garage"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Garage
      </Link>

      <article className="mt-6 overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        {editingPost ? (
          <div className="grid gap-3 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Editing post
            </p>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title (optional)"
              disabled={savingPost}
              maxLength={120}
            />
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="What's the story?"
              rows={3}
              disabled={savingPost}
            />
            <MediaUploader
              value={editMedia}
              onChange={setEditMedia}
              disabled={savingPost}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingPost(false)}
                disabled={savingPost}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button type="button" onClick={saveEditPost} disabled={savingPost}>
                <Check className="size-4" />
                {savingPost ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{post.authorName}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString("en-KE")}
                    {post.updatedAt !== post.createdAt ? " · edited" : ""}
                  </span>
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={startEditPost}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Edit post"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDeletePost}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete post"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {post.title ? (
                <h1 className="mt-3 font-display text-3xl font-semibold">
                  {post.title}
                </h1>
              ) : null}
              {post.body ? (
                <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">
                  {post.body}
                </p>
              ) : null}
            </div>

            {post.media.length > 0 ? (
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {post.media.map((m) => (
                  <div key={m.url} className="aspect-video bg-secondary">
                    {m.type === "video" ? (
                      <video
                        src={m.url}
                        className="size-full object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="border-t border-border p-4">
              <ReactionBar
                targetType="garage_post"
                targetId={post.id}
                initialCount={post.reactionCount}
                initialMine={post.myReaction}
              />
            </div>
          </>
        )}
      </article>

      {/* Comments */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>

        {/* Composer */}
        <div className="mt-4">
          {user ? (
            <div
              className={`rounded-xl border bg-card shadow-[var(--shadow-border)] transition-all ${
                commentOpen ? "border-primary/40 p-4" : "border-border p-0"
              }`}
            >
              {!commentOpen ? (
                <button
                  type="button"
                  onClick={() => setCommentOpen(true)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/40"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase text-foreground">
                    {(user.displayName ?? "?").charAt(0)}
                  </span>
                  <span>Write a comment…</span>
                </button>
              ) : (
                <form onSubmit={submitComment} className="grid gap-3">
                  <Textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Write a comment…"
                    rows={2}
                    disabled={submitting}
                    autoFocus
                  />
                  <MediaUploader
                    value={commentMedia}
                    onChange={setCommentMedia}
                    disabled={submitting}
                    maxItems={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCommentBody("");
                        setCommentMedia([]);
                        setCommentOpen(false);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Posting…" : "Comment"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-card p-4 text-sm shadow-[var(--shadow-border)]">
              <Link to="/login" className="underline">
                Sign in
              </Link>{" "}
              to comment.
            </div>
          )}
        </div>

        {comments.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No comments yet.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {comments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                isOwner={user?.id === c.userId}
                onDelete={() => handleDeleteComment(c.id)}
                onSave={(body) => handleSaveComment(c.id, body, c.media)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// ─── Comment card ───────────────────────────────────────────────────────

function CommentCard({
  comment,
  isOwner,
  onDelete,
  onSave,
}: {
  comment: GarageComment;
  isOwner: boolean;
  onDelete: () => void;
  onSave: (body: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.trim()) {
      toast.error("Comment can't be empty.");
      return;
    }
    setSaving(true);
    const ok = await onSave(draft.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <li className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{comment.authorName}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleString("en-KE")}
            {comment.updatedAt !== comment.createdAt ? " · edited" : ""}
          </span>
          {isOwner && !editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Edit comment"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete comment"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-2 grid gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            disabled={saving}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
          {comment.body}
        </p>
      )}

      {comment.media.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {comment.media.map((m) => (
            <div
              key={m.url}
              className="aspect-video overflow-hidden rounded-md bg-secondary"
            >
              {m.type === "video" ? (
                <video
                  src={m.url}
                  className="size-full object-cover"
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  src={m.url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-border pt-3">
        <ReactionBar
          targetType="garage_comment"
          targetId={comment.id}
          initialCount={comment.reactionCount}
          initialMine={comment.myReaction}
        />
      </div>
    </li>
  );
}