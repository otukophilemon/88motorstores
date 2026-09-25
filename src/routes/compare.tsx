import { createFileRoute, Link } from "@tanstack/react-router";
import { CarCard } from "@/components/car-card";
import { Button } from "@/components/ui/button";
import { analyseCar } from "@/lib/analyse";
import { cars, carById } from "@/lib/catalog";
import { kes, km } from "@/lib/format";
import { useGarii } from "@/lib/store";

export const Route = createFileRoute("/compare")({ component: ComparePage });

function ComparePage() {
  const ids = useGarii((s) => s.compareIds);
  const clear = useGarii((s) => s.clearCompare);
  const selected = ids.map(carById).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const analyses = selected.map((c) => analyseCar(c));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Bay</p>
          <h1 className="font-display text-4xl font-semibold">Compare</h1>
        </div>
        {selected.length ? (
          <Button variant="outline" onClick={clear}>
            Clear bay
          </Button>
        ) : null}
      </div>

      {selected.length === 0 ? (
        <div className="mt-10 rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">The bay is empty.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add up to three cars from any listing card.
          </p>
          <Button asChild className="mt-6">
            <Link to="/cars">Browse cars</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr>
                <th className="w-36 p-3 text-left text-muted-foreground"> </th>
                {selected.map((c) => (
                  <th key={c.id} className="p-3 text-left">
                    <Link
                      to="/cars/$id"
                      params={{ id: c.id }}
                      className="font-display text-xl font-semibold"
                    >
                      {c.title}
                    </Link>
                    <p className="font-display text-lg tabular-nums">{kes(c.price)}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Year" cells={selected.map((c) => String(c.year))} />
              <Row label="City" cells={selected.map((c) => c.city)} />
              <Row label="Kilometres" cells={selected.map((c) => km(c.mileage))} />
              <Row label="Fuel" cells={selected.map((c) => c.fuel)} />
              <Row label="Gearbox" cells={selected.map((c) => c.transmission)} />
              <Row label="Engine" cells={selected.map((c) => c.engine)} />
              <Row label="Owners" cells={selected.map((c) => String(c.owners))} />
              <Row
                label="Ask vs market"
                cells={analyses.map(
                  (a) =>
                    `${a.priceDeltaPct > 0 ? "+" : ""}${Math.round(a.priceDeltaPct * 100)}%`,
                )}
              />
              <Row
                label="88Motor score"
                cells={analyses.map((a) => String(a.gariiScore))}
              />
              <Row
                label="Km / year"
                cells={analyses.map((a) => Math.round(a.kmPerYear).toLocaleString("en-KE"))}
              />
              <Row
                label="Fuel / year"
                cells={analyses.map((a) => kes(a.annualFuelKes))}
              />
              <Row label="Duty" cells={selected.map((c) => (c.dutyPaid ? "Paid" : "Check"))} />
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold">Add from the floor</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars
            .filter((c) => !ids.includes(c.id))
            .slice(0, 6)
            .map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
        </div>
      </section>
    </main>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-t border-border">
      <th className="p-3 text-left font-medium text-muted-foreground">{label}</th>
      {cells.map((cell, i) => (
        <td key={`${label}-${i}`} className="p-3 tabular-nums">
          {cell}
        </td>
      ))}
    </tr>
  );
}