import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cars, marketSeries } from "@/lib/catalog";
import { citySupply } from "@/lib/analyse";
import { kes, kesShort } from "@/lib/format";

export const Route = createFileRoute("/insights")({ component: InsightsPage });

function InsightsPage() {
  const avg = Math.round(cars.reduce((a, c) => a + c.price, 0) / cars.length);
  const diesel = cars.filter((c) => c.fuel === "Diesel").length;
  const importShare = Math.round(
    (cars.filter((c) => c.origin === "Import").length / cars.length) * 100,
  );
  const cities = citySupply();
  const bodies = Object.entries(
    cars.reduce<Record<string, number>>((acc, c) => {
      acc[c.body] = (acc[c.body] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, count]) => ({ name, count }));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Market</p>
      <h1 className="font-display text-4xl font-semibold">Insights</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        A live sketch of 88Motor Stores stock — not NTSA, not a bank valuation.
        Use it to read an asking price before you request the intro.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <Tile k="Average ask" v={kesShort(avg)} />
        <Tile k="Import share" v={`${importShare}%`} />
        <Tile k="Diesel on the floor" v={String(diesel)} />
      </dl>

      <section className="mt-10 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-2xl font-semibold">Ask index · KSh millions</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Rolling median-style index by marque on 88Motor Stores.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marketSeries}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="toyota" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="subaru" stroke="var(--color-good)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mazda" stroke="var(--color-warn)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bmw" stroke="var(--color-muted-foreground)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Toyota · Subaru · Mazda · BMW
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-2xl font-semibold">Body mix</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bodies}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-2xl font-semibold">Supply by city</h2>
          <ul className="mt-4 divide-y divide-border">
            {cities.map((c) => (
              <li key={c.city} className="flex items-center justify-between py-3 text-sm">
                <span>{c.city}</span>
                <span className="tabular-nums text-muted-foreground">
                  {c.cars} cars · avg {kes(c.avg)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{k}</dt>
      <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{v}</dd>
    </div>
  );
}