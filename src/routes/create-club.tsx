
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createClub } from "@/lib/clubs/management";

export const Route = createFileRoute("/create-club")({
  component: NewClubPage,
});

function NewClubPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [rules, setRules] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isPending) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !about.trim()) {
      toast.error("Name, tagline, and description are required.");
      return;
    }
    if (coverImages.length === 0) {
      toast.error("A cover image is required.");
      return;
    }
    setSubmitting(true);
    try {
      const rulesArray = rules
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .slice(0, 10);

      const result = await createClub({
        data: {
          name: name.trim(),
          tagline: tagline.trim(),
          about: about.trim(),
          cover: coverImages[0],
          rules: rulesArray,
        },
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Club created.", {
        description: `Welcome to ${name.trim()}!`,
      });
      void navigate({ to: "/nations/$slug", params: { slug: result.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create club.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/nations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clubs
      </Link>

      <p className="mt-6 text-xs uppercase tracking-[0.18em] text-primary">
        Create a club
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold">
        Start your community.
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Clubs are public — anyone can read, join, and post. You'll be the owner
        and can appoint up to 5 admins later.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-5">
        <div className="grid gap-2">
          <Label>
            Cover image <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            A single wide image. This appears on the clubs list and at the top
            of your club page.
          </p>
          <ImageUploader
            value={coverImages}
            onChange={(urls) => {
              // Keep only the first image — the cover.
              setCoverImages(urls.slice(0, 1));
            }}
            disabled={submitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="club-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Subaru Nation KE"
            disabled={submitting}
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            {name.length}/60 · Your club's public URL is auto-generated.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="club-tagline">
            Tagline <span className="text-destructive">*</span>
          </Label>
          <Input
            id="club-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="One line that describes the club"
            disabled={submitting}
            maxLength={100}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="club-about">
            About <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="club-about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="What's this club about? Who should join? What do you discuss?"
            rows={5}
            disabled={submitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="club-rules">Rules (optional)</Label>
          <Textarea
            id="club-rules"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder={"One rule per line, up to 10.\ne.g.\nNo selling in the main feed\nMeet points posted 48 hours out"}
            rows={4}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            One per line. Shown on the club page.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create club"}
          </Button>
          <Button asChild variant="ghost" type="button">
            <Link to="/nations">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}