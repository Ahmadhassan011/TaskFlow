"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Camera, Bell, BellOff, AlertTriangle } from "lucide-react";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { cn, getInitials } from "@/lib/utils";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(false);
  const [dueDateReminders, setDueDateReminders] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setEmailNotifications(localStorage.getItem("tf_email_notifications") === "true");
    setDueDateReminders(localStorage.getItem("tf_due_date_reminders") === "true");
  }, []);

  const toggleEmailNotifications = () => {
    const next = !emailNotifications;
    setEmailNotifications(next);
    localStorage.setItem("tf_email_notifications", String(next));
    toast.success(next ? "Email notifications enabled" : "Email notifications disabled");
  };

  const toggleDueDateReminders = () => {
    const next = !dueDateReminders;
    setDueDateReminders(next);
    localStorage.setItem("tf_due_date_reminders", String(next));
    toast.success(next ? "Due date reminders enabled" : "Due date reminders disabled");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiClient.put("/auth/profile", { name, email });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.put("/auth/password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
      setPasswordDialogOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to change password"));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await apiClient.upload("/auth/profile/avatar", formData);
      await refreshUser();
      toast.success("Avatar updated");
    } catch {
      setAvatarPreview(null);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await apiClient.delete("/auth/account", { body: { password: deletePassword } });
      toast.success("Account deleted");
      window.location.href = "/login";
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to delete account"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="profile">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <div className="relative">
                <Avatar size="lg">
                  <AvatarImage src={avatarPreview || user?.avatar || undefined} />
                  <AvatarFallback>
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Camera className="size-3" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.role?.replace("_", " ")}</p>
              </div>
            </div>
            <Separator className="mb-4" />
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="password">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Keep your account secure with a strong, unique password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger render={<Button />}>Change Password</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change password</DialogTitle>
                  <DialogDescription>
                    Enter your current password, then choose a new one.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPasswordDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingPassword}>
                      {savingPassword && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Change Password
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card id="notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Bell className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive email when someone assigns you a task or comments.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailNotifications}
              onClick={toggleEmailNotifications}
              className={cn(
                "h-6 w-11 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                emailNotifications ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
                  emailNotifications ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <BellOff className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Due date reminders</p>
                <p className="text-xs text-muted-foreground">
                  Get reminded before a task deadline approaches.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dueDateReminders}
              onClick={toggleDueDateReminders}
              className={cn(
                "h-6 w-11 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                dueDateReminders ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
                  dueDateReminders ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card id="danger" className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanent actions that cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently deactivate your account and invalidate all sessions.
              </p>
            </div>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" />
                }
              >
                Delete account
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This will deactivate your account and sign you out. You will
                    need an admin to reactivate it.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="delete-password">
                      Enter your password to confirm
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      placeholder="Your password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={deleting || !deletePassword}
                    >
                      {deleting && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Delete account
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
