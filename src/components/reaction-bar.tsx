import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { toast } from "sonner";
import {
  getReactions,
  toggleReaction,
  REACTION_EMOJIS,
  type ReactionEmoji,
  type ReactionSummary,
  type ReactionTargetType,
} from "@/lib/reactions/server";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function ReactionBar({
  targetType,
  targetId,
  initialCount,
  initialMine,
  compact = false,
}: {
  targetType: ReactionTargetType;
  targetId: string;
  initialCount: number;
  initialMine: string | null;
  compact?: boolean;
}) {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return;
    void getReactions({ data: { targetType, targetId } })
      .then(setSummary)
      .catch(() => {
        /* ignore */
      });
  }, [hydrated, user, targetType, targetId]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  async function react(emoji: ReactionEmoji) {
    if (!user) {
      toast.error("Sign in to react.");
      return;
    }
    setPickerOpen(false);

    const current =
      summary ?? { counts: {}, total: initialCount, myReaction: initialMine };
    const prev = current.myReaction;
    const nextCounts = { ...current.counts };
    if (prev) nextCounts[prev] = Math.max(0, (nextCounts[prev] ?? 1) - 1);
    if (prev !== emoji) nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;

    const nextMine = prev === emoji ? null : emoji;
    const nextTotal =
      current.total + (prev === null ? 1 : nextMine === null ? -1 : 0);

    setSummary({ counts: nextCounts, total: nextTotal, myReaction: nextMine });

    try {
      await toggleReaction({ data: { targetType, targetId, emoji } });
    } catch {
      void getReactions({ data: { targetType, targetId } })
        .then(setSummary)
        .catch(() => {});
    }
  }

  const mine = summary?.myReaction ?? initialMine;
  const total = summary?.total ?? initialCount;
  const counts = summary?.counts ?? {};
  const topEmojis = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  return (
    <div className="relative flex items-center gap-2" ref={pickerRef}>
      <button
        type="button"
        onClick={() =>
          mine ? react(mine as ReactionEmoji) : setPickerOpen(true)
        }
        onContextMenu={(e) => {
          e.preventDefault();
          setPickerOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full transition-colors",
          compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm",
          mine
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary",
        )}
        aria-label={mine ? `Reacted ${mine}` : "React"}
      >
        {mine ? (
          <span
            className={cn("leading-none", compact ? "text-sm" : "text-base")}
          >
            {mine}
          </span>
        ) : (
          <Smile className={compact ? "size-3.5" : "size-4"} />
        )}
        {total > 0 ? <span className="tabular-nums">{total}</span> : null}
      </button>

      {topEmojis.length > 0 ? (
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          {topEmojis.join(" ")}
        </span>
      ) : null}

      {pickerOpen ? (
        <div
          className={cn(
            "absolute z-20 flex gap-1 rounded-full border border-border bg-popover p-1.5 shadow-[var(--shadow-border-hover)]",
            compact ? "bottom-full left-0 mb-2" : "bottom-full left-0 mb-2",
          )}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => react(emoji as ReactionEmoji)}
              className={cn(
                "grid place-items-center rounded-full transition-transform hover:scale-110",
                compact ? "size-7 text-base" : "size-9 text-lg",
                mine === emoji && "bg-primary/10",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}