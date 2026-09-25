import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AppNotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-start justify-center px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">That lane is empty.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The listing or page is gone. Head back to the floor.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to 88Motor Stores</Link>
      </Button>
    </main>
  );
}