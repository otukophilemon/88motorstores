import { createFileRoute, Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CarCard } from "@/components/car-card";
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
import {
  BODIES,
  CITIES,
  MAKES,
  cars,
  type Body,
} from "@/lib/catalog";
import { getPublishedCars } from "@/lib/listings/public-server";
import type { PublicListing } from "@/lib/listings/public-server";

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
  const [userCars, setUserCars] = useState<PublicListing[]>([]);

  useEffect(() => {
    void getPublishedCars()
      .then(setUserCars)
      .catch(() => setUserCars([]));
  }, []);

  // Apply the same search filters to user listings (title, make, model, location)
  const filteredUserCars = useMemo(() => {
    let list = [...userCars];
    const q = search.q?.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        `${c.title} ${c.make ?? ""} ${c.model ?? ""} ${c.location}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (search.make) list = list.filter((c) => c.make === search.make);
    if (search.body) list = list.filter((c) => c.body === search.body);
    if (search.city) {
      list = list.filter((c) =>
        c.location.toLowerCase().includes((search.city ?? "").toLowerCase()),
      );
    }
    if (search.fuel) list = list.filter((c) => c.fuel === search.fuel);
    // Note: no sorting applied — user listings always appear newest-first by default.
    return list;
  }, [userCars, search]);

  const filteredDemo = useMemo(() => {
    let list = [...cars];
    const q = search.q?.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        `${c.title} ${c.make} ${c.model} ${c.city} ${c.location} ${c.trim}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (search.make) list = list.filter((c) => c.make === search.make);
    if (search.body) list = list.filter((c) => c.body === search.body);
    if (search.city) list = list.filter((c) => c.city === search.city);
    if (search.fuel) list = list.filter((c) => c.fuel === search.fuel);
    const sort = search.sort ?? "newest";
    list.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "km") return a.mileage - b.mileage;
      if (sort === "demand") return b.demand - a.demand;
      return a.daysListed - b.daysListed;
    });
    return list;
  }, [search]);

  const totalCount = filteredUserCars.length + filteredDemo.length;

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
          {filteredUserCars.length ? (
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
                  {filteredUserCars.length}{" "}
                  {filteredUserCars.length === 1 ? "listing" : "listings"}
                </p>
              </div>
              <div className="mt-6">
                <UserListingGrid listings={filteredUserCars} />
              </div>
            </section>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Yards &amp; dealers
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">
                  From established sellers
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredDemo.length}{" "}
                {filteredDemo.length === 1 ? "car" : "cars"}
              </p>
            </div>

            <div className="mt-6">
              {filteredDemo.length === 0 ? (
                <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
                  <p className="font-display text-2xl">Nothing in that lane.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loosen the filters or{" "}
                    <Link to="/cars" className="underline">
                      reset
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredDemo.map((car) => (
                    <CarCard key={car.id} car={car} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {filteredUserCars.length === 0 && filteredDemo.length === 0 ? (
            <div className="rounded-xl bg-card p-10 text-center shadow-[var(--shadow-border)]">
              <p className="font-display text-2xl">Nothing in that lane.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Loosen the filters or{" "}
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