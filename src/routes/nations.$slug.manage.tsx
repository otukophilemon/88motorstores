import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Crown,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deleteClub,
  demoteFromAdmin,
  getClub,
  getClubMembers,
  promoteToAdmin,
  removeMember,
  type Club,
  type ClubMember,
  type ClubRole,
} from "@/lib/clubs/management";

export const Route = createFileRoute("/nations/$slug/manage")({
  component: ManageClubPage,
});

function ManageClubPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) return;
    setLoading(true);
    void getClub({ data: { slug } })
      .then(async (c) => {
        if (!c) {
          setNotFoundState(true);
          return;
        }
        setClub(c);
        const m = await getClubMembers({ data: { clubId: c.id } });
        setMembers(m);
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [slug, isPending, user]);

  if (isPending) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading club…</p>
      </main>
    );
  }

  if (notFoundState || !club) throw notFound();

  const myMembership = members.find((m) => m.userId === user.id);
  const myRole: ClubRole | null = myMembership?.role ?? null;
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin";
  const canManage = isOwner || isAdmin;

  if (!canManage) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Club
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Not authorized
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Only the club owner and admins can access this page.
        </p>
        <Button asChild className="mt-6">
          <Link to="/nations/$slug" params={{ slug }}>
            Back to club
          </Link>
        </Button>
      </main>
    );
  }

  const adminCount = members.filter((m) => m.role === "admin").length;

  async function run(
    key: string,
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    refresh = true,
  ) {
    setBusy(key);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(label);
        if (refresh && club) {
          const m = await getClubMembers({ data: { clubId: club.id } });
          setMembers(m);
        }
      } else {
        toast.error(r.error ?? "Action failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!club) return;
    if (
      !confirm(
        `Delete "${club.name}"? The club and its threads stay visible for 30 days, then are permanently removed.`,
      )
    )
      return;
    if (!confirm("This cannot be undone. Confirm again to proceed.")) return;
    await run(
      "delete",
      "Club deleted.",
      () => deleteClub({ data: { clubId: club.id } }),
      false,
    );
    void navigate({ to: "/nations" });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/nations/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {club.name}
      </Link>

      <p className="mt-6 text-xs uppercase tracking-[0.18em] text-primary">
        Manage club
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold">{club.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? "member" : "members"} ·{" "}
        {adminCount} {adminCount === 1 ? "admin" : "admins"} (max 5)
      </p>

      {/* Members list */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">
            <Users className="mr-2 inline size-5" />
            Members
          </h2>
        </div>

        {members.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {members.map((m) => {
              const isMe = m.userId === user.id;
              const canPromote =
                isOwner && m.role === "member" && adminCount < 5;
              const canDemote = isOwner && m.role === "admin";
              const canRemove =
                !isMe &&
                m.role !== "owner" &&
                (isOwner || (isAdmin && m.role === "member"));

              return (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{m.name}</p>
                      {m.role === "owner" ? (
                        <Badge variant="default" className="text-[10px]">
                          <Crown className="mr-1 size-3" />
                          Owner
                        </Badge>
                      ) : m.role === "admin" ? (
                        <Badge variant="outline" className="text-[10px]">
                          <ShieldCheck className="mr-1 size-3" />
                          Admin
                        </Badge>
                      ) : null}
                      {isMe ? (
                        <Badge variant="muted" className="text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {m.email} · joined{" "}
                      {new Date(m.joinedAt).toLocaleDateString("en-KE")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canPromote ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `promote-${m.userId}`}
                        onClick={() =>
                          run(
                            `promote-${m.userId}`,
                            `${m.name} is now an admin.`,
                            () =>
                              promoteToAdmin({
                                data: { clubId: club.id, userId: m.userId },
                              }),
                          )
                        }
                      >
                        <UserPlus className="size-3.5" />
                        Promote
                      </Button>
                    ) : null}
                    {canDemote ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `demote-${m.userId}`}
                        onClick={() =>
                          run(
                            `demote-${m.userId}`,
                            `${m.name} is now a member.`,
                            () =>
                              demoteFromAdmin({
                                data: { clubId: club.id, userId: m.userId },
                              }),
                          )
                        }
                      >
                        <UserMinus className="size-3.5" />
                        Demote
                      </Button>
                    ) : null}
                    {canRemove ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === `remove-${m.userId}`}
                        onClick={() => {
                          if (!confirm(`Remove ${m.name} from the club?`))
                            return;
                          void run(
                            `remove-${m.userId}`,
                            `${m.name} removed.`,
                            () =>
                              removeMember({
                                data: { clubId: club.id, userId: m.userId },
                              }),
                          );
                        }}
                      >
                        <UserMinus className="size-3.5" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Danger zone — owner only */}
      {isOwner ? (
        <section className="mt-14 rounded-xl border border-destructive/40 bg-card p-6 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-semibold text-destructive">
            Danger zone
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Deleting the club hides it immediately. Threads stay visible to
            members for 30 days, then everything is permanently removed.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            disabled={busy === "delete"}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            Delete club
          </Button>
        </section>
      ) : null}
    </main>
  );
}