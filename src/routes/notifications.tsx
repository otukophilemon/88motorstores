import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck, MessageSquare, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications/server";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function iconFor(kind: string) {
  if (kind === "reply") return MessageSquare;
  if (kind === "listing_new") return Store;
  if (kind === "enquiry_new") return MessageSquare;
  if (kind === "upgrade_new") return Store;
  return Bell;
}

function titleFor(n: Notification): string {
  if (n.kind === "reply") return `${n.actorName} replied`;
  return n.message ?? "Notification";
}

function sublineFor(n: Notification): string | null {
  if (n.kind === "reply") return n.threadTitle || null;
  return null;
}

function urlFor(n: Notification): { to: string; params?: Record<string, string> } {
  if (n.kind === "reply" && n.postId && n.clubSlug) {
    return {
      to: "/nations/$slug/$threadId",
      params: { slug: n.clubSlug, threadId: n.postId },
    };
  }
  return { to: n.link ?? "/desk" };
}

function NotificationsPage() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (loaded) return;
    setLoaded(true);
    if (!user) return;
    setLoading(true);
    void getMyNotifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isPending, user, loaded]);

  if (isPending) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;

  async function openOne(n: Notification) {
    if (n.readAt) return;
    setItems(
      (prev) =>
        prev?.map((x) =>
          x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
        ) ?? null,
    );
    try {
      await markNotificationRead({ data: { id: n.id } });
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    if (!items) return;
    const anyUnread = items.some((n) => !n.readAt);
    if (!anyUnread) return;
    setMarking(true);
    const now = new Date().toISOString();
    const previous = items;
    setItems(items.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    try {
      await markAllNotificationsRead();
      toast.success("All marked as read.");
    } catch {
      setItems(previous);
      toast.error("Could not mark all as read.");
    } finally {
      setMarking(false);
    }
  }

  const unreadCount = items?.filter((n) => !n.readAt).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Your activity
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You’re all caught up."}
          </p>
        </div>
        {items && items.length > 0 ? (
          <Button
            variant="outline"
            onClick={markAllRead}
            disabled={marking || unreadCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      <section className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading notifications…</p>
        ) : !items || items.length === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
            <Bell className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-display text-xl">No notifications yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              When someone replies to a thread you’re part of, or a seller submits
              a new listing, you’ll see it here.
            </p>
            <Button asChild className="mt-6">
              <Link to="/nations">Browse clubs</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((n) => {
              const target = urlFor(n);
              const Icon = iconFor(n.kind);
              const isAdmin =
                n.kind === "listing_new" ||
                n.kind === "enquiry_new" ||
                n.kind === "upgrade_new" ||
                n.kind === "contact_new";
              return (
                <li key={n.id}>
                  <Link
                    to={target.to}
                    params={target.params as never}
                    onClick={() => void openOne(n)}
                    className={
                      n.readAt
                        ? "flex gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
                        : "flex gap-3 rounded-xl border border-primary/40 bg-card p-4 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
                    }
                  >
                    <span
                      className={
                        isAdmin
                          ? "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                          : n.readAt
                            ? "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"
                            : "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                      }
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{titleFor(n)}</p>
                      {sublineFor(n) ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {sublineFor(n)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("en-KE")}
                      </p>
                    </div>
                    {!n.readAt ? (
                      <span
                        className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}