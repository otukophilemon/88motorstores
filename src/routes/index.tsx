import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Quote } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { UserListingCard } from "@/components/user-listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nations, parts as demoParts, cars as demoCars } from "@/lib/catalog";
import {
  getMarketplaceStats,
  getPrivateMixedListings,
  getYardMixedListings,
  getPrivateCars,
  getYardCars,
  getPrivateParts,
  getYardParts,
  type MarketplaceStats,
  type PublicListing,
} from "@/lib/listings/public-server";

export const Route = createFileRoute("/")({ component: Home });

const TESTIMONIALS = [
  {
    quote:
      "I listed my Prado on a Sunday and had three serious enquiries by Tuesday. The desk filtered the tyre-kickers before I ever got a call.",
    name: "Achieng M.",
    role: "Seller · Nakuru",
  },
  {
    quote:
      "Bought a Harrier through 88Motor Stores. No cold calls to strangers, no meeting in a random parking lot. The desk handled the introduction properly.",
    name: "Brian K.",
    role: "Buyer · Nairobi",
  },
  {
    quote:
      "Finally a Kenyan marketplace that doesn’t leak my number to everyone who scrolls past. Sellers stay private, buyers stay serious.",
    name: "Wanjiku N.",
    role: "Seller · Mombasa",
  },
];

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // Sections 2 & 3: mixed random feeds
  const [privateMixed, setPrivateMixed] = useState<PublicListing[]>([]);
  const [yardMixed, setYardMixed] = useState<PublicListing[]>([]);
  // Sections 5 & 6: split by kind
  const [privateCars, setPrivateCars] = useState<PublicListing[]>([]);
  const [yardCars, setYardCars] = useState<PublicListing[]>([]);
  const [privateParts, setPrivateParts] = useState<PublicListing[]>([]);
  const [yardParts, setYardParts] = useState<PublicListing[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);

  useEffect(() => {
    void Promise.all([
      getPrivateMixedListings({ data: { limit: 8 } }).catch(() => []),
      getYardMixedListings({ data: { limit: 8 } }).catch(() => []),
      getPrivateCars({ data: { limit: 4 } }).catch(() => []),
      getYardCars({ data: { limit: 4 } }).catch(() => []),
      getPrivateParts({ data: { limit: 4 } }).catch(() => []),
      getYardParts({ data: { limit: 4 } }).catch(() => []),
      getMarketplaceStats().catch(() => null),
    ]).then(([pm, ym, pc, yc, pp, yp, st]) => {
      setPrivateMixed(pm);
      setYardMixed(ym);
      setPrivateCars(pc);
      setYardCars(yc);
      setPrivateParts(pp);
      setYardParts(yp);
      setStats(st);
    });
  }, []);

  function search(e: FormEvent) {
    e.preventDefault();
    void navigate({ to: "/cars", search: { q: q.trim() || undefined } });
  }

  const totalLive = demoCars.length + (stats?.listings ?? 0);
  const totalParts = demoParts.length;

  return (
    <main>
      {/* 1. HERO */}
      <section className="relative min-h-[78dvh] overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="Nairobi expressway at dusk"
          className="img-cover absolute inset-0 size-full"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-background/20" />
        <div className="relative mx-auto flex min-h-[78dvh] max-w-7xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6">
          <div className="stagger-in max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              Kenya · cars · parts · clubs
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
              The Kenyan yard, rebuilt.
            </h1>
            <p className="mt-5 max-w-lg text-base text-foreground/85 sm:text-lg">
              Browse stock from yards across the country, analyse the ask, then
              request an introduction. You never cold-call a seller — the
              88Motor Stores desk makes the connection.
            </p>
          </div>
          <form
            onSubmit={search}
            className="mt-8 flex w-full max-w-xl flex-col gap-2 rounded-xl bg-card/90 p-2 shadow-[var(--shadow-border)] sm:flex-row sm:items-center"
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Harrier, Vitz, Prado, Ngong Road…"
              className="h-12 border-0 bg-transparent shadow-none"
              aria-label="Search cars"
            />
            <Button type="submit" size="lg" className="sm:w-auto">
              Search stock
            </Button>
          </form>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            <Stat label="Live cars" value={String(totalLive)} />
            <Stat label="Parts" value={String(totalParts)} />
            <Stat label="Clubs" value={String(nations.length)} />
          </dl>
        </div>
      </section>

      {/* 2. FROM OUR SELLERS — private, MIXED cars+parts */}
      {privateMixed.length ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <HeaderRow
            kicker="From our sellers"
            title="Fresh from the community"
            to="/cars"
            link="Browse all"
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {privateMixed.map((l) => (
              <UserListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 3. FEATURED FROM THE YARDS — yards/dealers, MIXED cars+parts */}
      {yardMixed.length ? (
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <HeaderRow
              kicker="This week"
              title="Featured from the yards"
              to="/cars"
              link="See stock"
            />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {yardMixed.map((l) => (
                <UserListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. TESTIMONIAL STRIP */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">
              Why sellers and buyers choose us
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Trusted on both sides of the deal.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="flex h-full flex-col justify-between rounded-xl bg-card p-6 shadow-[var(--shadow-border)]"
              >
                <Quote className="size-6 text-primary/70" aria-hidden="true" />
                <blockquote className="mt-4 text-base leading-relaxed text-foreground/90">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-medium">
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm">
                    <span className="block font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CARS — individual on top, yards below */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <HeaderRow kicker="Cars" title="Browse the floor" to="/cars" link="All cars" />

        <div className="mt-10">
          <RowLabel label="From individual sellers" />
          {privateCars.length ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {privateCars.map((l) => (
                <UserListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              No individual-seller cars yet.
            </p>
          )}
        </div>

        <div className="mt-14">
          <RowLabel label="From yards & dealers" />
          {yardCars.length ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {yardCars.map((l) => (
                <UserListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">No yard cars yet.</p>
          )}
        </div>
      </section>

      {/* 6. PARTS — individual on top, yards below */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <HeaderRow kicker="Spares" title="Parts with fitment" to="/parts" link="All parts" />

          <div className="mt-10">
            <RowLabel label="From individual sellers" />
            {privateParts.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {privateParts.map((l) => (
                  <UserListingCard key={l.id} listing={l} />
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                No individual-seller parts yet.
              </p>
            )}
          </div>

          <div className="mt-14">
            <RowLabel label="From yards & dealers" />
            {yardParts.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {yardParts.map((l) => (
                  <UserListingCard key={l.id} listing={l} />
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">No yard parts yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* 7. CLUBS */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <HeaderRow kicker="Clubs" title="Find your people" to="/nations" link="All clubs" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nations.map((n) => (
              <Link
                key={n.slug}
                to="/nations/$slug"
                params={{ slug: n.slug }}
                className="group relative min-h-52 overflow-hidden rounded-xl"
              >
                <img
                  src={n.cover}
                  alt=""
                  className="img-cover absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
                <div className="relative flex h-full min-h-52 flex-col justify-end p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">
                    {n.members.toLocaleString("en-KE")} members
                  </p>
                  <h3 className="font-display text-2xl font-semibold">{n.name}</h3>
                  <p className="text-sm text-foreground/80">{n.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 8. WHERE THE STOCK LIVES — live stats */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">
            The marketplace
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
            Sellers from every corner of Kenya.
          </h2>
          <p className="mt-6 text-lg text-foreground/85 sm:text-xl">
            {stats
              ? `${stats.privateSellers}+ individual sellers · ${stats.yards} verified yards & dealers · across ${stats.cities} ${stats.cities === 1 ? "city" : "cities"} — all brought together on 88Motor Stores.`
              : "Loading marketplace stats…"}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/cars">
                Browse cars
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sell">List with us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 9. SELL CTA */}
      <section className="relative overflow-hidden border-t border-border">
        <img
          src="/images/cars/prado.jpg"
          alt=""
          className="img-cover absolute inset-0 size-full opacity-35"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-20 sm:px-6">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">
            Sell with 88Motor Stores
          </p>
          <h2 className="max-w-xl font-display text-4xl font-semibold sm:text-5xl">
            Market the car. Keep your number.
          </h2>
          <p className="max-w-lg text-muted-foreground">
            List a vehicle or a part. Enquiries land on the desk, we qualify the
            buyer, then we introduce you. No tyre-kicker circus on your WhatsApp.
          </p>
          <Button asChild size="lg">
            <Link to="/sell">
              List with 88Motor Stores
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="font-display text-3xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function RowLabel({ label }: { label: string }) {
  return (
    <div className="border-b border-border pb-3">
      <h3 className="font-display text-xl font-semibold">{label}</h3>
    </div>
  );
}

function HeaderRow({
  kicker,
  title,
  to,
  link,
}: {
  kicker: string;
  title: string;
  to: "/cars" | "/parts" | "/nations";
  link: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{kicker}</p>
        <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link to={to}>
          {link}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}