"use client";

import { motion } from "motion/react";
import { Zap, Users, Shield } from "lucide-react";

const propositions = [
  {
    icon: Zap,
    title: "Ship faster",
    description:
      "From idea to done in one tool. No context switching, no lost updates.",
  },
  {
    icon: Users,
    title: "Stay aligned",
    description:
      "Everyone sees the same picture. Roles, permissions, and activity — all in sync.",
  },
  {
    icon: Shield,
    title: "Scale with confidence",
    description:
      "Built for small teams that grow. Role-based access keeps everything secure.",
  },
];

export function Stats() {
  return (
    <section className="border-t py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          {propositions.map((item, i) => (
            <motion.div
              key={item.title}
              className="text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-violet-500/10">
                <item.icon className="size-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
