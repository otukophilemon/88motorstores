import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { kesShort } from "@/lib/format";
import {
  listGalleryItems,
  type GalleryItem,
  type GallerySource,
} from "@/lib/gallery/server";

export const Route = createFileRoute("/gallery")({ component: GalleryPage });

const FILTERS: { key: GallerySource | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "car", label: "Cars" },
  { key: "part", label: "Parts" },
  { key: "garage", label: "Garage" },
];

function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GallerySource | "all">("all");

  useEffect(() => {
    setLoading(true);
    void listGalleryItems({ data: { source: "all", limit: 200 } })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.source === filter);
  }, [items, filter]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Marketplace
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold">Gallery</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every photo and video across the marketplace — cars, parts, and the
        community’s garage. Click any tile to see the full listing or post.
      </p>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            type="button"
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== "all" ? (
              <span className="ml-1.5 text-xs tabular-nums opacity-70">
                {items.filter((i) => i.source === f.key).length}
              </span>
            ) : (
              <span className="ml-1.5 text-xs tabular-nums opacity-70">
                {items.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading gallery…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
          <ImageIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 font-display text-xl">No media yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once sellers and the community add photos and videos, they’ll
            appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <GalleryTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

// ─── Tile ──────────────────────────────────────────────────────────────

function GalleryTile({ item }: { item: GalleryItem }) {
  return (
    <Link
      to={item.href}
      className="group relative aspect-square overflow-hidden rounded-lg bg-secondary"
    >
      {item.mediaType === "video" ? (
        <>
          <video
            src={item.media}
            className="size-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/20">
            <span className="grid size-9 place-items-center rounded-full bg-background/80">
              <Film className="size-4" />
            </span>
          </div>
        </>
      ) : (
        <img
          src={item.media}
          alt={item.title ?? ""}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          loading="lazy"
        />
      )}

      {/* Dark gradient + info on hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-background/95 via-background/60 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
        {item.title ? (
          <p className="line-clamp-1 text-xs font-medium text-foreground">
            {item.title}
          </p>
        ) : null}
        <p className="line-clamp-1 text-[11px] text-muted-foreground">
          {item.authorName}
          {item.price != null ? ` · ${kesShort(item.price)}` : ""}
        </p>
      </div>

      {/* Source badge (small pill top-left) */}
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground backdrop-blur">
        {item.source === "car"
          ? "Car"
          : item.source === "part"
            ? "Part"
            : "Garage"}
      </span>
    </Link>
  );
}