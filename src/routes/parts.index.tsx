import { createFileRoute, Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PartCard } from "@/components/part-card";
import { UserListingGrid } from "@/components/user-listing-card";
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
import { CITIES, PART_CATEGORIES, parts } from "@/lib/catalog";
import { getPublishedParts } from "@/lib/listings/public-server";
import type { PublicListing } from "@/lib/listings/public-server";

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
  const [userParts, setUserParts] = useState<PublicListing[]>([]);

  useEffect(() => {
    void getPublishedParts()
      .then(setUserParts)
      .catch(() => setUserParts([]));
  }, []);

  const filteredUserParts = useMemo(() => {
    let list = [...userParts];
    const q = search.q?.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        `${p.title} ${p.brand ?? ""} ${p.category ?? ""} ${p.location}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (search.category) {
      list = list.filter((p) => p.category === search.category);
    }
    if (search.city) {
      list = list.filter((p) =>
        p.location.toLowerCase().includes((search.city ?? "").toLowerCase()),
      );
    }
    return list;
  }, [userParts, search]);

  const filteredDemo = useMemo(() => {
    let list = [...parts];
    const q = search.q?.toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        `${p.title} ${p.brand} ${p.category} ${p.city} ${p.location} ${p.fitment.join(" ")}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (search.category) list = list.filter((p) => p.category === search.category);
    if (search.city) list = list.filter((p) => p.city === search.city);
    const sort = search.sort ?? "newest";
    list.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return 0;
    });
    return list;
  }, [search]);

  const totalCount = filteredUserParts.length + filteredDemo.length;

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
          {filteredUserParts.length ? (
            <section className="mb-12">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">
                    From our sellers
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">
                    Listed by the community
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {filteredUserParts.length}{" "}
                  {filteredUserParts.length === 1 ? "listing" : "listings"}
                </p>
              </div>
              <div className="mt-6">
                <UserListingGrid listings={filteredUserParts} />
              </div>
            </section>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Yards &amp; specialists
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">
                  From established sellers
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredDemo.length}{" "}
                {filteredDemo.length === 1 ? "part" : "parts"}
              </p>
            </div>

            <div className="mt-6">
              {filteredDemo.length === 0 ? (
                <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
                  <p className="font-display text-2xl">Nothing in that aisle.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loosen the filters or{" "}
                    <Link to="/parts" className="underline">
                      reset
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredDemo.map((part) => (
                    <PartCard key={part.id} part={part} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {filteredUserParts.length === 0 && filteredDemo.length === 0 ? (
            <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
              <p className="font-display text-2xl">Nothing in that aisle.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Loosen the filters or{" "}
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