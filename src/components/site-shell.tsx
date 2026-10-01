import { Link, useRouterState } from "@tanstack/react-router";
import { Mail, MapPin, Menu, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useIsAdmin } from "@/lib/auth/use-my-role";
import { cn } from "@/lib/utils";

// Main nav — the marketplace browsing surfaces.
const NAV = [
  { to: "/" as const, label: "Home" },
  { to: "/cars" as const, label: "Cars" },
  { to: "/parts" as const, label: "Parts" },
  { to: "/nations" as const, label: "Clubs" },
  { to: "/garage" as const, label: "Garage" },
  { to: "/gallery" as const, label: "Gallery" },
];

// Right side — always-visible info pages.
const INFO_NAV = [
  { to: "/insights" as const, label: "Insights" },
  { to: "/how-it-works" as const, label: "Concierge" },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="88Motor Stores home">
          <Logo />
        </Link>
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                item.to === "/"
                  ? pathname === "/" && "text-foreground"
                  : pathname.startsWith(item.to) && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {/* Admins see Desk; everyone else sees Contact desk. */}
          {isAdmin ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link
                to="/desk"
                className={cn(
                  "rounded-md",
                  pathname.startsWith("/desk") && "text-foreground",
                )}
              >
                Desk
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/contact">Contact desk</Link>
            </Button>
          )}

          {INFO_NAV.map((item) => (
            <Button
              key={item.to}
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link
                to={item.to}
                className={cn(
                  "rounded-md",
                  pathname.startsWith(item.to) && "text-foreground",
                )}
              >
                {item.label}
              </Link>
            </Button>
          ))}

          <SignedIn>
            <div className="hidden sm:flex items-center gap-2">
              <NotificationBell />
              <UserButton />
              <Button asChild size="sm">
                <Link to="/sell">List a vehicle</Link>
              </Button>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-up">Create account</Link>
              </Button>
            </div>
          </SignedOut>

          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-6 pt-14">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base"
              >
                {item.label}
              </Link>
            ))}
            {INFO_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                to="/desk"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base"
              >
                Desk
              </Link>
            ) : (
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base"
              >
                Contact desk
              </Link>
            )}
            <SignedIn>
              <Link
                to="/create-club"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3"
              >
                Create club
              </Link>
            </SignedIn>
            <div className="mt-4 border-t border-border pt-4">
              <SignedIn>
                <div className="flex flex-col gap-3">
                  <NotificationBell />
                  <UserButton />
                </div>
              </SignedIn>
              <SignedOut>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/sign-up"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-3 py-3 text-center text-base text-primary-foreground"
                  >
                    Create account
                  </Link>
                </div>
              </SignedOut>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Kenya's automotive marketplace — cars, spares, and the clubs that
            keep them alive. Introductions run through the 88Motor Stores desk
            so sellers stay private and buyers talk to a person.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Market
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/cars">Cars</Link></li>
            <li><Link to="/parts">Parts</Link></li>
            <li><Link to="/nations">Clubs</Link></li>
            <li><Link to="/gallery">Gallery</Link></li>
            <li><Link to="/insights">Insights</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Desk
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/how-it-works">How concierge works</Link></li>
            <li><Link to="/sell">List a vehicle</Link></li>
            <li><Link to="/contact">Contact the desk</Link></li>
            <li><Link to="/garage">Your garage</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Contact
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="tel:+254769679667" className="flex items-center gap-2 transition-colors hover:text-foreground">
                <Phone className="size-3.5 shrink-0" />
                <span>+254 769 679 667</span>
              </a>
            </li>
            <li>
              <a href="https://wa.me/254769679667" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors hover:text-foreground">
                <MessageCircle className="size-3.5 shrink-0" />
                <span>WhatsApp us</span>
              </a>
            </li>
            <li>
              <a href="mailto:otuko88motorstores@gmail.com" className="flex items-center gap-2 break-all transition-colors hover:text-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span>otuko88motorstores@gmail.com</span>
              </a>
            </li>
            <li className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>Nakuru, Kenya</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          88Motor Stores · Nakuru, Kenya · Listings are brokered by the desk.
          Prices in Kenyan shillings.
        </p>
      </div>
    </footer>
  );
}