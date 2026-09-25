import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { createListing } from "@/lib/listings/server";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { BODIES, MAKES, type Body, type Fuel, type Transmission } from "@/lib/catalog";

export const Route = createFileRoute("/sell")({ component: SellPage });

const STATUSES = ["Available", "Reserved", "Sold"] as const;
type Status = (typeof STATUSES)[number];

function SellPage() {
  const [kind, setKind] = useState<"car" | "part">("car");
  const [title, setTitle] = useState("");
  const [make, setMake] = useState("Toyota");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("2018");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [fuel, setFuel] = useState<Fuel>("Petrol");
  const [transmission, setTransmission] = useState<Transmission>("Automatic");
  const [body, setBody] = useState<Body>("SUV");
  const [mileage, setMileage] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("Available");
  const [sellerName, setSellerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(price.replace(/[^\d]/g, ""));
    if (!title.trim() || !n || !location.trim() || !sellerName.trim() || !phone.trim()) {
      toast.error("Title, price, location, your name and WhatsApp are required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createListing({
        data: {
          kind,
          title: title.trim(),
          make,
          model: model.trim() || title.trim(),
          year: kind === "car" ? Number(year) || undefined : undefined,
          price: n,
          location: location.trim(),
          status,
          description: description.trim(),
          fuel: kind === "car" ? fuel : undefined,
          transmission: kind === "car" ? transmission : undefined,
          body: kind === "car" ? body : undefined,
          mileage: kind === "car" ? Number(mileage.replace(/[^\d]/g, "")) || undefined : undefined,
          sellerName: sellerName.trim(),
          sellerPhone: phone.trim(),
          sellerEmail: email.trim() || undefined,
        },
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setDone(result.id);
      toast.success("Listing with the desk.", {
        description: "We’ll publish after a quick check, then route buyers to you.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit listing.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sell</p>
        <h1 className="font-display text-4xl font-semibold">It’s with the desk.</h1>
        <p className="mt-3 text-muted-foreground">
          Your listing is with the 88Motor Stores desk for a quick check. Once
          published, buyers can request introductions — they will not see your
          number.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setTitle("");
              setPrice("");
              setDescription("");
              setLocation("");
            }}
          >
            List another
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-12 px-4 py-10 sm:px-6 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sell</p>
        <h1 className="font-display text-4xl font-semibold">Market it. Stay unreachable.</h1>
        <p className="mt-3 text-muted-foreground">
          List a car or a part. 88Motor Stores hosts the page, qualifies the buyer,
          and introduces you on WhatsApp. You keep the stock; we keep the circus
          off your phone.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
          <li>Photos can wait — the desk will schedule a shoot if the unit is in Nakuru or nearby.</li>
          <li>Price in Kenyan shillings. Be honest on kilometres and status.</li>
          <li>Private sellers and yards use the same form.</li>
        </ul>

        <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Need help? Reach the desk
          </p>
          <ul className="mt-3 grid gap-3">
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
                <span>WhatsApp · +254 769 679 667</span>
              </a>
            </li>
            <li>
              <a
                href="mailto:otuko88motorstores@gmail.com"
                className="flex items-center gap-2 break-all text-sm transition-colors hover:text-primary"
              >
                <Mail className="size-4 shrink-0" />
                <span>otuko88motorstores@gmail.com</span>
              </a>
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>Nakuru, Kenya</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-7">
        <SignedOut>
          <div className="rounded-xl bg-card p-8 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-2xl font-semibold">Sign in to list</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sellers need an account so buyers know who they’re dealing with.
              It takes a minute — no fees, no spam.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/sign-up">Create account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <form
            onSubmit={submit}
            className="grid gap-4 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]"
          >
            <div className="flex gap-2">
              <Button
                type="button"
                variant={kind === "car" ? "default" : "outline"}
                onClick={() => setKind("car")}
              >
                Vehicle
              </Button>
              <Button
                type="button"
                variant={kind === "part" ? "default" : "outline"}
                onClick={() => setKind("part")}
              >
                Part
              </Button>
            </div>
            <Field label="Title" htmlFor="title">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "car" ? "2018 Toyota Harrier Premium" : "Prado 150 front discs"}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Make">
                <Select value={make} onValueChange={setMake}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAKES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Model" htmlFor="model">
                <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
              </Field>
            </div>
            {kind === "car" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Year" htmlFor="year">
                    <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
                  </Field>
                  <Field label="Fuel">
                    <Select value={fuel} onValueChange={(v) => setFuel(v as Fuel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Gearbox">
                    <Select
                      value={transmission}
                      onValueChange={(v) => setTransmission(v as Transmission)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Body">
                    <Select value={body} onValueChange={(v) => setBody(v as Body)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BODIES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Kilometres" htmlFor="km">
                    <Input
                      id="km"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              </>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Asking price (KSh)" htmlFor="price">
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Location" htmlFor="location">
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nakuru, Milimani"
                />
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Notes for the desk" htmlFor="desc">
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Service history, accident, logbook, where to view…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="sname">
                <Input
                  id="sname"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                />
              </Field>
              <Field label="WhatsApp" htmlFor="sphone">
                <Input
                  id="sphone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 7…"
                />
              </Field>
            </div>
            <Field label="Email (optional)" htmlFor="semail">
              <Input
                id="semail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit to the desk"}
            </Button>
          </form>
        </SignedIn>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}