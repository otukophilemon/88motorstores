import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEnquiry } from "@/lib/enquiries/server";

type Kind = "car" | "part" | "listing" | "nation";

export function EnquireDialog({
  kind,
  targetId,
  subject,
  triggerLabel = "Request introduction",
  triggerClassName,
  children,
}: {
  kind: Kind;
  targetId: string;
  subject: string;
  triggerLabel?: string;
  triggerClassName?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and WhatsApp number are required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createEnquiry({
        data: {
          listingId: targetId,
          listingTitle: subject,
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
          buyerCity: city.trim() || undefined,
          message: message.trim() || undefined,
        },
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("The 88Motor Stores desk has your request.", {
        description: "We’ll reach you on WhatsApp to connect you with the seller.",
      });
      setOpen(false);
      setName("");
      setPhone("");
      setCity("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit enquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className={triggerClassName}>{triggerLabel}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an introduction</DialogTitle>
          <DialogDescription>
            Sellers stay private. You talk to the 88Motor Stores desk first — we
            connect you to the seller on WhatsApp once we have verified the
            listing.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground">{subject}</p>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="enq-name">Your name</Label>
            <Input
              id="enq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enq-phone">WhatsApp</Label>
            <Input
              id="enq-phone"
              inputMode="tel"
              placeholder="+254 7…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enq-city">Where are you?</Label>
            <Input
              id="enq-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Nakuru, Nairobi, Mombasa"
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enq-msg">Note to the desk</Label>
            <Textarea
              id="enq-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="When can you view, budget, any must-haves…"
              disabled={submitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send to the desk"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}