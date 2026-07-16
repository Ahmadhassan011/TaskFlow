"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Paperclip, Upload, Trash2, Download, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import type { Attachment } from "@/types";

interface TaskAttachmentsProps {
  taskId: string;
  attachments: Attachment[];
  onAttachmentAdded: (attachment: Attachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
}

export function TaskAttachments({
  taskId,
  attachments,
  onAttachmentAdded,
  onAttachmentDeleted,
}: TaskAttachmentsProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/tasks/${taskId}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: formData,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Upload failed");
      }
      const attachment = await res.json();
      onAttachmentAdded(attachment);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await apiClient.delete(`/attachments/${attachmentId}`);
      onAttachmentDeleted(attachmentId);
      toast.success("Attachment deleted");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Paperclip className="size-4" />
            Attachments ({attachments.length})
          </span>
          <label>
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
            >
              <Upload className="mr-2 size-3" />
              Upload
            </Button>
          </label>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {uploading && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <Skeleton className="size-8 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        )}
        {attachments.length === 0 && !uploading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No attachments yet
          </p>
        ) : (
          attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <FileIcon className="size-8 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {a.originalName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(a.size)}
                  {a.uploadedBy && ` • ${a.uploadedBy.name}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/attachments/${a.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon-sm">
                    <Download className="size-3" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
