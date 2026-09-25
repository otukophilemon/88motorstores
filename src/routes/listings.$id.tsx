import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { EnquireDialog } from "@/components/enquire-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kes, km } from "@/lib/format";
import {
  getPublishedListing,
  type PublicListing,
} from "@/lib/listings/public-server";

export const Route = createFileRoute("/listings/$id")({
  component: UserListingDetail,
});

function UserListingDetail() {
  const { id } = Route.useParams();
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    setLoading(true);
    void getPublishedListing({ data: { id } })
      .then((l) => {
        if (!l) setNotFoundState(true);
        else setListing(l);
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading listing…</p>
      </main>
    );
  }

  if (notFoundState || !listing) {
    throw notFound();
  }

  const statusVariant =
    listing.status === "Available"
      ? ("good" as const)
      : listing.status === "Reserved"
        ? ("warn" as const)
        : ("muted" as const);

  // Build spec list from whatever fields are present
  const specs: { k: string; v: string }[] = [];
  if (listing.year) specs.push({ k: "Year", v: String(listing.year) });
  if (listing.mileage) specs.push({ k: "Kilometres", v: km(listing.mileage) });
  if (listing.fuel) specs.push({ k: "Fuel", v: listing.fuel });
  if (listing.transmission) specs.push({ k: "Gearbox", v: listing.transmission });
  if (listing.body) specs.push({ k: "Body", v: listing.body });
  if (listing.category) specs.push({ k: "Category", v: listing.category });
  if (listing.condition) specs.push({ k: "Condition", v: listing.condition });
  if (listing.brand) specs.push({ k: "Brand", v: listing.brand });
  if (listing.oem) specs.push({ k: "OEM", v: listing.oem });
  if (listing.stock) specs.push({ k: "Stock", v: String(listing.stock) });

  const backTo = listing.kind === "car" ? "/cars" : "/parts";
  const backLabel = listing.kind === "car" ? "Cars" : "Parts";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link to={backTo} className="hover:text-foreground">
          {backLabel}
        </Link>
        <span className="px-2">/</span>
        {listing.kind === "car" ? "Vehicle" : "Part"} listing
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-12">
        {/* Left: image placeholder + description */}
        <div className="lg:col-span-7">
          <div className="flex aspect-video items-center justify-center rounded-xl bg-secondary">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {listing.kind === "car" ? "Vehicle" : "Part"} · Photos on request
            </span>
          </div>

          <section className="mt-10">
            <h2 className="font-display text-3xl font-semibold">About this listing</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">
              {listing.description || "No additional notes provided."}
            </p>
          </section>

          {listing.fitment ? (
            <section className="mt-8">
              <h2 className="font-display text-2xl font-semibold">Fitment</h2>
              <p className="mt-2 text-muted-foreground">{listing.fitment}</p>
            </section>
          ) : null}
        </div>

        {/* Right: price + specs + CTA */}
        <aside className="lg:col-span-5">
          <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant}>{listing.status}</Badge>
              <Badge variant="outline">
                {listing.kind === "car" ? "Car" : "Part"}
              </Badge>
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight">
              {listing.title}
            </h1>
            <p className="mt-4 font-display text-4xl font-semibold tabular-nums">
              {kes(listing.price)}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {listing.location}
            </p>

            {listing.make || listing.model ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {[listing.make, listing.model].filter(Boolean).join(" ")}
              </p>
            ) : null}

            {specs.length ? (
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {specs.map((s) => (
                  <div key={s.k} className="rounded-md bg-secondary px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {s.k}
                    </p>
                    <p className="mt-0.5">{s.v}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2">
              <EnquireDialog
                kind={listing.kind === "car" ? "car" : "part"}
                targetId={listing.id}
                subject={`${listing.title} · ${kes(listing.price)}`}
              />
              <Button variant="outline" asChild>
                <a
                  href={`https://wa.me/254769679667?text=${encodeURIComponent(
                    `I'm interested in: ${listing.title} (${kes(listing.price)}) on 88Motor Stores`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp the desk
                </a>
              </Button>
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              You will not see the seller’s number. The desk introduces you on
              WhatsApp after we verify the listing.
            </p>

            <p className="mt-4 text-xs text-muted-foreground">
              Listed by <span className="text-foreground">{listing.sellerName}</span>
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Need help?
            </p>
            <ul className="mt-3 grid gap-3 text-sm">
              <li>
                <a
                  href="tel:+254769679667"
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Phone className="size-4 shrink-0" />
                  <span>Call · +254 769 679 667</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:otuko88motorstores@gmail.com"
                  className="flex items-center gap-2 break-all transition-colors hover:text-primary"
                >
                  <Mail className="size-4 shrink-0" />
                  <span>otuko88motorstores@gmail.com</span>
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>Nakuru, Kenya</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}