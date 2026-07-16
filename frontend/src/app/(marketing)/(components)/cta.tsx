"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.06] via-violet-500/[0.04] to-transparent" />
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Start managing projects{" "}
          <span className="text-primary">the right way</span>
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Free for small teams. No credit card required.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Get started free
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/#features" />}
          >
            See features
          </Button>
        </div>
      </div>
    </section>
  );
}
