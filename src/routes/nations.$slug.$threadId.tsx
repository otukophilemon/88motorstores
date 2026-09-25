import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { nationBySlug } from "@/lib/catalog";
import {
  createReply,
  getReplies,
  getThread,
  type ClubPost,
  type ClubReply,
} from "@/lib/clubs/server";

export const Route = createFileRoute("/nations/$slug/$threadId")({
  component: ThreadPage,
});

const POLL_MS = 5000;

type ChatMessage = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  kind: "thread" | "reply";
};

function ThreadPage() {
  const { slug, threadId } = Route.useParams();
  const nation = nationBySlug(slug);
  const user = useCurrentUser();

  const [thread, setThread] = useState<ClubPost | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  function scrollToBottom(smooth = false) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      getThread({ data: { id: threadId } }),
      getReplies({ data: { postId: threadId } }),
    ])
      .then(([t, r]) => {
        if (!t) {
          setNotFoundFlag(true);
          return;
        }
        setThread(t);
        const feed: ChatMessage[] = [
          {
            id: t.id,
            authorName: t.authorName,
            body: t.body,
            createdAt: t.createdAt,
            kind: "thread",
          },
          ...r.map((reply) => ({
            id: reply.id,
            authorName: reply.authorName,
            body: reply.body,
            createdAt: reply.createdAt,
            kind: "reply" as const,
          })),
        ];
        setMessages(feed);
        lastIdRef.current = feed.at(-1)?.id ?? null;
        window.setTimeout(() => scrollToBottom(false), 50);
      })
      .catch(() => setNotFoundFlag(true))
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    if (!thread) return;
    const interval = window.setInterval(async () => {
      try {
        const fresh = await getReplies({ data: { postId: threadId } });
        setMessages((prev) => {
          const firstMessage = prev.find((m) => m.kind === "thread");
          if (!firstMessage) return prev;
          const freshFeed: ChatMessage[] = [
            firstMessage,
            ...fresh.map((r) => ({
              id: r.id,
              authorName: r.authorName,
              body: r.body,
              createdAt: r.createdAt,
              kind: "reply" as const,
            })),
          ];
          const lastId = freshFeed.at(-1)?.id ?? null;
          if (lastId !== lastIdRef.current) {
            lastIdRef.current = lastId;
            window.setTimeout(() => scrollToBottom(true), 50);
          }
          return freshFeed;
        });
      } catch {
        // ignore poll errors
      }
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [thread, threadId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (!user) {
      toast.error("Sign in to send a message.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createReply({
        data: {
          postId: threadId,
          authorName: user.displayName ?? user.primaryEmail ?? "Member",
          body: text,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: result.reply.id,
          authorName: result.reply.authorName,
          body: result.reply.body,
          createdAt: result.reply.createdAt,
          kind: "reply",
        },
      ]);
      setDraft("");
      lastIdRef.current = result.reply.id;
      window.setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading chat…</p>
      </main>
    );
  }

  if (notFoundFlag || !thread) {
    throw notFound();
  }

  const hasFutureEvent =
    thread.eventAt && new Date(thread.eventAt).getTime() >= Date.now();

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6">
      <header className="shrink-0 border-b border-border py-4">
        <Link
          to="/nations/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {nation?.name ?? "Club"}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold leading-tight">
          {thread.title}
        </h1>

        {hasFutureEvent ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
              <Calendar className="size-3" />
              {new Date(thread.eventAt!).toLocaleString("en-KE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {thread.eventLocation ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3" />
                {thread.eventLocation}
              </span>
            ) : null}
          </div>
        ) : null}

        <p className="mt-2 text-xs text-muted-foreground">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        <div className="grid gap-4">
          {messages.map((m) => {
            const mine =
              user?.displayName === m.authorName ||
              (user?.displayName === null && m.authorName === "Member");
            return (
              <div
                key={m.id}
                className={mine ? "flex justify-end" : "flex justify-start"}
              >
                <div className="max-w-[80%]">
                  <div
                    className={
                      mine
                        ? "rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground"
                        : "rounded-2xl rounded-tl-sm bg-card px-4 py-2.5 shadow-[var(--shadow-border)]"
                    }
                  >
                    {!mine ? (
                      <p className="mb-1 text-xs font-medium text-foreground/70">
                        {m.authorName}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {m.body}
                    </p>
                  </div>
                  <p
                    className={
                      mine
                        ? "mt-1 text-right text-[11px] text-muted-foreground"
                        : "mt-1 text-[11px] text-muted-foreground"
                    }
                  >
                    {new Date(m.createdAt).toLocaleTimeString("en-KE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-border py-4">
        <SignedIn>
          <form onSubmit={send} className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e as unknown as FormEvent);
                }
              }}
              rows={1}
              placeholder="Type a message…"
              disabled={submitting}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={submitting || !draft.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sign in to join this chat.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-up">Create account</Link>
              </Button>
            </div>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}