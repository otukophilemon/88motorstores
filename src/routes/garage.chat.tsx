import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MediaUploader, type MediaItem } from "@/components/media-uploader";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  createChatMessage,
  listChatMessages,
  type ChatMessage,
} from "@/lib/garage/chat-server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/garage/chat")({
  component: ChatPage,
});

const POLL_MS = 4000;

function ChatPage() {
  const user = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);

  function scrollToBottom(smooth = false) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  // Track whether the user is near the bottom — only auto-scroll if so.
  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  }

  // Initial load
  useEffect(() => {
    let alive = true;
    void listChatMessages({ data: { limit: 60 } })
      .then((rows) => {
        if (!alive) return;
        setMessages(rows);
        lastIdRef.current = rows.at(-1)?.id ?? null;
        window.setTimeout(() => scrollToBottom(false), 50);
      })
      .catch(() => {
        if (!alive) return;
        setMessages([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Poll for new messages
  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const last = lastIdRef.current;
        const lastAt = messages.find((m) => m.id === last)?.createdAt;
        const fresh = await listChatMessages({
          data: { limit: 50, after: lastAt },
        });
        if (fresh.length === 0) return;
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const merged = [...prev, ...fresh.filter((m) => !existing.has(m.id))];
          return merged;
        });
        lastIdRef.current = fresh.at(-1)?.id ?? last;
        if (stickToBottomRef.current) {
          window.setTimeout(() => scrollToBottom(true), 50);
        }
      } catch {
        // silent — retry on next tick
      }
    }, POLL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text && media.length === 0) return;
    if (!user) {
      toast.error("Sign in to chat.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createChatMessage({
        data: {
          body: text || undefined,
          media,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => [...prev, result.message]);
      setDraft("");
      setMedia([]);
      setMediaOpen(false);
      lastIdRef.current = result.message.id;
      stickToBottomRef.current = true;
      window.setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6">
      <header className="shrink-0 border-b border-border py-4">
        <Link
          to="/garage"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Garage
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold leading-tight">
          The general
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Live chat for everyone signed in · be kind
        </p>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto py-6"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading chat…</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
            <p className="font-display text-xl">Nobody's spoken yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Say hello to the garage.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {messages.map((m) => {
              const mine = user?.id === m.userId;
              return (
                <div
                  key={m.id}
                  className={mine ? "flex justify-end" : "flex justify-start"}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5",
                        mine
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-card shadow-[var(--shadow-border)]",
                      )}
                    >
                      {!mine ? (
                        <p className="mb-1 text-xs font-medium text-foreground/70">
                          {m.authorName}
                        </p>
                      ) : null}
                      {m.body ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed">
                          {m.body}
                        </p>
                      ) : null}
                      {m.media.length > 0 ? (
                        <div
                          className={cn(
                            "grid gap-1.5",
                            m.body && "mt-2",
                            m.media.length === 1
                              ? "grid-cols-1"
                              : "grid-cols-2",
                          )}
                        >
                          {m.media.map((item) => (
                            <div
                              key={item.url}
                              className={cn(
                                "overflow-hidden rounded-lg bg-secondary",
                                m.media.length === 1
                                  ? "aspect-video"
                                  : "aspect-square",
                              )}
                            >
                              {item.type === "video" ? (
                                <video
                                  src={item.url}
                                  className="size-full object-cover"
                                  controls
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={item.url}
                                  alt=""
                                  className="size-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[11px] text-muted-foreground",
                        mine ? "text-right" : "text-left",
                      )}
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
        )}
      </div>

      <div className="shrink-0 border-t border-border py-4">
        <SignedIn>
          {mediaOpen ? (
            <div className="mb-3 rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Attach media
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMedia([]);
                    setMediaOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close attachments"
                >
                  <X className="size-4" />
                </button>
              </div>
              <MediaUploader
                value={media}
                onChange={setMedia}
                disabled={submitting}
                maxItems={2}
              />
            </div>
          ) : null}

          <form onSubmit={send} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setMediaOpen((v) => !v)}
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              aria-label="Add media"
            >
              <span className="text-lg leading-none">+</span>
            </button>
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
              placeholder="Say something to the garage…"
              disabled={submitting}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={submitting || (!draft.trim() && media.length === 0)}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sign in to join the chat.
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