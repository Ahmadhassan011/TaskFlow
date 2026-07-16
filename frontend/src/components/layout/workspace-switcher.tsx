"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABEL } from "@/lib/constants";

export function WorkspaceSwitcher() {
  const { tenantId, tenants, switchTenant } = useAuth();
  const [pending, setPending] = useState<string | null>(null);

  const current = tenants.find((t) => t.id === tenantId) ?? tenants[0];

  // Nothing to switch between until the workspace list has loaded.
  if (!current) return null;

  const handleSwitch = async (id: string) => {
    if (id === tenantId || pending) return;
    setPending(id);
    try {
      await switchTenant(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch workspace");
    } finally {
      setPending(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="gap-2 px-2"
            aria-label={`Current workspace: ${current.name}. Switch workspace`}
          >
            <Building2 className="size-4 text-muted-foreground" />
            <span className="max-w-[140px] truncate font-medium">{current.name}</span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>
          <span className="text-xs text-muted-foreground">Workspaces</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            disabled={pending !== null}
            onClick={() => handleSwitch(t.id)}
            className="gap-2"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              {pending === t.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : t.id === tenantId ? (
                <Check className="size-4" />
              ) : null}
            </span>
            <span className="flex-1 truncate">{t.name}</span>
            <Badge variant="secondary" className="text-[10px]">
              {ROLE_LABEL[t.role]}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
