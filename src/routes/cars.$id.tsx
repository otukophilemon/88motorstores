import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  GitCompareArrows,
  Heart,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CarCard } from "@/components/car-card";
import { EnquireDialog } from "@/components/enquire-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyseCar } from "@/lib/analyse";
import { carById, cars, yardById } from "@/lib/catalog";
import { kes, km } from "@/lib/format";
import { useGarii } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cars/$id")({
  component: CarDetail,
});

function CarDetail() {
  const { id } = Route.useParams();
  const car = carById(id);
  if (!car) throw notFound();
  const yard = yardById(car.sellerId);
  const analysis = analyseCar(car);
  const saved = useGarii((s) => s.savedCars.includes(car.id));
  const compared = useGarii((s) => s.compareIds.includes(car.id));
  const toggleSavedCar = useGarii((s) => s.toggleSavedCar);
  const toggleCompare = useGarii((s) => s.toggleCompare);
  const [shot, setShot] = useState(car.image);

  const bandLabel =
    analysis.band === "below"
      ? "Under market"
      : analysis.band === "above"
        ? "Above market"
        : "Fair market";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link to="/cars" className="hover:text-foreground">
          Cars
        </Link>
        <span className="px-2">/</span>
        {car.make}
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-xl bg-secondary">
            <img src={shot} alt={car.title} className="img-cover aspect-video w-full" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {car.gallery.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setShot(src)}
                className={cn(
                  "overflow-hidden rounded-md",
                  shot === src && "ring-2 ring-ring",
                )}
              >
                <img src={src} alt="" className="img-cover aspect-video w-full" />
              </button>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap gap-2">
              <Badge variant={analysis.band === "below" ? "good" : analysis.band === "above" ? "warn" : "muted"}>
                {bandLabel}
              </Badge>
              {car.dutyPaid ? <Badge variant="outline">Duty paid</Badge> : null}
              {car.auctionGrade ? (
                <Badge variant="outline">Grade {car.auctionGrade}</Badge>
              ) : null}
              <Badge variant="muted">{car.origin}</Badge>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {car.year} · {car.trim}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-none">{car.title}</h1>
            <p className="mt-4 font-display text-4xl font-semibold tabular-nums">{kes(car.price)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Market value {kes(car.marketValue)} · 88Motor score{" "}
              <span className="tabular-nums text-foreground">{analysis.gariiScore}</span>
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {car.location}, {car.city}
              {yard ? ` · ${yard.name}` : null}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <Spec k="Kilometres" v={km(car.mileage)} />
              <Spec k="Fuel" v={car.fuel} />
              <Spec k="Gearbox" v={car.transmission} />
              <Spec k="Engine" v={car.engine} />
              <Spec k="Owners" v={String(car.owners)} />
              <Spec k="Condition" v={car.condition} />
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <EnquireDialog
                kind="car"
                targetId={car.id}
                subject={`${car.year} ${car.title} · ${kes(car.price)}`}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={saved ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => toggleSavedCar(car.id)}
                >
                  <Heart className={cn("size-4", saved && "fill-current")} />
                  {saved ? "In garage" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant={compared ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    const ok = toggleCompare(car.id);
                    if (!ok) toast.error("Compare holds three cars.");
                  }}
                >
                  <GitCompareArrows className="size-4" />
                  Compare
                </Button>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              You will not see the seller’s number. The desk introduces you on WhatsApp.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-12 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="font-display text-3xl font-semibold">The car</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{car.description}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {car.features.map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-5 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-2xl font-semibold">88Motor analyse</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row
              k="Ask vs market"
              v={`${analysis.priceDeltaPct > 0 ? "+" : ""}${Math.round(analysis.priceDeltaPct * 100)}%`}
            />
            <Row k="Km / year" v={`${Math.round(analysis.kmPerYear).toLocaleString("en-KE")} · ${analysis.kmBand}`} />
            <Row k="Fuel / year (18k km)" v={kes(analysis.annualFuelKes)} />
            <Row k="Comprehensive sketch" v={kes(analysis.insuranceKes)} />
            <Row k="12-month residual" v={kes(analysis.residual12m)} />
            <Row k="Demand" v={`${car.demand}/100`} />
          </dl>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {analysis.scoreNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      {analysis.similar.length ? (
        <section className="mt-14">
          <h2 className="font-display text-3xl font-semibold">Comparable stock</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.similar.slice(0, 3).map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      ) : null}

      {yard ? (
        <section className="mt-14 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Yard</p>
          <h2 className="font-display text-2xl font-semibold">{yard.name}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{yard.bio}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/yards/$id" params={{ id: yard.id }}>
              View yard
            </Link>
          </Button>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Also on 88Motor Stores</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars
            .filter((c) => c.id !== car.id && c.body === car.body)
            .slice(0, 3)
            .map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
        </div>
      </section>
    </main>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-secondary px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
      <p className="mt-0.5">{v}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}