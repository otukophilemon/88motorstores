import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Calendar, MapPin, MessageSquare, Pin } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CarCard } from "@/components/car-card";
import { EnquireDialog } from "@/components/enquire-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cars, nationBySlug } from "@/lib/catalog";
import {
  createClubPost,
  getClubThreads,
  type ClubPost,
} from "@/lib/clubs/server";

export const Route = createFileRoute("/nations/$slug/")({
  component: NationPage,
});

function NationPage() {
  const { slug } = Route.useParams();
  const nation = nationBySlug(slug);
  if (!nation) throw notFound();
  const related = cars.filter((c) => c.make === nation.make).slice(0, 3);

  const user = useCurrentUser();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingPosts(true);
    void getClubThreads({ data: { clubSlug: slug } })
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [slug]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!author.trim() || !title.trim() || !body.trim()) {
      toast.error("Display name, thread title, and a message are required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createClubPost({
        data: {
          clubSlug: slug,
          authorName: author.trim(),
          title: title.trim(),
          body: body.trim(),
          eventAt: eventAt || undefined,
          eventLocation: eventLocation.trim() || undefined,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPosts((prev) => [result.post, ...prev]);
      toast.success("Thread posted.");
      setTitle("");
      setBody("");
      setEventAt("");
      setEventLocation("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post.");
    } finally {
      setSubmitting(false);
    }
  }

  const now = Date.now();
  const upcoming = posts.filter(
    (p) => p.eventAt && new Date(p.eventAt).getTime() >= now,
  );

  return (
    <main>
      <section className="relative min-h-72 overflow-hidden">
        <img src={nation.cover} alt="" className="img-cover absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-background/15" />
        <div className="relative mx-auto flex min-h-72 max-w-7xl flex-col justify-end px-4 pb-10 sm:px-6">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">
            <Link to="/nations">Clubs</Link> ·{" "}
            {nation.members.toLocaleString("en-KE")} members
          </p>
          <h1 className="font-display text-5xl font-semibold">{nation.name}</h1>
          <p className="mt-2 max-w-xl text-foreground/85">{nation.tagline}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {/* Coming up — events scheduled in the future */}
          {upcoming.length ? (
            <section className="mb-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">
                    Coming up
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">
                    Scheduled events
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {upcoming.length} {upcoming.length === 1 ? "event" : "events"}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {upcoming.map((p) => (
                  <EventCard key={p.id} post={p} slug={slug} highlighted />
                ))}
              </div>
            </section>
          ) : null}

          {/* All threads */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary">
                Discussions
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                Club threads
              </h2>
            </div>
            {!loadingPosts ? (
              <p className="text-sm text-muted-foreground">
                {posts.length} {posts.length === 1 ? "thread" : "threads"}
              </p>
            ) : null}
          </div>

          {loadingPosts ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading threads…</p>
          ) : posts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No threads yet. Be the first to start a conversation.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {posts.map((p) => (
                <EventCard key={p.id} post={p} slug={slug} />
              ))}
            </div>
          )}

          {/* Post form */}
          <div className="mt-8">
            <SignedOut>
              <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
                <h2 className="font-display text-2xl font-semibold">Sign in to post</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Joining the conversation requires an account. It’s free and
                  takes a minute.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/sign-up">Create account</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </div>
              </div>
            </SignedOut>

            <SignedIn>
              <form
                onSubmit={submit}
                className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
              >
                <h2 className="font-display text-2xl font-semibold">Start a thread</h2>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={user?.displayName ?? "Your display name"}
                  disabled={submitting}
                />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Thread title"
                  disabled={submitting}
                />
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ask the club…"
                  disabled={submitting}
                />
                <details className="rounded-lg border border-border bg-background p-3">
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Schedule an event (optional)
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="eventAt">When</Label>
                      <Input
                        id="eventAt"
                        type="datetime-local"
                        value={eventAt}
                        onChange={(e) => setEventAt(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="eventLoc">Where</Label>
                      <Input
                        id="eventLoc"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="e.g. Two Rivers Mall"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </details>
                <Button
                  type="submit"
                  className="justify-self-start"
                  disabled={submitting}
                >
                  {submitting ? "Posting…" : "Post thread"}
                </Button>
              </form>
            </SignedIn>
          </div>
        </div>

        <aside className="grid gap-5 lg:col-span-4 lg:self-start">
          <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-xl font-semibold">About</h2>
            <p className="mt-2 text-sm text-muted-foreground">{nation.about}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {nation.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="mt-5">
              <EnquireDialog
                kind="nation"
                targetId={nation.slug}
                subject={`Join / sponsor ${nation.name}`}
                triggerLabel="Talk to the desk"
              />
            </div>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold">
            Stock this club drives
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {related.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function EventCard({
  post,
  slug,
  highlighted = false,
}: {
  post: ClubPost;
  slug: string;
  highlighted?: boolean;
}) {
  const hasFutureEvent =
    post.eventAt && new Date(post.eventAt).getTime() >= Date.now();

  return (
    <Link
      to="/nations/$slug/$threadId"
      params={{ slug, threadId: post.id }}
      className={
        highlighted
          ? "block rounded-xl border border-primary/40 bg-card p-5 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
          : "block rounded-xl bg-card p-5 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold leading-tight">
          {post.pinned ? <Pin className="mr-1.5 inline size-4" /> : null}
          {post.title}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString("en-KE")}
        </span>
      </div>

      {hasFutureEvent ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            <Calendar className="size-3" />
            {new Date(post.eventAt!).toLocaleString("en-KE", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {post.eventLocation ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3" />
              {post.eventLocation}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {post.body}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>{post.authorName}</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" />
          {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
        </span>
      </p>
    </Link>
  );
}