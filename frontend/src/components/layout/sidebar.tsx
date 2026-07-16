"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Logo } from "@/components/shared/logo";
import { navItems } from "@/lib/constants";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

  const filtered = navItems.filter(
    (item) => !item.adminOnly || user?.role === "OWNER" || user?.role === "ADMIN"
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }}
      className="relative flex h-full flex-col border-r bg-card"
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Logo size="md" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={reducedMotion ? false : { opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={reducedMotion ? undefined : { opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-sm font-semibold"
            >
              TaskFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
        {filtered.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={reducedMotion ? false : { opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={reducedMotion ? undefined : { opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start gap-3")}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : undefined}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
