import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  component: HowPage,
});

function HowPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Concierge</p>
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">
        You never cold-call the yard.
      </h1>
      <p className="mt-4 text-muted-foreground">
        88Motor Stores is a Kenyan automotive marketplace with a desk in the
        middle. Buyers analyse stock in public. Contact stays private. The
        operator — you — makes the introduction.
      </p>

      <ol className="mt-12 space-y-8">
        <Step n="01" title="Browse and analyse">
          Filter cars and parts. Every vehicle has an 88Motor score: ask versus
          market, kilometres per year, a fuel and insurance sketch, comparable
          stock. Save to your garage or load the compare bay.
        </Step>
        <Step n="02" title="Request an introduction">
          The form asks for a name and WhatsApp. That request lands on the
          88Motor Stores desk — not on the seller’s phone. Tyre-kickers get
          filtered. Serious buyers get a human.
        </Step>
        <Step n="03" title="The desk connects both sides">
          We open the desk, check the listing, then introduce buyer and seller
          on WhatsApp. Numbers are never published on the site.
        </Step>
        <Step n="04" title="Sellers market without the circus">
          List a car or a part. We host the page, route qualified interest, and
          keep your personal line off the internet. You control the price,
          location, and status of your listing — available, reserved, or sold.
        </Step>
        <Step n="05" title="Clubs stay a community">
          Subaru STI Club, Premio Nyoka Club and the rest are for meets and
          advice. Sales links go back to 88Motor Stores listings — the board
          does not become a classifieds dump.
        </Step>
      </ol>

      <div className="mt-12 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-border)]">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Talk to the desk
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Any step of the way — reaching us is simple.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li>
            <a
              href="tel:+254769679667"
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <Phone className="size-4 shrink-0" />
              <span>Call · +254 769 679 667</span>
            </a>
          </li>
          <li>
            <a
              href="https://wa.me/254769679667"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <MessageCircle className="size-4 shrink-0" />
              <span>WhatsApp us</span>
            </a>
          </li>
          <li className="sm:col-span-2">
            <a
              href="mailto:otuko88motorstores@gmail.com"
              className="flex items-center gap-2 break-all text-sm transition-colors hover:text-primary"
            >
              <Mail className="size-4 shrink-0" />
              <span>otuko88motorstores@gmail.com</span>
            </a>
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            <MapPin className="size-4 shrink-0" />
            <span>Nakuru, Kenya</span>
          </li>
        </ul>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/cars">Browse cars</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sell">List stock</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/desk">Open the desk</Link>
        </Button>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: string }) {
  return (
    <li className="grid gap-2 sm:grid-cols-[4rem_1fr]">
      <p className="font-display text-2xl text-muted-foreground">{n}</p>
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}