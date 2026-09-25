import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CarCard } from "@/components/car-card";
import { EnquireDialog } from "@/components/enquire-dialog";
import { PartCard } from "@/components/part-card";
import { carsForYard, partsForYard, yardById } from "@/lib/catalog";

export const Route = createFileRoute("/yards/$id")({ component: YardPage });

function YardPage() {
  const { id } = Route.useParams();
  const yard = yardById(id);
  if (!yard) throw notFound();
  const stock = carsForYard(yard.id);
  const spares = partsForYard(yard.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="px-2">/</span>
        Yards
      </p>
      <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {yard.kind} · {yard.city} · est. {yard.established}
      </p>
      <h1 className="font-display text-4xl font-semibold">{yard.name}</h1>
      <p className="mt-2 text-muted-foreground">{yard.location}</p>
      <p className="mt-4 max-w-2xl text-muted-foreground">{yard.bio}</p>
      <p className="mt-3 text-sm">
        {yard.speciality} · desk score {yard.rating.toFixed(1)}
      </p>
      <div className="mt-6">
        <EnquireDialog
          kind="listing"
          targetId={yard.id}
          subject={`Talk to ${yard.name}`}
          triggerLabel="Request a yard introduction"
        />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Vehicles</h2>
        {stock.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No cars on the floor right now.</p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stock.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        )}
      </section>

      {spares.length ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Parts from this yard</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spares.map((p) => (
              <PartCard key={p.id} part={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
