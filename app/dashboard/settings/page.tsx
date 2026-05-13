"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuthStore();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile settings saved successfully");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h2>
        <p className="text-muted-foreground text-sm">
          Manage your account settings and platform compliance rules.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card className="dark:bg-zinc-950 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal details and public profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" alt="Admin Avatar" />
                  <AvatarFallback className="text-xl bg-blue/10 text-blue font-semibold">
                    {user?.firstName?.[0] || "A"}
                    {user?.lastName?.[0] || "D"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button type="button" variant="outline" size="sm">
                    Change Avatar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue={user?.firstName || "Admin"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue={user?.lastName || "User"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email || "admin@scath.com"}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed directly. Contact superadmin.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  defaultValue={user?.role?.toUpperCase() || "ADMIN"}
                  disabled
                  className="bg-gray-50 uppercase font-medium text-gray-600 dark:bg-zinc-900"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="bg-blue hover:bg-darkBlue text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Compliance Tools */}
        <Card className="dark:bg-zinc-950 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Platform Compliance</CardTitle>
            <CardDescription>
              Manage global security and compliance rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label className="text-base font-medium">
                  Require Multi-Factor Authentication (MFA)
                </Label>
                <span className="text-sm text-muted-foreground">
                  Force all admin users to use MFA on login.
                </span>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label className="text-base font-medium">
                  Auto-lock Idle Sessions
                </Label>
                <span className="text-sm text-muted-foreground">
                  Require password after 15 minutes of inactivity.
                </span>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label className="text-base font-medium">
                  Strict KYC Enforcement
                </Label>
                <span className="text-sm text-muted-foreground">
                  Block all transactions for unverified platform users.
                </span>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
