import { Link } from "@tanstack/react-router";
import { BadgeCheck, ImageIcon, MapPin, MessageCircle } from "lucide-react";
import { EnquireDialog } from "@/components/enquire-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kes } from "@/lib/format";
import type { PublicListing } from "@/lib/listings/public-server";

/**
 * Card for a public, seller-submitted listing (from the database).
 *
 * Shows the first uploaded photo as the cover. Falls back to a
 * "Photos on request" placeholder if the listing has no images.
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

  const isBusiness =
    listing.sellerType === "dealer" || listing.sellerType === "yard";
  const sellerLabel =
    listing.sellerType === "yard"
      ? "Yard"
      : listing.sellerType === "dealer"
        ? "Dealer"
        : null;

  const cover = listing.images[0];
  const extra = listing.images.length - 1;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-border-hover)]">
      <Link
        to="/listings/$id"
        params={{ id: listing.id }}
        className="relative block aspect-video overflow-hidden bg-secondary"
        aria-label={`View ${listing.title}`}
      >
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            className="size-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {listing.kind === "car" ? "Vehicle" : "Part"} · Photos on request
            </span>
          </div>
        )}

        {extra > 0 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[11px] font-medium backdrop-blur">
            <ImageIcon className="size-3" />
            +{extra}
          </span>
        ) : null}

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

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {isBusiness && listing.sellerSlug ? (
            <Link
              to="/yards/$slug"
              params={{ slug: listing.sellerSlug }}
              className="inline-flex items-center gap-1.5 text-foreground hover:underline"
            >
              {listing.sellerVerified ? (
                <BadgeCheck className="size-3.5 text-primary" />
              ) : null}
              <span className="font-medium">{listing.sellerName}</span>
            </Link>
          ) : (
            <span>
              Listed by{" "}
              <span className="text-foreground">{listing.sellerName}</span>
            </span>
          )}
          {sellerLabel ? (
            <Badge variant="outline" className="text-[10px]">
              {sellerLabel}
            </Badge>
          ) : null}
        </div>

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