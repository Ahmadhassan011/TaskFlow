"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient, extractErrorMessage } from "@/lib/api";
import type { Label } from "@/types";

interface TaskLabelPickerProps {
  projectId: string;
  selectedLabels: Label[];
  onLabelsChange: (labelIds: string[]) => void;
}

export function TaskLabelPicker({
  projectId,
  selectedLabels,
  onLabelsChange,
}: TaskLabelPickerProps) {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);

  useEffect(() => {
    apiClient
      .get<{ data: Label[] }>(`/projects/${projectId}/labels?limit=100`)
      .then((res) => setAvailableLabels(res.data || []))
      .catch(() => {});
  }, [projectId]);

  const selectedIds = new Set(selectedLabels.map((l) => l.id));

  const toggleLabel = async (labelId: string) => {
    const nextIds = selectedIds.has(labelId)
      ? [...selectedLabels.filter((l) => l.id !== labelId).map((l) => l.id)]
      : [...selectedLabels.map((l) => l.id), labelId];
    try {
      onLabelsChange(nextIds);
    } catch {
      toast.error(extractErrorMessage("Failed to update labels"));
    }
  };

  if (availableLabels.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selectedLabels.map((label) => (
          <Badge
            key={label.id}
            variant="outline"
            style={{ borderColor: label.color, color: label.color }}
            className="gap-1 pr-1"
          >
            {label.name}
            <button
              type="button"
              onClick={() => toggleLabel(label.id)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
            >
              <X className="size-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" />
          }
        >
          <Tag className="mr-2 size-3" />
          {selectedLabels.length > 0 ? "Change labels" : "Add labels"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableLabels.map((label) => (
            <DropdownMenuItem
              key={label.id}
              onClick={() => toggleLabel(label.id)}
            >
              <div
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1">{label.name}</span>
              {selectedIds.has(label.id) && (
                <span className="text-xs text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
