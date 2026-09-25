import { Link } from "@tanstack/react-router";
import { Bell, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications/server";

const POLL_MS = 15000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Poll the unread count.
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const { count } = await getUnreadCount();
        if (alive) setUnread(count);
      } catch {
        // ignore — user might be signed out
      }
    }
    void tick();
    const interval = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  // Load the recent list when the dropdown opens.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void getMyNotifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function openNotification(n: Notification) {
    // Optimistically mark read locally.
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) =>
        prev?.map((x) =>
          x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
        ) ?? null,
      );
      try {
        await markNotificationRead({ data: { id: n.id } });
      } catch {
        // ignore — server will catch up
      }
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="relative"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          {/* Click-outside shield */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-[var(--shadow-border-hover)] sm:w-96">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Notifications
              </p>
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                See all
              </Link>
            </div>

            {loading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {items.slice(0, 8).map((n) => (
                  <li key={n.id}>
                    <Link
                      to="/nations/$slug/$threadId"
                      params={{
                        slug: n.clubSlug ?? "",
                        threadId: n.postId,
                      }}
                      onClick={() => void openNotification(n)}
                      className={
                        n.readAt
                          ? "flex gap-3 px-4 py-3 text-sm hover:bg-secondary"
                          : "flex gap-3 border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm hover:bg-secondary"
                      }
                    >
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {n.actorName} replied
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {n.threadTitle}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {items && items.length > 8 ? (
              <div className="border-t border-border px-4 py-2 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  View all {items.length}
                </Link>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-KE");
}