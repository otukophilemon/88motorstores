import { Link } from "@tanstack/react-router";
import { MapPin, MessageCircle } from "lucide-react";
import { EnquireDialog } from "@/components/enquire-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kes } from "@/lib/format";
import type { PublicListing } from "@/lib/listings/public-server";

/**
 * Card for a public, seller-submitted listing (from the database).
 *
 * Distinct from CarCard/PartCard — those render demo data from catalog.ts.
 * This one shows only what the seller chose to make public: no phone, no email.
 * Buyers contact the desk via EnquireDialog.
 */
export function UserListingCard({ listing }: { listing: PublicListing }) {
  const statusVariant =
    listing.status === "Available"
      ? ("good" as const)
      : listing.status === "Reserved"
        ? ("warn" as const)
        : ("muted" as const);

  const specs: string[] = [];
  if (listing.year) specs.push(String(listing.year));
  if (listing.mileage) specs.push(`${listing.mileage.toLocaleString("en-KE")} km`);
  if (listing.fuel) specs.push(listing.fuel);
  if (listing.transmission) specs.push(listing.transmission);
  if (listing.brand) specs.push(listing.brand);
  if (listing.condition) specs.push(listing.condition);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-border-hover)]">
      <Link
        to="/listings/$id"
        params={{ id: listing.id }}
        className="relative flex aspect-video items-center justify-center bg-secondary transition-colors hover:bg-secondary/80"
        aria-label={`View ${listing.title}`}
      >
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {listing.kind === "car" ? "Vehicle" : "Part"} · Photos on request
        </span>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant={statusVariant}>{listing.status}</Badge>
          <Badge variant="outline">
            {listing.kind === "car" ? "Car" : "Part"}
          </Badge>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <MapPin className="size-3" />
            {listing.location}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
            <Link
              to="/listings/$id"
              params={{ id: listing.id }}
              className="hover:underline"
            >
              {listing.title}
            </Link>
          </h3>
        </div>

        <p className="font-display text-2xl font-semibold tabular-nums">
          {kes(listing.price)}
        </p>

        {specs.length ? (
          <p className="text-sm text-muted-foreground">{specs.join(" · ")}</p>
        ) : null}

        {listing.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {listing.description}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Listed by <span className="text-foreground">{listing.sellerName}</span>
        </p>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <EnquireDialog
            kind={listing.kind === "car" ? "car" : "part"}
            targetId={listing.id}
            subject={`${listing.title} · ${kes(listing.price)}`}
            triggerLabel="Request introduction"
            triggerClassName="flex-1"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="WhatsApp the desk"
            asChild
          >
            <a
              href={`https://wa.me/254769679667?text=${encodeURIComponent(
                `I'm interested in: ${listing.title} (${kes(listing.price)}) on 88Motor Stores`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function UserListingGrid({ listings }: { listings: PublicListing[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l) => (
        <UserListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}