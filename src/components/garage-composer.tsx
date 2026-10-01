import { PenLine, Plus, Sparkles, X, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MediaUploader, type MediaItem } from "@/components/media-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost, type PostType } from "@/lib/garage/server";
import { cn } from "@/lib/utils";

type Props = {
  /** Called after a successful post. Receives the new post id. */
  onPosted: (id: string) => void;
  /** Display name of the signed-in user — used for the avatar initial. */
  authorName?: string | null;
};

const TYPES: {
  key: PostType;
  label: string;
  hint: string;
  icon: typeof PenLine;
}[] = [
  {
    key: "showcase",
    label: "Showcase",
    hint: "Share your car, build, or parts",
    icon: Sparkles,
  },
  {
    key: "question",
    label: "Question",
    hint: "Ask the community for help",
    icon: PenLine,
  },
  {
    key: "tip",
    label: "Tip",
    hint: "Share a fix or how-to",
    icon: Wrench,
  },
];

export function GarageComposer({ onPosted, authorName }: Props) {
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>("showcase");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setBody("");
    setMedia([]);
    setPostType("showcase");
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function submit() {
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
          postType,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Posted to the garage.");
      reset();
      setOpen(false);
      onPosted(result.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post.");
    } finally {
      setSubmitting(false);
    }
  }

  const active = TYPES.find((t) => t.key === postType) ?? TYPES[0];

  // ── Collapsed bar ───────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 text-left text-sm shadow-[var(--shadow-border)] transition-colors hover:bg-secondary/40"
      >
        <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase text-foreground">
          {(authorName ?? "?").charAt(0)}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
          <Plus className="size-4" />
          <span className="font-medium">New post</span>
          <span className="text-muted-foreground">
            — share your car, ask a question, or post a fix…
          </span>
        </span>
      </button>
    );
  }

  // ── Expanded ────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-primary/40 bg-card p-5 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">New post</h2>
        <button
          type="button"
          onClick={close}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Type selector */}
      <div className="mt-4">
        <Label>Type</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const selected = postType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setPostType(t.key)}
                disabled={submitting}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/60",
                )}
                aria-pressed={selected}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="size-3.5" />
                  {t.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields */}
      <div className="mt-4 grid gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            postType === "question"
              ? "What do you need help with?"
              : postType === "tip"
                ? "What's the tip?"
                : "Title (optional)"
          }
          disabled={submitting}
          maxLength={120}
          autoFocus
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            postType === "question"
              ? "Describe the issue — make, model, year, symptoms, what you've tried…"
              : postType === "tip"
                ? "Share the fix or the how-to, step by step…"
                : "What's the story?"
          }
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
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Posting as <span className="text-foreground">{active.label}</span>
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={submit}>
            {submitting ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}