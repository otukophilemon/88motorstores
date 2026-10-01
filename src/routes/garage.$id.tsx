import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MediaUploader, type MediaItem } from "@/components/media-uploader";
import { ReactionBar } from "@/components/reaction-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  acceptAnswer,
  createComment,
  deleteComment,
  deletePost,
  getPost,
  listComments,
  type GarageComment,
  type GaragePost,
  type PostType,
} from "@/lib/garage/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/garage/$id")({
  component: GaragePostPage,
});

const TYPE_BADGE: Record<
  PostType,
  { label: string; icon: typeof Sparkles; className: string }
> = {
  showcase: {
    label: "Showcase",
    icon: Sparkles,
    className: "bg-secondary text-foreground",
  },
  question: {
    label: "Question",
    icon: HelpCircle,
    className: "bg-primary/15 text-primary",
  },
  tip: {
    label: "Tip",
    icon: Wrench,
    className: "bg-emerald-500/15 text-emerald-400",
  },
};

function GaragePostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();

  const [post, setPost] = useState<GaragePost | null>(null);
  const [comments, setComments] = useState<GarageComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  // Comment composer
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
  const isQuestion = post.postType === "question";
  const commentLabel = isQuestion ? "answer" : "comment";
  const commentLabelPlural = isQuestion ? "answers" : "comments";

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

  async function handleAccept(commentId: string, currentAccepted: boolean) {
    const r = await acceptAnswer({
      data: { commentId, accepted: !currentAccepted },
    });
    if (!r.ok) {
      toast.error(r.error ?? "Could not update answer.");
      return;
    }
    // Reload comments to reflect the new accepted state + ordering.
    const fresh = await listComments({ data: { postId: id } });
    setComments(fresh);
    // Refresh the post so `hasAcceptedAnswer` updates.
    const freshPost = await getPost({ data: { id } }).catch(() => null);
    if (freshPost) setPost(freshPost);
    toast.success(
      currentAccepted ? "Answer unmarked." : "Marked as accepted answer.",
    );
  }

  const badge = TYPE_BADGE[post.postType];
  const BadgeIcon = badge.icon;

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
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider",
                  badge.className,
                )}
              >
                <BadgeIcon className="size-3" />
                {badge.label}
              </span>
              {isQuestion && post.hasAcceptedAnswer ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Answered
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {new Date(post.createdAt).toLocaleString("en-KE")}
              </span>
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleDeletePost}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete post"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <p className="mt-3 text-sm font-medium">{post.authorName}</p>

          {post.title ? (
            <h1 className="mt-2 font-display text-3xl font-semibold">
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
      </article>

      {/* Comments / Answers */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          {comments.length}{" "}
          {comments.length === 1 ? commentLabel : commentLabelPlural}
        </h2>

        {/* Composer */}
        <div className="mt-4">
          {user ? (
            <form
              onSubmit={submitComment}
              className="grid gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
            >
              <Textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={
                  isQuestion ? "Answer this question…" : "Write a comment…"
                }
                rows={2}
                disabled={submitting}
              />
              <MediaUploader
                value={commentMedia}
                onChange={setCommentMedia}
                disabled={submitting}
                maxItems={2}
              />
              <Button
                type="submit"
                className="justify-self-end"
                disabled={submitting}
              >
                {submitting
                  ? "Posting…"
                  : isQuestion
                    ? "Post answer"
                    : "Comment"}
              </Button>
            </form>
          ) : (
            <div className="rounded-xl bg-card p-4 text-sm shadow-[var(--shadow-border)]">
              <Link to="/login" className="underline">
                Sign in
              </Link>{" "}
              to {isQuestion ? "answer" : "comment"}.
            </div>
          )}
        </div>

        {comments.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {isQuestion
              ? "No answers yet. Be the first to help."
              : "No comments yet."}
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {comments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                isOwner={user?.id === c.userId}
                isQuestion={isQuestion}
                isPostAuthor={isOwner}
                onDelete={() => handleDeleteComment(c.id)}
                onAccept={() => handleAccept(c.id, c.isAccepted)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function CommentCard({
  comment,
  isOwner,
  isQuestion,
  isPostAuthor,
  onDelete,
  onAccept,
}: {
  comment: GarageComment;
  isOwner: boolean;
  isQuestion: boolean;
  isPostAuthor: boolean;
  onDelete: () => void;
  onAccept: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl bg-card p-4 shadow-[var(--shadow-border)]",
        comment.isAccepted && "border border-emerald-500/50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{comment.authorName}</p>
          {comment.isAccepted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="size-3" />
              Accepted
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleString("en-KE")}
          </span>
          {isOwner ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete comment"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
        {comment.body}
      </p>
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <ReactionBar
          targetType="garage_comment"
          targetId={comment.id}
          initialCount={comment.reactionCount}
          initialMine={comment.myReaction}
        />
        {isQuestion && isPostAuthor ? (
          <Button
            type="button"
            size="sm"
            variant={comment.isAccepted ? "outline" : "default"}
            onClick={onAccept}
          >
            <CheckCircle2 className="size-3.5" />
            {comment.isAccepted ? "Unaccept" : "Accept answer"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}