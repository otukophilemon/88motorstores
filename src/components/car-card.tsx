import { Link } from "@tanstack/react-router";
import { GitCompareArrows, Heart } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyseCar } from "@/lib/analyse";
import type { Car } from "@/lib/catalog";
import { kes, kesShort } from "@/lib/format";
import { useGarii } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CarCard({
  car,
  featured = false,
}: {
  car: Car;
  featured?: boolean;
}) {
  const saved = useGarii((s) => s.savedCars.includes(car.id));
  const compared = useGarii((s) => s.compareIds.includes(car.id));
  const toggleSavedCar = useGarii((s) => s.toggleSavedCar);
  const toggleCompare = useGarii((s) => s.toggleCompare);
  const analysis = analyseCar(car);
  const band =
    analysis.band === "below"
      ? { label: "Under market", variant: "good" as const }
      : analysis.band === "above"
        ? { label: "Above market", variant: "warn" as const }
        : { label: "Fair market", variant: "muted" as const };

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-200 hover:shadow-[var(--shadow-border-hover)]",
        featured && "md:flex-row",
      )}
    >
      <Link
        to="/cars/$id"
        params={{ id: car.id }}
        className={cn(
          "relative block overflow-hidden bg-secondary",
          featured ? "md:w-[52%] md:min-h-72" : "aspect-video",
        )}
      >
        <img
          src={car.image}
          alt={car.title}
          className="img-cover size-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant={band.variant}>{band.label}</Badge>
          {car.origin === "Import" && car.auctionGrade ? (
            <Badge variant="outline">Grade {car.auctionGrade}</Badge>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {car.year} · {car.city}
            </p>
            <h3 className="font-display text-xl font-semibold leading-tight">
              <Link to="/cars/$id" params={{ id: car.id }}>
                {car.title}
              </Link>
            </h3>
          </div>
          <p className="font-display text-xl font-semibold tabular-nums">
            {featured ? kes(car.price) : kesShort(car.price)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {car.mileage.toLocaleString("en-KE")} km · {car.fuel} · {car.transmission}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to="/cars/$id" params={{ id: car.id }}>
              View &amp; enquire
            </Link>
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={saved ? "default" : "outline"}
            aria-label={saved ? "Remove from garage" : "Save to garage"}
            onClick={() => toggleSavedCar(car.id)}
          >
            <Heart className={cn("size-4", saved && "fill-current")} />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={compared ? "default" : "outline"}
            aria-label="Compare"
            onClick={() => {
              const ok = toggleCompare(car.id);
              if (!ok) toast.error("Compare holds three cars. Remove one first.");
            }}
          >
            <GitCompareArrows className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}