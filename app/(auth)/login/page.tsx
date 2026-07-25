"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { loginAdmin, loginWithGoogleAdmin } from "@/lib/authService";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const formSchema = z.object({
  identifier: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

export default function LoginPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}

function LoginForm() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const handleAuthSuccess = (data: any) => {
    const role = (data.user?.role ?? "").toUpperCase();
    const ALLOWED_ROLES = ["ADMIN", "STAFF", "PARTNER"];
    if (!ALLOWED_ROLES.includes(role)) {
      toast.error(
        `Access denied: your account role ("${data.user?.role ?? "unknown"}") does not have permission to access the dashboard.`,
      );
      return;
    }
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    toast.success("Login successful!");
    router.push("/dashboard");
  };

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: handleAuthSuccess,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: loginWithGoogleAdmin,
    onSuccess: handleAuthSuccess,
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Google login failed. Please try again.",
      );
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(values);
  }

  const isPending = loginMutation.isPending || googleLoginMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-800">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Scath Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@scath.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-blue hover:bg-darkBlue text-white"
              disabled={isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                googleLoginMutation.mutate(credentialResponse.credential);
              }
            }}
            onError={() => {
              toast.error("Google sign in failed. Please try again.");
            }}
            useOneTap={false}
            theme="outline"
            shape="rectangular"
          />
        </div>
      </div>
    </div>
  );
}

