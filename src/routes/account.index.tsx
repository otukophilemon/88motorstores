import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  ExternalLink,
  Package,
  Store,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SignedOut, RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHydrated } from "@/lib/use-hydrated";
import { getMyAccount, type MyAccount } from "@/lib/account/server";

export const Route = createFileRoute("/account/")({
  component: AccountPage,
});

function AccountPage() {
  const hydrated = useHydrated();
  const { user, isPending } = useCurrentUserState();
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [loading, setLoading] = useState(true);

      const userId = user?.id;

  useEffect(() => {
    if (!hydrated) return;
    if (isPending) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    void getMyAccount()
      .then((a) => {
        if (!alive) return;
        setAccount(a);
      })
      .catch(() => {
        if (!alive) return;
        setAccount(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [hydrated, isPending, userId]);

  // Before hydration OR while session/data is loading, render a stable placeholder.
  // This is what SSR returns, so client hydration matches exactly.
  if (!hydrated || isPending || loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;

  if (!account) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">
          We couldn’t load your account. Please try again.
        </p>
      </main>
    );
  }

  const isBusiness =
    account.sellerType === "dealer" || account.sellerType === "yard";
  const typeLabel =
    account.sellerType === "yard"
      ? "Yard"
      : account.sellerType === "dealer"
        ? "Dealer"
        : "Private seller";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Your account
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold">{account.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{account.email}</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <User className="size-3.5" />
            Seller type
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{typeLabel}</p>
          {isBusiness && account.sellerVerified ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary">
              <BadgeCheck className="size-3.5" />
              Verified
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Package className="size-3.5" />
            Completed deals
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
            {account.completedDeals}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <Clock className="size-3.5" />
          Member since
        </div>
        <p className="mt-1 text-sm">
          {new Date(account.memberSince).toLocaleDateString("en-KE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </section>

      {isBusiness ? (
        <section className="mt-8 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Store className="size-3.5" />
            Business profile
          </div>
          {account.sellerBusinessName ? (
            <p className="mt-2 font-display text-xl font-semibold">
              {account.sellerBusinessName}
            </p>
          ) : null}
          {account.sellerCity ? (
            <p className="mt-1 text-sm text-muted-foreground">{account.sellerCity}</p>
          ) : null}
          {account.sellerBio ? (
            <p className="mt-3 text-sm text-muted-foreground">{account.sellerBio}</p>
          ) : null}
          {account.sellerSlug ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/yards/$slug" params={{ slug: account.sellerSlug }}>
                  <ExternalLink className="size-3.5" />
                  View public page
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {account.sellerType === "private" ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-border)]">
          {account.upgradeStatus === "pending" ? (
            <>
              <p className="text-xs uppercase tracking-[0.16em] text-primary">
                Pending review
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                Your upgrade is under review
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The desk will review your application soon — we’ll notify you
                when there’s a decision.
              </p>
              {account.sellerBusinessName ? (
                <p className="mt-3 text-sm">
                  Business name:{" "}
                  <span className="font-medium">{account.sellerBusinessName}</span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.16em] text-primary">
                Grow your business
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                Become a verified dealer or yard
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Get a public business profile, a verified badge on your
                listings, and a direct link to your inventory. Free — just an
                application for the desk to review.
              </p>
              <div className="mt-5">
                <Button asChild>
                  <Link to="/account/upgrade">
                    Apply now
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="mt-10 border-t border-border pt-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/desk">Open the desk</Link>
        </Button>
      </section>
    </main>
  );
}