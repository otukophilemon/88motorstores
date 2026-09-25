import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/",
      });
      if (error) {
        toast.error(error.message ?? "Sign-in failed. Check your details.");
        return;
      }
      toast.success("Welcome back.");
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account</p>
      <h1 className="mt-1 font-display text-4xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sellers sign in to manage listings. Buyers don't need an account.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="li-email">Email</Label>
          <Input
            id="li-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="li-password">Password</Label>
          <Input
            id="li-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        New to 88Motor Stores?{" "}
        <Link to="/sign-up" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}