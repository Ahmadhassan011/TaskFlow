"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">
      <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/10 via-fuchsia-500/6 to-sky-500/3 blur-[160px] animate-float" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-fuchsia-500/5 via-primary/6 to-indigo-500/4 blur-[140px] animate-float [animation-delay:2s]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-32">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
            Manage projects
            <br />
            <span className="text-primary">without the chaos</span>
          </h1>

          <motion.p
            className="mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          >
            TaskFlow gives your team a clear view of every project, task, and
            deadline — so nothing slips through the cracks.
          </motion.p>

          <motion.div
            className="mt-9 flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          >
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Get started free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See how it works
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
