import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { EnquireDialog } from "@/components/enquire-dialog";
import { PartCard } from "@/components/part-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { partById, parts, yardById } from "@/lib/catalog";
import { kes } from "@/lib/format";
import { useGarii } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parts/$id")({ component: PartDetail });

function PartDetail() {
  const { id } = Route.useParams();
  const part = partById(id);
  if (!part) throw notFound();
  const yard = yardById(part.sellerId);
  const saved = useGarii((s) => s.savedParts.includes(part.id));
  const toggle = useGarii((s) => s.toggleSavedPart);
  const related = parts.filter((p) => p.category === part.category && p.id !== part.id).slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link to="/parts" className="hover:text-foreground">
          Parts
        </Link>
        <span className="px-2">/</span>
        {part.category}
      </p>
      <div className="mt-5 grid gap-8 lg:grid-cols-12">
        <div className="overflow-hidden rounded-xl bg-secondary lg:col-span-7">
          <img src={part.image} alt={part.title} className={cn(part.crop, "aspect-still w-full")} />
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
            <div className="flex gap-2">
              <Badge variant="outline">{part.condition}</Badge>
              <Badge variant="muted">{part.brand}</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
              {part.title}
            </h1>
            <p className="mt-4 font-display text-4xl font-semibold tabular-nums">
              {kes(part.price)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {part.stock} in stock · {part.location}, {part.city}
            </p>
            {part.oem ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">OEM {part.oem}</p>
            ) : null}
            <p className="mt-4 text-sm text-muted-foreground">{part.description}</p>
            <p className="mt-4 text-sm">
              Fits {part.fitment.join(", ")}
            </p>
            {yard ? (
              <p className="mt-2 text-sm text-muted-foreground">Seller · {yard.name}</p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              <EnquireDialog
                kind="part"
                targetId={part.id}
                subject={`${part.title} · ${kes(part.price)}`}
              />
              <Button
                type="button"
                variant={saved ? "default" : "outline"}
                onClick={() => toggle(part.id)}
              >
                <Heart className={cn("size-4", saved && "fill-current")} />
                {saved ? "Saved" : "Save to garage"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {related.length ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">Same aisle</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {related.map((p) => (
              <PartCard key={p.id} part={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
