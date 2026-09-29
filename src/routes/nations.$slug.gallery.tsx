import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Film, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getClub, type Club } from "@/lib/clubs/management";
import {
  listClubGalleryItems,
  type GalleryItem,
} from "@/lib/gallery/server";

export const Route = createFileRoute("/nations/$slug/gallery")({
  component: ClubGalleryPage,
});

function ClubGalleryPage() {
  const { slug } = Route.useParams();
  const [club, setClub] = useState<Club | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      getClub({ data: { slug } }).catch(() => null),
      listClubGalleryItems({ data: { clubSlug: slug, limit: 200 } }).catch(
        () => [],
      ),
    ])
      .then(([c, g]) => {
        if (!c) {
          setNotFoundState(true);
          return;
        }
        setClub(c);
        setItems(g);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading gallery…</p>
      </main>
    );
  }

  if (notFoundState || !club) throw notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/nations/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {club.name}
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">
            Club gallery
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold">
            {club.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Every photo and video shared in this club — threads and replies.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/nations/$slug" params={{ slug }}>
            Back to club
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
          <ImageIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 font-display text-xl">Nothing shared yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            When members post photos or videos in threads, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <GalleryTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-background/95 via-background/60 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
        {item.title ? (
          <p className="line-clamp-1 text-xs font-medium text-foreground">
            {item.title}
          </p>
        ) : null}
        <p className="line-clamp-1 text-[11px] text-muted-foreground">
          {item.authorName}
        </p>
      </div>
    </Link>
  );
}