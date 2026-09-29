import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Calendar,
  Cog,
  LogOut,
  MapPin,
  MessageSquare,
  Pin,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  createClubPost,
  getClubThreads,
  type ClubPost,
} from "@/lib/clubs/server";
import {
  getClub,
  getClubMembers,
  joinClub,
  leaveClub,
  type Club,
  type ClubMember,
  type ClubRole,
} from "@/lib/clubs/management";

export const Route = createFileRoute("/nations/$slug/")({
  component: ClubPage,
});

function ClubPage() {
  const { slug } = Route.useParams();
  const user = useCurrentUser();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // Post form state
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load club, members, threads on mount.
  useEffect(() => {
    setLoading(true);
    void getClub({ data: { slug } })
      .then(async (c) => {
        if (!c) {
          setNotFoundState(true);
          return;
        }
        setClub(c);
        const [m, t] = await Promise.all([
          getClubMembers({ data: { clubId: c.id } }).catch(() => []),
          getClubThreads({ data: { clubSlug: slug } }).catch(() => []),
        ]);
        setMembers(m);
        setPosts(t);
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Prefill author name once user loads.
  useEffect(() => {
    if (user?.displayName && !author) setAuthor(user.displayName);
  }, [user?.displayName, author]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading club…</p>
      </main>
    );
  }

  if (notFoundState || !club) {
    throw notFound();
  }

  const myMembership = user
    ? members.find((m) => m.userId === user.id)
    : undefined;
  const myRole: ClubRole | null = myMembership?.role ?? null;
  const isMember = myRole !== null;
  const canManage = myRole === "owner" || myRole === "admin";

  async function handleJoin() {
    if (!club) return;
    setActionBusy(true);
    try {
      const r = await joinClub({ data: { clubId: club.id } });
      if (!r.ok) {
        toast.error(r.error ?? "Could not join.");
        return;
      }
      toast.success(`Joined ${club.name}.`);
      // Reload members.
      const m = await getClubMembers({ data: { clubId: club.id } });
      setMembers(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLeave() {
    if (!club) return;
    if (!confirm(`Leave ${club.name}?`)) return;
    setActionBusy(true);
    try {
      const r = await leaveClub({ data: { clubId: club.id } });
      if (!r.ok) {
        toast.error(r.error ?? "Could not leave.");
        return;
      }
      toast.success(`Left ${club.name}.`);
      const m = await getClubMembers({ data: { clubId: club.id } });
      setMembers(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not leave.");
    } finally {
      setActionBusy(false);
    }
  }

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
      {/* Hero */}
      <section className="relative min-h-72 overflow-hidden">
        {club.cover ? (
          <img
            src={club.cover}
            alt=""
            className="img-cover absolute inset-0 size-full"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-background/15" />
        <div className="relative mx-auto flex min-h-72 max-w-7xl flex-col justify-end px-4 pb-10 sm:px-6">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">
            <Link to="/nations">Clubs</Link> ·{" "}
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-5xl font-semibold">
                {club.name}
              </h1>
              {club.tagline ? (
                <p className="mt-2 max-w-xl text-foreground/85">
                  {club.tagline}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/nations/$slug/manage"
                    params={{ slug: club.slug }}
                  >
                    <Cog className="size-4" />
                    Manage club
                  </Link>
                </Button>
              ) : null}
              <SignedIn>
                {isMember ? (
                  myRole === "owner" ? null : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionBusy}
                      onClick={handleLeave}
                    >
                      <LogOut className="size-4" />
                      Leave
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    disabled={actionBusy}
                    onClick={handleJoin}
                  >
                    <UserPlus className="size-4" />
                    Join club
                  </Button>
                )}
              </SignedIn>
              <SignedOut>
                <Button asChild size="sm">
                  <Link to="/sign-up">Sign up to join</Link>
                </Button>
              </SignedOut>
            </div>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {/* Coming up */}
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

          {/* Threads */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary">
                Discussions
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                Club threads
              </h2>
            </div>
            {posts.length ? (
              <p className="text-sm text-muted-foreground">
                {posts.length} {posts.length === 1 ? "thread" : "threads"}
              </p>
            ) : null}
          </div>

          {posts.length === 0 ? (
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

          {/* Post form or gating */}
          <div className="mt-8">
            <SignedOut>
              <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
                <h2 className="font-display text-2xl font-semibold">
                  Sign in to post
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reading the club is open to everyone. Posting requires an
                  account and club membership.
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
              {!isMember ? (
                <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
                  <h2 className="font-display text-2xl font-semibold">
                    Join to post
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You need to be a member of {club.name} to start a thread.
                    Joining is open — no approval needed.
                  </p>
                  <div className="mt-5">
                    <Button
                      disabled={actionBusy}
                      onClick={handleJoin}
                    >
                      <UserPlus className="size-4" />
                      Join {club.name}
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
                >
                  <h2 className="font-display text-2xl font-semibold">
                    Start a thread
                  </h2>
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
              )}
            </SignedIn>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="grid gap-5 lg:col-span-4 lg:self-start">
          <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-xl font-semibold">About</h2>
            {club.about ? (
              <p className="mt-2 text-sm text-muted-foreground">{club.about}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No description yet.
              </p>
            )}
            {club.rules.length ? (
              <>
                <p className="mt-5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Rules
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {club.rules.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Users className="size-5" />
              Members
            </h2>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No members yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {members.slice(0, 20).map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{m.name}</span>
                    {m.role === "owner" ? (
                      <Badge variant="default" className="text-[10px]">
                        Owner
                      </Badge>
                    ) : m.role === "admin" ? (
                      <Badge variant="outline" className="text-[10px]">
                        Admin
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {members.length > 20 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                +{members.length - 20} more
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

// ─── Thread card ────────────────────────────────────────────────────────

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