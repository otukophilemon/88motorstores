import { createFileRoute, Link } from "@tanstack/react-router";
import { nations } from "@/lib/catalog";

export const Route = createFileRoute("/nations/")({ component: NationsPage });

function NationsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Community</p>
      <h1 className="font-display text-4xl font-semibold">Clubs</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Subaru STI Club, Premio Nyoka Club, Prado Club — boards for the cars
        Kenyans actually run. Meets, fitment, and honest advice. Sales stay on
        88Motor Stores.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {nations.map((n) => (
          <Link
            key={n.slug}
            to="/nations/$slug"
            params={{ slug: n.slug }}
            className="group relative min-h-64 overflow-hidden rounded-xl"
          >
            <img
              src={n.cover}
              alt=""
              className="img-cover absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
            <div className="relative flex h-full min-h-64 flex-col justify-end p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-primary">
                {n.members.toLocaleString("en-KE")} members · {n.threads.length} live threads
              </p>
              <h2 className="font-display text-3xl font-semibold">{n.name}</h2>
              <p className="text-sm text-foreground/85">{n.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}