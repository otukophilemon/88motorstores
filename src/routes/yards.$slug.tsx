import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  Calendar,
  MapPin,
  MessageCircle,
  Package,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UserListingCard } from "@/components/user-listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getListingsBySeller,
  getSellerProfile,
  type PublicListing,
  type SellerProfile,
} from "@/lib/listings/public-server";

export const Route = createFileRoute("/yards/$slug")({
  component: YardPage,
});

function YardPage() {
  const { slug } = Route.useParams();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      getSellerProfile({ data: { slug } }),
      getListingsBySeller({ data: { slug } }),
    ])
      .then(([p, l]) => {
        if (!p) {
          setNotFoundFlag(true);
          return;
        }
        setProfile(p);
        setListings(l);
      })
      .catch(() => setNotFoundFlag(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading yard…</p>
      </main>
    );
  }

  if (notFoundFlag || !profile) {
    throw notFound();
  }

  const isYard = profile.sellerType === "yard";
  const typeLabel = isYard ? "Yard" : "Dealer";

  const cars = listings.filter((l) => l.kind === "car");
  const parts = listings.filter((l) => l.kind === "part");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link to="/cars" className="hover:text-foreground">
          Yards &amp; dealers
        </Link>
      </p>

      {/* Header card */}
      <section className="mt-6 rounded-xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{typeLabel}</Badge>
              {profile.verified ? (
                <Badge variant="good">
                  <BadgeCheck className="mr-1 size-3" />
                  Verified
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              {profile.displayName}
            </h1>

            {profile.city ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {profile.city}
              </p>
            ) : null}

            {profile.bio ? (
              <p className="mt-5 max-w-2xl whitespace-pre-line text-muted-foreground">
                {profile.bio}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Member since{" "}
                {new Date(profile.memberSince).toLocaleDateString("en-KE", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="size-3.5" />
                {profile.completedDeals}{" "}
                {profile.completedDeals === 1 ? "deal" : "deals"} completed
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="size-3.5" />
                {listings.length}{" "}
                {listings.length === 1 ? "listing" : "listings"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <a
                href={`https://wa.me/254769679667?text=${encodeURIComponent(
                  `I'm interested in stock from ${profile.displayName} on 88Motor Stores`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" />
                WhatsApp the desk
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="tel:+254769679667">
                <Phone className="size-4" />
                Call the desk
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Vehicles */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-semibold">Vehicles</h2>
          {cars.length ? (
            <p className="text-sm text-muted-foreground">
              {cars.length} {cars.length === 1 ? "car" : "cars"} available
            </p>
          ) : null}
        </div>
        {cars.length === 0 ? (
          <div className="mt-6 rounded-xl bg-card p-8 text-center shadow-[var(--shadow-border)]">
            <p className="font-display text-xl">No cars on the floor right now.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check back soon or contact the desk to be notified.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((l) => (
              <UserListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Parts */}
      {parts.length > 0 ? (
        <section className="mt-12 pb-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-semibold">Parts</h2>
            <p className="text-sm text-muted-foreground">
              {parts.length} {parts.length === 1 ? "part" : "parts"}
            </p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {parts.map((l) => (
              <UserListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}