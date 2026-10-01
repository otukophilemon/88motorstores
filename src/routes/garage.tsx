import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HelpCircle, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GarageComposer } from "@/components/garage-composer";
import { ReactionBar } from "@/components/reaction-bar";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  listPosts,
  type GaragePost,
  type PostType,
} from "@/lib/garage/server";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/garage")({ component: GaragePage });

type Filter = "all" | PostType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "showcase", label: "Showcase" },
  { key: "question", label: "Questions" },
  { key: "tip", label: "Tips" },
];

function GaragePage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const hydrated = useHydrated();

  const [filter, setFilter] = useState<Filter>("all");
  const [posts, setPosts] = useState<GaragePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Reset and reload when the filter changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPosts([]);
    setHasMore(true);
    void listPosts({
      data: {
        limit: 20,
        postType: filter === "all" ? "all" : filter,
      },
    })
      .then((rows) => {
        if (!alive) return;
        setPosts(rows);
        setHasMore(rows.length === 20);
      })
      .catch(() => {
        if (!alive) return;
        setPosts([]);
        setHasMore(false);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filter]);

  async function loadMore() {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const before = posts[posts.length - 1]?.createdAt;
      const more = await listPosts({
        data: {
          limit: 20,
          before,
          postType: filter === "all" ? "all" : filter,
        },
      });
      setPosts((prev) => [...prev, ...more]);
      setHasMore(more.length === 20);
    } catch {
      toast.error("Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  const unansweredQuestions = posts.filter(
    (p) => p.postType === "question" && p.commentCount === 0,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Community
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold">
            The Garage
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Share your car, ask the community, or post a fix. React, comment,
            and connect with enthusiasts across Kenya.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/garage/chat">Live chat</Link>
        </Button>
      </div>

      {/* Composer */}
      {hydrated ? (
        <div className="mt-6">
          <SignedIn>
            <GarageComposer
              authorName={user?.displayName}
              onPosted={(id) => {
                void navigate({ to: "/garage/$id", params: { id } });
              }}
            />
          </SignedIn>
          <SignedOut>
            <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-[var(--shadow-border)]">
              <Link to="/login" className="text-foreground underline">
                Sign in
              </Link>{" "}
              to post in the garage. Reading is open to everyone.
            </div>
          </SignedOut>
        </div>
      ) : null}

      {/* Unanswered callout */}
      {unansweredQuestions.length > 0 ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm">
            <span className="font-medium">
              {unansweredQuestions.length}{" "}
              {unansweredQuestions.length === 1 ? "question" : "questions"}
            </span>{" "}
            waiting for an answer.{" "}
            <button
              type="button"
              onClick={() => setFilter("question")}
              className="underline"
            >
              Help out
            </button>
            .
          </p>
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            type="button"
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Feed */}
      <section className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading feed…</p>
        ) : posts.length === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
            <p className="font-display text-xl">
              {filter === "all"
                ? "The garage is quiet."
                : filter === "question"
                  ? "No questions yet."
                  : filter === "tip"
                    ? "No tips yet."
                    : "Nothing here yet."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to post.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5">
            {posts.map((p) => (
              <GaragePostCard
                key={p.id}
                post={p}
                canReact={hydrated && !!user}
              />
            ))}
          </ul>
        )}

        {!loading && hasMore && posts.length > 0 ? (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

// ─── Post card ──────────────────────────────────────────────────────────

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

function GaragePostCard({
  post,
  canReact,
}: {
  post: GaragePost;
  canReact: boolean;
}) {
  const media = post.media.slice(0, 4);
  const extra = post.media.length - media.length;
  const badge = TYPE_BADGE[post.postType];
  const BadgeIcon = badge.icon;

  const commentLabel =
    post.postType === "question"
      ? post.commentCount === 1
        ? "answer"
        : "answers"
      : post.commentCount === 1
        ? "comment"
        : "comments";

  return (
    <li className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
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
            {post.postType === "question" && post.hasAcceptedAnswer ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                Answered
              </span>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(post.createdAt).toLocaleString("en-KE", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-medium">{post.authorName}</span>
        </div>

        {post.title ? (
          <h3 className="mt-2 font-display text-xl font-semibold">
            {post.title}
          </h3>
        ) : null}
        {post.body ? (
          <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
            {post.body}
          </p>
        ) : null}
      </div>

      {media.length > 0 ? (
        <div
          className={
            media.length === 1
              ? "grid grid-cols-1"
              : "grid grid-cols-2 gap-0.5"
          }
        >
          {media.map((m, i) => (
            <div
              key={m.url}
              className={`relative bg-secondary ${
                media.length === 1 ? "aspect-video" : "aspect-square"
              }`}
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
              {i === media.length - 1 && extra > 0 ? (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/60 text-lg font-semibold">
                  +{extra}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-t border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canReact ? (
            <ReactionBar
              targetType="garage_post"
              targetId={post.id}
              initialCount={post.reactionCount}
              initialMine={post.myReaction}
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {post.reactionCount > 0 ? `${post.reactionCount} reactions` : ""}
            </span>
          )}
          <Link
            to="/garage/$id"
            params={{ id: post.id }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {post.commentCount} {commentLabel}
          </Link>
        </div>
      </div>
    </li>
  );
}