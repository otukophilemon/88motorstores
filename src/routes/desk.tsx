import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { kes } from "@/lib/format";
import {
  approveYardApplication,
  deleteListing,
  getEnquiries,
  getGraduationCandidates,
  getPendingListings,
  getPendingYardApplications,
  getPublishedListings,
  markEnquiryIntroduced,
  markListingSold,
  publishListing,
  rejectYardApplication,
  unpublishListing,
  type AdminEnquiry,
  type AdminListing,
  type GraduationCandidate,
  type YardApplication,
} from "@/lib/listings/admin-server";

export const Route = createFileRoute("/desk")({ component: DeskPage });

type AccessState = "loading" | "signed_out" | "signed_in";

function DeskPage() {
  const { user, isPending } = useCurrentUserState();
  const [authorized, setAuthorized] = useState<AccessState>("loading");
  const [forbidden, setForbidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [pending, setPending] = useState<AdminListing[] | null>(null);
  const [published, setPublished] = useState<AdminListing[] | null>(null);
  const [enquiries, setEnquiries] = useState<AdminEnquiry[] | null>(null);
  const [yards, setYards] = useState<YardApplication[] | null>(null);
  const [candidates, setCandidates] = useState<GraduationCandidate[] | null>(null);

  async function refreshAll() {
    try {
      const [p, pub, enq, y, c] = await Promise.all([
        getPendingListings(),
        getPublishedListings(),
        getEnquiries(),
        getPendingYardApplications(),
        getGraduationCandidates(),
      ]);
      setPending(p);
      setPublished(pub);
      setEnquiries(enq);
      setYards(y);
      setCandidates(c);
    } catch (err) {
      toast.error("Refresh failed: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  if (!loaded && !isPending) {
    setLoaded(true);
    if (!user) {
      setAuthorized("signed_out");
    } else {
      void (async () => {
        try {
          await refreshAll();
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

  if (authorized === "signed_out") return <RedirectToSignIn />;

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
        Review listings, approve sellers, and track introductions. Seller
        contacts are visible here only.
      </p>

      {/* Yard applications */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          Yard applications
          {yards ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({yards.length} pending)
            </span>
          ) : null}
        </h2>
        {yards === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : yards.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No pending applications.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {yards.map((y) => (
              <YardApplicationCard
                key={y.userId}
                application={y}
                onChange={refreshAll}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Graduation candidates */}
      {candidates && candidates.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            <TrendingUp className="mr-2 inline size-5 text-primary" />
            Ready for promotion
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Private sellers with 8+ completed deals and 4+ months active.
          </p>
          <ul className="mt-4 grid gap-3">
            {candidates.map((c) => (
              <li
                key={c.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
              >
                <div>
                  <p className="font-display text-lg font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.completedDeals} deals · {c.monthsActive} months active
                  </p>
                </div>
                <Badge variant="outline">Candidate</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Pending listings */}
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
              <ListingCard key={l.id} listing={l} onChange={refreshAll} />
            ))}
          </ul>
        )}
      </section>

      {/* Published listings */}
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
          <p className="mt-4 text-sm text-muted-foreground">Nothing published yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {published.map((l) => (
              <ListingCard key={l.id} listing={l} onChange={refreshAll} />
            ))}
          </ul>
        )}
      </section>

      {/* Enquiries */}
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
              <EnquiryCard key={e.id} enquiry={e} onChange={refreshAll} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// ─── Yard application card ───────────────────────────────────────────────

function YardApplicationCard({
  application,
  onChange,
}: {
  application: YardApplication;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function act(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusy(true);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(label);
        onChange();
      } else {
        toast.error(r.error ?? "Action failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-primary/40 bg-card p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Pending</Badge>
            <Badge variant="muted">Upgrade request</Badge>
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold">
            {application.businessName ?? application.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner: {application.name} · {application.email}
          </p>
          {application.city ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {application.city}
            </p>
          ) : null}
          {application.slug ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Requested URL: <code>/yards/{application.slug}</code>
            </p>
          ) : null}
          {application.bio ? (
            <p className="mt-3 text-sm">{application.bio}</p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {application.completedDeals} completed deals · member since{" "}
            {new Date(application.memberSince).toLocaleDateString("en-KE")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              act("Approved as dealer.", () =>
                approveYardApplication({
                  data: { userId: application.userId, type: "dealer" },
                }),
              )
            }
          >
            <Check className="size-3.5" />
            Approve as Dealer
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              act("Approved as yard.", () =>
                approveYardApplication({
                  data: { userId: application.userId, type: "yard" },
                }),
              )
            }
          >
            <Store className="size-3.5" />
            Approve as Yard
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!confirm(`Reject ${application.name}'s application?`)) return;
              void act("Application rejected.", () =>
                rejectYardApplication({ data: { userId: application.userId } }),
              );
            }}
          >
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      </div>
    </li>
  );
}

// ─── Listing card ────────────────────────────────────────────────────────

function ListingCard({
  listing,
  onChange,
}: {
  listing: AdminListing;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(label);
        onChange();
      } else {
        toast.error(r.error ?? "Action failed.");
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

  const isSold = Boolean(listing.soldAt);

  return (
    <li
      className={
        isSold
          ? "rounded-xl border border-border bg-card/50 p-5 shadow-[var(--shadow-border)]"
          : "rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={listing.published ? "default" : "muted"}>
              {listing.published ? "Published" : "Pending"}
            </Badge>
            {isSold ? <Badge variant="good">Sold</Badge> : null}
            <Badge variant="outline">{listing.kind}</Badge>
            <Badge variant="outline">{listing.status}</Badge>
          </div>

          {/* Photo strip */}
          {listing.images.length ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {listing.images.slice(0, 6).map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                  title={`Photo ${i + 1} — click to open`}
                >
                  <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
              {listing.images.length > 6 ? (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-xs text-muted-foreground">
                  +{listing.images.length - 6}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No photos</p>
          )}

          <h3 className="mt-3 font-display text-xl font-semibold">{listing.title}</h3>
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
            {isSold && listing.soldAt
              ? ` · Sold ${new Date(listing.soldAt).toLocaleDateString("en-KE")}`
              : ""}
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
          {listing.published && !isSold ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (
                  !confirm(
                    `Mark "${listing.title}" as sold? This will increment the seller's completed-deals counter.`,
                  )
                )
                  return;
                void run("Marked as sold.", () =>
                  markListingSold({ data: { id: listing.id } }),
                );
              }}
            >
              <BadgeCheck className="size-3.5" />
              Mark as sold
            </Button>
          ) : null}
                    {listing.published ? (
            <Button size="sm" variant="outline" asChild>
              <Link
                to="/listings/$id"
                params={{ id: listing.id }}
                target="_blank"
              >
                <ExternalLink className="size-3.5" />
                View
              </Link>
            </Button>
          ) : null}
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

// ─── Enquiry card ────────────────────────────────────────────────────────

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