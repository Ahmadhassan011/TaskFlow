"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Loader2, CheckCircle, Mail, AlertTriangle, LogOut } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const { user, isAuthenticated, switchTenant, logout } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [done, setDone] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await apiClient.post<{ tenantId: string; role: string }>(
        "/tenants/invites/accept",
        { token }
      );
      toast.success("You've joined the workspace!");
      setDone(true);
      await switchTenant(res.tenantId);
      router.push("/dashboard");
    } catch (err) {
      const message = extractErrorMessage(err);
      // Email mismatch: the logged-in account isn't the invited one.
      if (/different email/i.test(message)) {
        toast.error("This invitation is for a different email address.");
      } else {
        toast.error(message);
      }
      setIsAccepting(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="size-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm text-muted-foreground">
          Invitation accepted. Taking you to your workspace…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">You&apos;re invited</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in or create an account with the email address this invitation
            was sent to, then open the link again to join.
          </p>
        </div>
        <div className="space-y-2">
          <Link href="/login" className="block">
            <Button size="lg" className="w-full">
              Sign in
            </Button>
          </Link>
          <Link href="/register" className="block">
            <Button size="lg" variant="outline" className="w-full">
              Create an account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Join this workspace?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You&apos;re signed in as{" "}
          <span className="font-medium text-foreground">{user?.email}</span>.
          Accept the invitation to become a member.
        </p>
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={handleAccept}
        disabled={isAccepting}
      >
        {isAccepting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Accept invitation
      </Button>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3.5" />
          Not {user?.email}? You must accept with the invited address.
        </p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out and switch account
        </button>
      </div>
    </div>
  );
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  if (!token) {
    return (
      <AuthShell>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">
            This invitation link is invalid.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="w-full">
              Go to dashboard
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <AcceptInviteForm token={token} />
      </motion.div>
    </AuthShell>
  );
}
