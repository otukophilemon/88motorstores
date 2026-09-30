import { createFileRoute, Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserListingCard } from "@/components/user-listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CITIES, PART_CATEGORIES } from "@/lib/catalog";
import {
  getPrivateParts,
  getYardParts,
  type PublicListing,
} from "@/lib/listings/public-server";

export type PartsSearch = {
  q?: string;
  category?: string;
  city?: string;
  sort?: string;
};

export const Route = createFileRoute("/parts/")({
  validateSearch: (s: Record<string, unknown>): PartsSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  component: PartsPage,
});

function PartsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [open, setOpen] = useState(false);
  const [privateParts, setPrivateParts] = useState<PublicListing[]>([]);
  const [yardParts, setYardParts] = useState<PublicListing[]>([]);

  useEffect(() => {
    void Promise.all([
      getPrivateParts({ data: { limit: 12 } }).catch(() => []),
      getYardParts({ data: { limit: 12 } }).catch(() => []),
    ]).then(([pp, yp]) => {
      setPrivateParts(pp);
      setYardParts(yp);
    });
  }, []);

  function applyFilters(list: PublicListing[]): PublicListing[] {
    let out = [...list];
    const q = search.q?.toLowerCase().trim();
    if (q) {
      out = out.filter((p) =>
        `${p.title} ${p.brand ?? ""} ${p.category ?? ""} ${p.location}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (search.category) out = out.filter((p) => p.category === search.category);
    if (search.city) {
      out = out.filter((p) =>
        p.location.toLowerCase().includes((search.city ?? "").toLowerCase()),
      );
    }
    return out;
  }

  const filteredPrivateParts = useMemo(
    () => applyFilters(privateParts),
    [privateParts, search],
  );
  const filteredYardParts = useMemo(
    () => applyFilters(yardParts),
    [yardParts, search],
  );

  const totalCount = filteredPrivateParts.length + filteredYardParts.length;

  function patch(next: Partial<PartsSearch>) {
    void navigate({
      search: (prev) => {
        const merged = { ...prev, ...next };
        for (const key of Object.keys(merged) as (keyof PartsSearch)[]) {
          if (!merged[key]) delete merged[key];
        }
        return merged;
      },
    });
  }

  const filters = <Filters search={search} onPatch={patch} />;
  const noResults =
    filteredPrivateParts.length === 0 && filteredYardParts.length === 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Marketplace
          </p>
          <h1 className="font-display text-4xl font-semibold">Parts in Kenya</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalCount} on the shelf · real fitment, real stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
          <Select
            value={search.sort ?? "newest"}
            onValueChange={(v) => patch({ sort: v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Just in</SelectItem>
              <SelectItem value="price-asc">Price · low</SelectItem>
              <SelectItem value="price-desc">Price · high</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">{filters}</aside>
        <div className="min-w-0 flex-1">
          {/* Individual sellers */}
          {filteredPrivateParts.length ? (
            <section className="mb-12">
              <SectionHeader
                kicker="From our sellers"
                title="From individual sellers"
                count={filteredPrivateParts.length}
                unit="listing"
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPrivateParts.map((l) => (
                  <UserListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Yards & dealers */}
          {filteredYardParts.length ? (
            <section className="mb-12">
              <SectionHeader
                kicker="Yards & dealers"
                title="From established sellers"
                count={filteredYardParts.length}
                unit="listing"
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredYardParts.map((l) => (
                  <UserListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          ) : null}

          {noResults ? (
            <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
              <p className="font-display text-2xl">Nothing in that aisle.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {privateParts.length + yardParts.length === 0
                  ? "No parts have been published yet. Check back soon — or "
                  : "Loosen the filters or "}
                <Link to="/parts" className="underline">
                  reset
                </Link>
                .
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="overflow-y-auto p-6 pt-12">
          {filters}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function SectionHeader({
  kicker,
  title,
  count,
  unit,
}: {
  kicker: string;
  title: string;
  count: number;
  unit: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">
          {kicker}
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {count} {count === 1 ? unit : `${unit}s`}
      </p>
    </div>
  );
}

function Filters({
  search,
  onPatch,
}: {
  search: PartsSearch;
  onPatch: (n: Partial<PartsSearch>) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="part-q">Search</Label>
        <Input
          id="part-q"
          value={search.q ?? ""}
          onChange={(e) => onPatch({ q: e.target.value || undefined })}
          placeholder="Brand, part, fitment…"
        />
      </div>
      <FieldSelect
        label="Category"
        value={search.category}
        onChange={(v) => onPatch({ category: v })}
        options={[...PART_CATEGORIES]}
      />
      <FieldSelect
        label="City"
        value={search.city}
        onChange={(v) => onPatch({ city: v })}
        options={[...CITIES]}
      />
      <Button
        variant="ghost"
        onClick={() =>
          onPatch({ q: undefined, category: undefined, city: undefined })
        }
      >
        Clear filters
      </Button>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  options: string[];
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select
        value={value ?? "any"}
        onValueChange={(v) => onChange(v === "any" ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}