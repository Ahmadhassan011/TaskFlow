"use client";

import { motion } from "motion/react";

const steps = [
  {
    number: "01",
    title: "Create a project",
    description:
      "Set up your workspace in seconds. Name it, describe it, invite your team.",
  },
  {
    number: "02",
    title: "Add your tasks",
    description:
      "Break work into tasks with priorities, due dates, and assignees.",
  },
  {
    number: "03",
    title: "Track progress",
    description:
      "Move tasks across boards, check off subtasks, and hit deadlines.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Three steps to get your team on the same page.
          </p>
        </motion.div>

        <motion.div
          className="mt-14 grid gap-12 sm:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="flex flex-col items-center rounded-xl border bg-card p-6 text-center transition-all duration-200 hover:shadow-[0_4px_24px_-4px_rgba(88,70,200,0.10)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 min-h-[220px]"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-violet-500/10 text-lg text-primary">
                {step.number}
              </div>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
