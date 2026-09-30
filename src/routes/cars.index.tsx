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
import {
  BODIES,
  CITIES,
  MAKES,
  type Body,
} from "@/lib/catalog";
import {
  getPrivateCars,
  getYardCars,
  type PublicListing,
} from "@/lib/listings/public-server";

export type CarsSearch = {
  q?: string;
  make?: string;
  body?: string;
  city?: string;
  fuel?: string;
  sort?: string;
};

export const Route = createFileRoute("/cars/")({
  validateSearch: (s: Record<string, unknown>): CarsSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    make: typeof s.make === "string" ? s.make : undefined,
    body: typeof s.body === "string" ? s.body : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
    fuel: typeof s.fuel === "string" ? s.fuel : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  component: CarsPage,
});

function CarsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [open, setOpen] = useState(false);
  const [privateCars, setPrivateCars] = useState<PublicListing[]>([]);
  const [yardCars, setYardCars] = useState<PublicListing[]>([]);

  useEffect(() => {
    void Promise.all([
      getPrivateCars({ data: { limit: 12 } }).catch(() => []),
      getYardCars({ data: { limit: 12 } }).catch(() => []),
    ]).then(([pc, yc]) => {
      setPrivateCars(pc);
      setYardCars(yc);
    });
  }, []);

  // Apply the same filters to user listings
  function applyFilters(list: PublicListing[]): PublicListing[] {
    let out = [...list];
    const q = search.q?.toLowerCase().trim();
    if (q) {
      out = out.filter((c) =>
        `${c.title} ${c.make ?? ""} ${c.model ?? ""} ${c.location}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (search.make) out = out.filter((c) => c.make === search.make);
    if (search.body) out = out.filter((c) => c.body === search.body);
    if (search.city) {
      out = out.filter((c) =>
        c.location.toLowerCase().includes((search.city ?? "").toLowerCase()),
      );
    }
    if (search.fuel) out = out.filter((c) => c.fuel === search.fuel);
    return out;
  }

  const filteredPrivateCars = useMemo(
    () => applyFilters(privateCars),
    [privateCars, search],
  );
  const filteredYardCars = useMemo(
    () => applyFilters(yardCars),
    [yardCars, search],
  );

  const totalCount = filteredPrivateCars.length + filteredYardCars.length;

  function patch(next: Partial<CarsSearch>) {
    void navigate({
      search: (prev) => {
        const merged = { ...prev, ...next };
        for (const key of Object.keys(merged) as (keyof CarsSearch)[]) {
          if (!merged[key]) delete merged[key];
        }
        return merged;
      },
    });
  }

  const filters = <Filters search={search} onPatch={patch} />;
  const noResults =
    filteredPrivateCars.length === 0 && filteredYardCars.length === 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Marketplace
          </p>
          <h1 className="font-display text-4xl font-semibold">Cars in Kenya</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalCount} on the floor · introductions via the desk
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
              <SelectItem value="km">Lowest km</SelectItem>
              <SelectItem value="demand">Highest demand</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">{filters}</aside>
        <div className="min-w-0 flex-1">
          {/* Individual sellers */}
          {filteredPrivateCars.length ? (
            <section className="mb-12">
              <SectionHeader
                kicker="From our sellers"
                title="From individual sellers"
                count={filteredPrivateCars.length}
                unit="listing"
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPrivateCars.map((l) => (
                  <UserListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Yards & dealers */}
          {filteredYardCars.length ? (
            <section className="mb-12">
              <SectionHeader
                kicker="Yards & dealers"
                title="From established sellers"
                count={filteredYardCars.length}
                unit="listing"
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredYardCars.map((l) => (
                  <UserListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          ) : null}

          {noResults ? (
            <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
              <p className="font-display text-2xl">Nothing in that lane.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {privateCars.length + yardCars.length === 0
                  ? "No cars have been published yet. Check back soon — or "
                  : "Loosen the filters or "}
                <Link to="/cars" className="underline">
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
  search: CarsSearch;
  onPatch: (n: Partial<CarsSearch>) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="car-q">Search</Label>
        <Input
          id="car-q"
          value={search.q ?? ""}
          onChange={(e) => onPatch({ q: e.target.value || undefined })}
          placeholder="Make, model, yard…"
        />
      </div>
      <FieldSelect
        label="Make"
        value={search.make}
        onChange={(v) => onPatch({ make: v })}
        options={[...MAKES]}
      />
      <FieldSelect
        label="Body"
        value={search.body}
        onChange={(v) => onPatch({ body: v })}
        options={BODIES as Body[]}
      />
      <FieldSelect
        label="City"
        value={search.city}
        onChange={(v) => onPatch({ city: v })}
        options={[...CITIES]}
      />
      <FieldSelect
        label="Fuel"
        value={search.fuel}
        onChange={(v) => onPatch({ fuel: v })}
        options={["Petrol", "Diesel", "Hybrid"]}
      />
      <Button
        variant="ghost"
        onClick={() =>
          onPatch({
            q: undefined,
            make: undefined,
            body: undefined,
            city: undefined,
            fuel: undefined,
          })
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