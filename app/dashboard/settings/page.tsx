"use client";

import { useState } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Camera,
  Mail,
  Shield,
  User,
  Fingerprint,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Headset,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Profile settings saved successfully");
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h2>
        <p className="text-muted-foreground text-sm">
          Manage your account preferences and global compliance configurations.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column - Profile */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all hover:shadow-md">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-blue via-lblue to-purple relative">
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="px-8 pb-8">
              <div className="relative flex justify-between items-end -mt-12 mb-8">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-950 shadow-lg bg-white dark:bg-zinc-900">
                    <AvatarImage src="" alt="Admin Avatar" />
                    <AvatarFallback className="text-2xl bg-faintSky dark:bg-blue/20 text-blue font-bold">
                      {user?.firstName?.[0] || "A"}
                      {user?.lastName?.[0] || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-md border border-gray-100 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:text-blue transition-colors group-hover:scale-110">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-faintSky dark:bg-blue/20 text-blue dark:text-lblue text-sm font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    {user?.role?.toUpperCase() || "ADMIN"}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 group">
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue transition-colors" />
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      defaultValue={user?.firstName || "Admin"}
                      className="bg-gray-50/50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-950 transition-colors rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-3 group">
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue transition-colors" />
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      defaultValue={user?.lastName || "User"}
                      className="bg-gray-50/50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-950 transition-colors rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="space-y-3 group">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue transition-colors" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email || "admin@scath.com"}
                    disabled
                    className="bg-gray-100/50 dark:bg-zinc-900/80 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400 rounded-xl h-11 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                    <Lock className="w-3.5 h-3.5" />
                    Email address cannot be changed directly. Contact superadmin.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-zinc-800/50 mt-8">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-blue hover:bg-darkBlue text-white rounded-xl px-8 h-11 transition-all hover:shadow-lg hover:-translate-y-0.5"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column - Compliance */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-zinc-800/50">
              <div className="p-2.5 bg-faintSky dark:bg-blue/20 rounded-xl text-blue dark:text-lblue">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Compliance
                </h3>
                <p className="text-xs text-muted-foreground">
                  Platform security rules
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="group flex items-start justify-between gap-4 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-gray-400 group-hover:text-blue transition-colors" />
                    <Label className="text-sm font-medium cursor-pointer">
                      Require MFA
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Force all admin users to use MFA on login.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="mt-1 data-[state=checked]:bg-blue"
                />
              </div>

              <div className="group flex items-start justify-between gap-4 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400 group-hover:text-blue transition-colors" />
                    <Label className="text-sm font-medium cursor-pointer">
                      Auto-lock Sessions
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Require password after 15m of inactivity.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="mt-1 data-[state=checked]:bg-blue"
                />
              </div>

              <div className="group flex items-start justify-between gap-4 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-400 group-hover:text-blue transition-colors" />
                    <Label className="text-sm font-medium cursor-pointer">
                      Strict KYC
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Block transactions for unverified users.
                  </p>
                </div>
                <Switch
                  defaultChecked
                  className="mt-1 data-[state=checked]:bg-blue"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-faintSky to-msky dark:from-blue/10 dark:to-darkBlue/30 rounded-2xl border border-sky/30 dark:border-blue/20 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue/10 rounded-full blur-2xl transition-all group-hover:bg-blue/20" />
            <h3 className="font-semibold text-blue dark:text-lblue mb-2 relative z-10 flex items-center gap-2">
              <Headset className="w-4 h-4" /> Need Help?
            </h3>
            <p className="text-sm text-blue/80 dark:text-lblue/80 mb-6 relative z-10">
              Contact the technical support team for advanced platform
              configurations.
            </p>
            <Button
              variant="outline"
              className="w-full bg-white/60 dark:bg-zinc-950/60 hover:bg-white dark:hover:bg-zinc-900 border-blue/20 text-blue transition-colors relative z-10 rounded-xl"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
