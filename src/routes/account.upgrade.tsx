import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHydrated } from "@/lib/use-hydrated";
import {
  getMyAccount,
  submitUpgradeRequest,
  type MyAccount,
} from "@/lib/account/server";

export const Route = createFileRoute("/account/upgrade")({
  component: UpgradePage,
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function UpgradePage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const { user, isPending } = useCurrentUserState();
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [type, setType] = useState<"dealer" | "yard">("dealer");
  const [submitting, setSubmitting] = useState(false);

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
        if (a?.name) setBusinessName(a.name);
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

  useEffect(() => {
    if (!slugTouched) setDesiredSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !city.trim() || bio.trim().length < 20) {
      toast.error("Fill in all fields. Bio must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitUpgradeRequest({
        data: {
          businessName: businessName.trim(),
          desiredSlug: desiredSlug.trim(),
          city: city.trim(),
          bio: bio.trim(),
          type,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Application submitted.", {
        description:
          "The desk will review it — we’ll notify you when there’s a decision.",
      });
      void navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || isPending || loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;

  if (account && account.sellerType !== "private") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to account
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold">
          You’re already a business
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is already set up as a {account.sellerType}. Manage it
          from your account page.
        </p>
      </main>
    );
  }

  if (account?.upgradeStatus === "pending") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to account
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold">
          Application under review
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We already have your upgrade request. The desk will review it shortly.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to account
      </Link>

      <p className="mt-6 text-xs uppercase tracking-[0.18em] text-primary">
        Upgrade
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold">
        Apply for a business account
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Get a verified badge, a public business page, and a dedicated inventory
        listing. Reviewed by the desk — free to apply.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-5">
        <div className="grid gap-2">
          <Label>Business type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "dealer" ? "default" : "outline"}
              onClick={() => setType("dealer")}
              disabled={submitting}
            >
              Dealer
            </Button>
            <Button
              type="button"
              variant={type === "yard" ? "default" : "outline"}
              onClick={() => setType("yard")}
              disabled={submitting}
            >
              Yard
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bn">Business name</Label>
          <Input
            id="bn"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Apex Motors"
            disabled={submitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="slug">Public URL</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/yards/</span>
            <Input
              id="slug"
              value={desiredSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setDesiredSlug(slugify(e.target.value));
              }}
              placeholder="apex-motors"
              disabled={submitting}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your public page will be at <code>/yards/{desiredSlug || "..."}</code>
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Nakuru"
            disabled={submitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bio">About your business</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell buyers what you sell, where you're based, how long you've been operating…"
            rows={5}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length}/500 characters (min 20)
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
          <Button asChild variant="ghost" type="button">
            <Link to="/account">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}