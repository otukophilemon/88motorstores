import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEnquiry } from "@/lib/enquiries/server";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const user = useCurrentUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Prefill from signed-in user once it loads
  if (user && !name && user.displayName) {
    setName(user.displayName);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error("Name, WhatsApp, and a message are required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createEnquiry({
        data: {
          listingTitle: "General enquiry",
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
          message: message.trim(),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Message sent to the desk.", {
        description: "We'll reply on WhatsApp shortly.",
      });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-primary">
        Contact the desk
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">
        Talk to a person.
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The 88Motor Stores desk brokers every introduction, answers questions,
        and connects buyers with sellers. Reach us however suits you.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <a
          href="https://wa.me/254769679667"
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-xl bg-card p-6 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MessageCircle className="size-5" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold">WhatsApp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            +254 769 679 667
          </p>
          <p className="mt-2 text-xs text-primary">Opens in new tab →</p>
        </a>

        <a
          href="tel:+254769679667"
          className="group rounded-xl bg-card p-6 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Phone className="size-5" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold">Call us</p>
          <p className="mt-1 text-sm text-muted-foreground">
            +254 769 679 667
          </p>
          <p className="mt-2 text-xs text-primary">Tap to dial →</p>
        </a>

        <a
          href="mailto:otuko88motorstores@gmail.com"
          className="group rounded-xl bg-card p-6 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail className="size-5" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold">Email</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            otuko88motorstores@gmail.com
          </p>
          <p className="mt-2 text-xs text-primary">Send a message →</p>
        </a>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4" />
        Nakuru, Kenya
      </div>

      {/* Message form */}
      <section className="mt-12 rounded-xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
        <h2 className="font-display text-2xl font-semibold">
          Send us a message
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll reply on WhatsApp. Your number stays with us — never published.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-5">
            <p className="font-medium">Message received.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The desk will get back to you on WhatsApp as soon as possible.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/">Back to home</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSent(false);
                  setMessage("");
                }}
              >
                Send another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ct-name">Your name</Label>
                <Input
                  id="ct-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ct-phone">WhatsApp</Label>
                <Input
                  id="ct-phone"
                  inputMode="tel"
                  placeholder="+254 7…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ct-message">Message</Label>
              <Textarea
                id="ct-message"
                rows={5}
                placeholder="What can the desk help with?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send to the desk"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}