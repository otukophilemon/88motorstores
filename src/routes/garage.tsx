import { createFileRoute, Link } from "@tanstack/react-router";
import { CarCard } from "@/components/car-card";
import { PartCard } from "@/components/part-card";
import { Button } from "@/components/ui/button";
import { carById, partById } from "@/lib/catalog";
import { useGarii } from "@/lib/store";

export const Route = createFileRoute("/garage")({ component: GaragePage });

function GaragePage() {
  const savedCars = useGarii((s) => s.savedCars);
  const savedParts = useGarii((s) => s.savedParts);
  const cars = savedCars.map(carById).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const parts = savedParts.map(partById).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Yours</p>
      <h1 className="font-display text-4xl font-semibold">Garage</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Saved on this device. Request an introduction whenever you are ready.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Cars</h2>
        {cars.length === 0 ? (
          <Empty to="/cars" label="Browse cars" />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold">Parts</h2>
        {parts.length === 0 ? (
          <Empty to="/parts" label="Browse parts" />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {parts.map((p) => (
              <PartCard key={p.id} part={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Empty({ to, label }: { to: "/cars" | "/parts"; label: string }) {
  return (
    <div className="mt-4 rounded-xl bg-card p-8 shadow-[var(--shadow-border)]">
      <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      <Button asChild className="mt-4" size="sm">
        <Link to={to}>{label}</Link>
      </Button>
    </div>
  );
}
