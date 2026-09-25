import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { kes } from "@/lib/format";
import {
  deleteListing,
  getEnquiries,
  getPendingListings,
  getPublishedListings,
  markEnquiryIntroduced,
  publishListing,
  unpublishListing,
  type AdminEnquiry,
  type AdminListing,
} from "@/lib/listings/admin-server";

export const Route = createFileRoute("/desk")({ component: DeskPage });

type AccessState = "loading" | "signed_out" | "signed_in";

function DeskPage() {
  const { user, isPending } = useCurrentUserState();
  const [authorized, setAuthorized] = useState<AccessState>("loading");

  // Actually checking role requires calling a server function. We use
  // getPendingListings as the canary — if it returns, you're admin. If it
  // throws Forbidden, you're not.
  const [pending, setPending] = useState<AdminListing[] | null>(null);
  const [published, setPublished] = useState<AdminListing[] | null>(null);
  const [enquiries, setEnquiries] = useState<AdminEnquiry[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load on mount (client-side only — this is an admin tool).
  if (!loaded && !isPending) {
    setLoaded(true);
    if (!user) {
      setAuthorized("signed_out");
    } else {
      void (async () => {
        try {
          const [p, pub, enq] = await Promise.all([
            getPendingListings(),
            getPublishedListings(),
            getEnquiries(),
          ]);
          setPending(p);
          setPublished(pub);
          setEnquiries(enq);
          setAuthorized("signed_in");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes("forbidden")) {
            setForbidden(true);
            setAuthorized("signed_in");
          } else if (msg.toLowerCase().includes("unauthorized")) {
            setAuthorized("signed_out");
          } else {
            toast.error("Desk failed to load: " + msg);
            setAuthorized("signed_in");
          }
        }
      })();
    }
  }

  if (isPending || authorized === "loading") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading desk…</p>
      </main>
    );
  }

  if (authorized === "signed_out") {
    return <RedirectToSignIn />;
  }

  if (forbidden) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Desk</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">Not authorized</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          The desk is for the 88Motor Stores operator. Your account doesn’t have
          admin access.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to home</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
      <h1 className="font-display text-4xl font-semibold">88Motor Stores desk</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Review submitted listings, publish what’s ready, and track buyer
        introductions. Seller contacts are visible here only.
      </p>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-border)]">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Reach the desk
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li>
            <a
              href="tel:+254769679667"
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <Phone className="size-4 shrink-0" />
              <span>Call · +254 769 679 667</span>
            </a>
          </li>
          <li>
            <a
              href="https://wa.me/254769679667"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <MessageCircle className="size-4 shrink-0" />
              <span>WhatsApp the desk</span>
            </a>
          </li>
          <li className="sm:col-span-2">
            <a
              href="mailto:otuko88motorstores@gmail.com"
              className="flex items-center gap-2 break-all text-sm transition-colors hover:text-primary"
            >
              <Mail className="size-4 shrink-0" />
              <span>otuko88motorstores@gmail.com</span>
            </a>
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            <MapPin className="size-4 shrink-0" />
            <span>Nakuru, Kenya</span>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          Pending listings
          {pending ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({pending.length})
            </span>
          ) : null}
        </h2>
        {pending === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No pending listings. Sellers’ submissions appear here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {pending.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onChange={() => {
                  void refresh(setPending, setPublished, setEnquiries);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          Published
          {published ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({published.length})
            </span>
          ) : null}
        </h2>
        {published === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : published.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing published yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {published.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onChange={() => {
                  void refresh(setPending, setPublished, setEnquiries);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 mb-16">
        <h2 className="font-display text-2xl font-semibold">
          Buyer enquiries
          {enquiries ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({enquiries.length})
            </span>
          ) : null}
        </h2>
        {enquiries === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : enquiries.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No enquiries yet. They appear when buyers request introductions.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {enquiries.map((e) => (
              <EnquiryCard
                key={e.id}
                enquiry={e}
                onChange={() => {
                  void refresh(setPending, setPublished, setEnquiries);
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

async function refresh(
  setPending: (v: AdminListing[]) => void,
  setPublished: (v: AdminListing[]) => void,
  setEnquiries: (v: AdminEnquiry[]) => void,
) {
  try {
    const [p, pub, enq] = await Promise.all([
      getPendingListings(),
      getPublishedListings(),
      getEnquiries(),
    ]);
    setPending(p);
    setPublished(pub);
    setEnquiries(enq);
  } catch (err) {
    toast.error("Refresh failed: " + (err instanceof Error ? err.message : String(err)));
  }
}

function ListingCard({
  listing,
  onChange,
}: {
  listing: AdminListing;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<{ ok: boolean }>) {
    setBusy(true);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(label);
        onChange();
      } else {
        toast.error("Action failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const specs: string[] = [];
  if (listing.year) specs.push(String(listing.year));
  if (listing.mileage) specs.push(`${listing.mileage.toLocaleString("en-KE")} km`);
  if (listing.fuel) specs.push(listing.fuel);
  if (listing.transmission) specs.push(listing.transmission);
  if (listing.body) specs.push(listing.body);
  if (listing.brand) specs.push(listing.brand);
  if (listing.category) specs.push(listing.category);

  return (
    <li className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={listing.published ? "default" : "muted"}>
              {listing.published ? "Published" : "Pending"}
            </Badge>
            <Badge variant="outline">{listing.kind}</Badge>
            <Badge variant="outline">{listing.status}</Badge>
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold">{listing.title}</h3>
          <p className="mt-1 text-sm">
            {kes(listing.price)} · {listing.location}
            {listing.make ? ` · ${listing.make}` : ""}
            {listing.model ? ` ${listing.model}` : ""}
          </p>
          {specs.length ? (
            <p className="mt-1 text-xs text-muted-foreground">{specs.join(" · ")}</p>
          ) : null}
          {listing.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{listing.description}</p>
          ) : null}
          <div className="mt-3 rounded-md border border-border bg-background p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Seller (private)
            </p>
            <p className="mt-1 text-sm">{listing.sellerName}</p>
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <a
                href={`tel:${listing.sellerPhone}`}
                className="inline-flex items-center gap-1.5 hover:text-primary"
              >
                <Phone className="size-3.5" />
                {listing.sellerPhone}
              </a>
              <a
                href={`https://wa.me/${listing.sellerPhone.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-primary"
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
              {listing.sellerEmail ? (
                <a
                  href={`mailto:${listing.sellerEmail}`}
                  className="inline-flex items-center gap-1.5 break-all hover:text-primary"
                >
                  <Mail className="size-3.5" />
                  {listing.sellerEmail}
                </a>
              ) : null}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Submitted {new Date(listing.createdAt).toLocaleString("en-KE")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {!listing.published ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run("Listing published.", () => publishListing({ data: { id: listing.id } }))}
            >
              <Check className="size-3.5" />
              Publish
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run("Listing unpublished.", () => unpublishListing({ data: { id: listing.id } }))}
            >
              <X className="size-3.5" />
              Unpublish
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            asChild
            disabled={listing.kind === "car" && !listing.published}
          >
            <Link
              to={
                listing.published
                  ? listing.kind === "car"
                    ? "/cars/$id"
                    : "/parts/$id"
                  : "/desk"
              }
              params={
                listing.published
                  ? { id: listing.id }
                  : undefined
              }
              target="_blank"
            >
              <ExternalLink className="size-3.5" />
              View
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
              void run("Listing deleted.", () => deleteListing({ data: { id: listing.id } }));
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

function EnquiryCard({
  enquiry,
  onChange,
}: {
  enquiry: AdminEnquiry;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function mark() {
    setBusy(true);
    try {
      const r = await markEnquiryIntroduced({ data: { id: enquiry.id } });
      if (r.ok) {
        toast.success("Marked introduced.");
        onChange();
      } else {
        toast.error("Action failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={enquiry.status === "new" ? "default" : "muted"}>
              {enquiry.status === "new" ? "New" : "Introduced"}
            </Badge>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">{enquiry.listingTitle}</h3>
          <p className="mt-1 text-sm">
            {enquiry.buyerName} · {enquiry.buyerPhone}
            {enquiry.buyerCity ? ` · ${enquiry.buyerCity}` : ""}
          </p>
          {enquiry.message ? (
            <p className="mt-2 text-sm text-muted-foreground">{enquiry.message}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(enquiry.createdAt).toLocaleString("en-KE")}
          </p>
        </div>
        {enquiry.status === "new" ? (
          <Button size="sm" disabled={busy} onClick={mark}>
            Mark introduced
          </Button>
        ) : null}
      </div>
    </li>
  );
}