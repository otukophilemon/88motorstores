import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Part } from "@/lib/catalog";
import { kes } from "@/lib/format";
import { useGarii } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PartCard({ part }: { part: Part }) {
  const saved = useGarii((s) => s.savedParts.includes(part.id));
  const toggleSavedPart = useGarii((s) => s.toggleSavedPart);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 hover:shadow-[var(--shadow-border-hover)]">
      <Link
        to="/parts/$id"
        params={{ id: part.id }}
        className="relative block aspect-4/3 overflow-hidden bg-secondary"
      >
        <img
          src={part.image}
          alt={part.title}
          className={cn(part.crop, "size-full transition-transform duration-500 group-hover:scale-[1.03]")}
        />
        <Badge className="absolute left-3 top-3" variant="outline">
          {part.condition}
        </Badge>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {part.category}
        </p>
        <h3 className="font-display text-lg font-semibold leading-tight">
          <Link to="/parts/$id" params={{ id: part.id }}>
            {part.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          Fits {part.fitment.slice(0, 3).join(", ")}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <p className="flex-1 font-display text-xl font-semibold tabular-nums">
            {kes(part.price)}
          </p>
          <Button
            type="button"
            size="icon-sm"
            variant={saved ? "default" : "outline"}
            aria-label="Save part"
            onClick={() => toggleSavedPart(part.id)}
          >
            <Heart className={cn("size-4", saved && "fill-current")} />
          </Button>
        </div>
      </div>
    </article>
  );
}
