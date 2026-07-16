"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";
import { LandingPage } from "@/app/(marketing)/landing-page";

export default function HomePage() {
  const router = useRouter();
  const token = getAccessToken();

  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);

  if (token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return <LandingPage />;
}
