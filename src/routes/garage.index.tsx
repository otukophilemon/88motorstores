import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { MediaUploader, type MediaItem } from "@/components/media-uploader";
import { ReactionBar } from "@/components/reaction-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { createPost, listPosts, type GaragePost } from "@/lib/garage/server";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/garage/")({ component: GaragePage });

function GaragePage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const hydrated = useHydrated();

  // Composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Feed
  const [posts, setPosts] = useState<GaragePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void listPosts({ data: { limit: 20 } })
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
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const before = posts[posts.length - 1]?.createdAt;
      const more = await listPosts({ data: { limit: 20, before } });
      setPosts((prev) => [...prev, ...more]);
      setHasMore(more.length === 20);
    } catch {
      toast.error("Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  function resetComposer() {
    setTitle("");
    setBody("");
    setMedia([]);
  }

  async function submitPost() {
    if (!title.trim() && !body.trim() && media.length === 0) {
      toast.error("Add a title, a message, or media.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createPost({
        data: {
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          media,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Posted to the garage.");
      resetComposer();
      setComposerOpen(false);
      void navigate({ to: "/garage/$id", params: { id: result.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Community
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold">The Garage</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Post your car, your build, your parts. Comment, react, and share. Open
        to everyone signed in.
      </p>

      {/* Composer — compact bar that expands on focus */}
      {hydrated ? (
        <div className="mt-6">
          <SignedIn>
            <div
              className={`rounded-xl border bg-card shadow-[var(--shadow-border)] transition-all ${
                composerOpen ? "border-primary/40 p-5" : "border-border p-0"
              }`}
            >
              {!composerOpen ? (
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="group flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors hover:bg-secondary/40"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase text-foreground">
                    {(user?.displayName ?? "?").charAt(0)}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                    <Plus className="size-4" />
                    <span className="font-medium">New post</span>
                    <span>— share your car, build, or parts…</span>
                  </span>
                </button>
              ) : (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold">
                      New post
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        resetComposer();
                        setComposerOpen(false);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (optional)"
                    disabled={submitting}
                    maxLength={120}
                    autoFocus
                  />
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What's the story?"
                    rows={3}
                    disabled={submitting}
                  />
                  <div className="grid gap-2">
                    <Label>Photos &amp; videos</Label>
                    <MediaUploader
                      value={media}
                      onChange={setMedia}
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetComposer();
                        setComposerOpen(false);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={submitPost}
                    >
                      {submitting ? "Posting…" : "Post"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
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

      {/* Feed */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Recent posts</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading feed…</p>
        ) : posts.length === 0 ? (
          <div className="mt-4 rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
            <p className="font-display text-xl">The garage is quiet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to post.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-5">
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

function GaragePostCard({
  post,
  canReact,
}: {
  post: GaragePost;
  canReact: boolean;
}) {
  const media = post.media.slice(0, 4);
  const extra = post.media.length - media.length;

  return (
    <li className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{post.authorName}</p>
          <span className="text-xs text-muted-foreground">
            {new Date(post.createdAt).toLocaleString("en-KE", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {post.title ? (
          <h3 className="mt-3 font-display text-xl font-semibold">
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
            {post.commentCount}{" "}
            {post.commentCount === 1 ? "comment" : "comments"}
          </Link>
        </div>
      </div>
    </li>
  );
}