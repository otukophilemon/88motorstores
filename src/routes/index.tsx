import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Quote } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CarCard } from "@/components/car-card";
import { UserListingGrid } from "@/components/user-listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cars, nations, parts, yards } from "@/lib/catalog";
import { kesShort } from "@/lib/format";
import { getPublishedCars } from "@/lib/listings/public-server";
import type { PublicListing } from "@/lib/listings/public-server";

export const Route = createFileRoute("/")({ component: Home });

// TODO: replace with real testimonials once you have them.
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
  const [userCars, setUserCars] = useState<PublicListing[]>([]);
  const featured = cars.filter((c) => c.featured);
  const fresh = [...cars].sort((a, b) => a.daysListed - b.daysListed).slice(0, 4);

  useEffect(() => {
    void getPublishedCars()
      .then(setUserCars)
      .catch(() => setUserCars([]));
  }, []);

  function search(e: FormEvent) {
    e.preventDefault();
    void navigate({ to: "/cars", search: { q: q.trim() || undefined } });
  }

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
            <Stat label="Live cars" value={String(cars.length + userCars.length)} />
            <Stat label="Parts" value={String(parts.length)} />
            <Stat label="Clubs" value={String(nations.length)} />
          </dl>
        </div>
      </section>

      {/* 2. FRESH FROM THE COMMUNITY (moved up — only when there are listings) */}
      {userCars.length ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <HeaderRow
            kicker="From our sellers"
            title="Fresh from the community"
            to="/cars"
            link="All cars"
          />
          <div className="mt-8">
            <UserListingGrid listings={userCars.slice(0, 6)} />
          </div>
        </section>
      ) : null}

      {/* 3. FEATURED FROM THE YARDS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <HeaderRow
          kicker="This week"
          title="Featured from the yards"
          to="/cars"
          link="All cars"
        />
        <div className="mt-8 grid gap-5">
          {featured.slice(0, 2).map((car) => (
            <CarCard key={car.id} car={car} featured />
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(2, 5).map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </section>

      {/* 4. TESTIMONIAL STRIP */}
      <section className="border-y border-border bg-card">
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
                className="flex h-full flex-col justify-between rounded-xl bg-background p-6 shadow-[var(--shadow-border)]"
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

      {/* 5. JUST IN */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <HeaderRow kicker="Just in" title="Fresh on the floor" to="/cars" link="Browse" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fresh.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </section>

      {/* 6. PARTS */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <HeaderRow kicker="Spares" title="Parts with fitment" to="/parts" link="All parts" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {parts.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              to="/parts/$id"
              params={{ id: p.id }}
              className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
            >
              <img src={p.image} alt="" className={`${p.crop} h-36 w-full`} />
              <div className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {p.category}
                </p>
                <p className="mt-1 font-display text-lg font-semibold leading-tight">
                  {p.title}
                </p>
                <p className="mt-2 font-display text-lg tabular-nums">{kesShort(p.price)}</p>
              </div>
            </Link>
          ))}
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

      {/* 8. YARDS */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <HeaderRow kicker="Yards" title="Where the stock lives" to="/cars" link="See stock" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {yards
              .filter((y) => y.kind !== "Private")
              .map((y) => (
                <Link
                  key={y.id}
                  to="/yards/$id"
                  params={{ id: y.id }}
                  className="rounded-xl bg-background p-5 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {y.city} · est. {y.established}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold">{y.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{y.bio}</p>
                  <p className="mt-4 text-sm">
                    {y.speciality} · {y.rating.toFixed(1)} desk score
                  </p>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* 9. SELL CTA */}
      <section className="relative overflow-hidden">
        <img
          src="/images/cars/prado.jpg"
          alt=""
          className="img-cover absolute inset-0 size-full opacity-35"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-20 sm:px-6">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Sell with 88Motor Stores</p>
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