import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { listClubs, type Club } from "@/lib/clubs/management";

export const Route = createFileRoute("/nations/")({ component: NationsPage });

function NationsPage() {
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listClubs()
      .then(setClubs)
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Community
          </p>
          <h1 className="font-display text-4xl font-semibold">Clubs</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Subaru STI Club, Premio Nyoka Club, Prado Club — boards for the cars
            Kenyans actually run. Meets, fitment, and honest advice. Sales stay
            on 88Motor Stores.
          </p>
        </div>
        <SignedIn>
          <Button asChild>
            <Link to="/create-club">Create a club</Link>
          </Button>
        </SignedIn>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading clubs…</p>
      ) : !clubs || clubs.length === 0 ? (
        <div className="mt-10 rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">No clubs yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first to start one.
          </p>
          <SignedOut>
            <Button asChild className="mt-6">
              <Link to="/sign-up">Create account to start a club</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button asChild className="mt-6">
              <Link to="/create-club">Create a club</Link>
            </Button>
          </SignedIn>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <Link
              key={c.id}
              to="/nations/$slug"
              params={{ slug: c.slug }}
              className="group relative min-h-64 overflow-hidden rounded-xl"
            >
              {c.cover ? (
                <img
                  src={c.cover}
                  alt=""
                  className="img-cover absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="absolute inset-0 bg-secondary" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
              <div className="relative flex h-full min-h-64 flex-col justify-end p-6">
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-primary">
                  <Users className="size-3.5" />
                  {c.memberCount}{" "}
                  {c.memberCount === 1 ? "member" : "members"}
                </p>
                <h2 className="font-display text-3xl font-semibold">{c.name}</h2>
                {c.tagline ? (
                  <p className="text-sm text-foreground/85">{c.tagline}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}