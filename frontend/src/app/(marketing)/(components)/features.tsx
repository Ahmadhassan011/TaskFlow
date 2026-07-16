"use client";

import { motion } from "motion/react";
import { LayoutGrid, Activity, Shield } from "lucide-react";

const features = [
  {
    icon: LayoutGrid,
    title: "Kanban Boards",
    description:
      "Drag and drop tasks across customizable columns. See your entire workflow at a glance.",
    color: "text-primary bg-primary/10",
    visual: (
      <div className="mt-6 grid grid-cols-3 gap-2">
        <div className="space-y-2">
          <div className="h-2 w-12 rounded bg-muted" />
          <div className="h-8 rounded bg-primary/8 border border-primary/15" />
          <div className="h-8 rounded bg-muted/40 border" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-16 rounded bg-muted" />
          <div className="h-8 rounded bg-amber-500/8 border border-amber-500/15" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-10 rounded bg-muted" />
          <div className="h-8 rounded bg-emerald-500/8 border border-emerald-500/15" />
          <div className="h-8 rounded bg-emerald-500/8 border border-emerald-500/15" />
        </div>
      </div>
    ),
  },
  {
    icon: Activity,
    title: "Activity Tracking",
    description:
      "Every change is logged. Know who did what, when, and why — full accountability.",
    color: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    visual: (
      <div className="mt-6 space-y-3">
        {[
          { color: "bg-primary", text: "moved Task to In Progress" },
          { color: "bg-emerald-500", text: "completed Code Review" },
          { color: "bg-amber-500", text: "commented on Design" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <div className={`size-1.5 rounded-full ${item.color}`} />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Control who sees what. Admins, project managers, and team members each get the right level.",
    color: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    visual: (
      <div className="mt-6 space-y-2">
        {[
          { role: "Admin", access: "Full access", color: "bg-violet-500/8 text-violet-600 dark:text-violet-400 border-violet-500/15" },
          { role: "Manager", access: "Project scope", color: "bg-primary/8 text-primary border-primary/15" },
          { role: "Member", access: "Assigned tasks", color: "bg-muted text-muted-foreground border" },
        ].map((item) => (
          <div
            key={item.role}
            className={`flex items-center justify-between rounded-lg border p-2 text-xs ${item.color}`}
          >
            <span className="font-medium">{item.role}</span>
            <span>{item.access}</span>
          </div>
        ))}
      </div>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Powerful features without the complexity. Ship projects faster with
            your team.
          </p>
        </motion.div>

        <motion.div
          className="mt-14 grid items-stretch gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="flex"
            >
                <div className="flex h-full w-full flex-col rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-[0_4px_24px_-4px_rgba(88,70,200,0.12)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
                <div
                  className={`mb-4 flex size-11 items-center justify-center rounded-lg ${feature.color}`}
                >
                  <feature.icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {feature.visual}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
