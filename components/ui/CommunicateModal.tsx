"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Megaphone, Send, AlertTriangle, X, Search, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { communicateUsers, searchUsers, CommunicatePayload } from "@/lib/userService";

const communicateSchema = z.object({
  target: z.enum(["ALL_USERS", "SPECIFIC_USERS"]),
  channel: z.enum(["EMAIL", "PUSH", "BOTH"]),
  subject: z.string().min(3, "Subject/Title must be at least 3 characters").max(100, "Subject is too long"),
  message: z.string().min(10, "Message body must be at least 10 characters").max(2000, "Message body is too long"),
});

type FormValues = z.infer<typeof communicateSchema>;

export interface PreselectedUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface CommunicateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTarget?: "ALL_USERS" | "SPECIFIC_USERS";
  preselectedUsers?: PreselectedUser[];
  onSuccess?: () => void;
}

interface SelectedUser {
  id: number;
  email: string;
  name: string;
}

export function CommunicateModal({
  open,
  onOpenChange,
  defaultTarget = "ALL_USERS",
  preselectedUsers = [],
  onSuccess,
}: CommunicateModalProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(communicateSchema),
    defaultValues: {
      target: defaultTarget,
      channel: "BOTH",
      subject: "",
      message: "",
    },
  });

  const selectedTarget = form.watch("target");
  const selectedChannel = form.watch("channel");

  const serializedPreselected = JSON.stringify(preselectedUsers);

  // Sync / reset form and selected list when modal state or preselected users change
  useEffect(() => {
    if (open) {
      form.reset({
        target: defaultTarget,
        channel: "BOTH",
        subject: "",
        message: "",
      });
      
      const parsed: PreselectedUser[] = JSON.parse(serializedPreselected);
      const mapped = parsed.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.email ?? `User #${u.id}`),
      }));
      setSelectedRecipients(mapped);
      setSearchQuery("");
      setShowSuggestions(false);
    }
  }, [open, defaultTarget, serializedPreselected, form]);

  // Handle clicking outside suggestions popup to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search suggestions
  const { data: suggestions = [], isFetching: isSearching } = useQuery({
    queryKey: ["searchUsersForCommunication", searchQuery],
    queryFn: () => searchUsers(searchQuery, 8),
    enabled: searchQuery.trim().length >= 2,
  });

  const communicationMutation = useMutation({
    mutationFn: (payload: CommunicatePayload) => communicateUsers(payload),
    onSuccess: () => {
      toast.success("Communication process successfully queued in background.");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to trigger communication.";
      toast.error(msg);
    },
  });

  const onSubmit = (values: FormValues) => {
    if (values.target === "SPECIFIC_USERS" && selectedRecipients.length === 0) {
      toast.error("Please add at least one recipient to message.");
      return;
    }

    const payload: CommunicatePayload = {
      target: values.target,
      channel: values.channel,
      subject: values.subject,
      message: values.message,
      ...(values.target === "SPECIFIC_USERS"
        ? { userIds: selectedRecipients.map((r) => r.id) }
        : {}),
    };

    communicationMutation.mutate(payload);
  };

  const addRecipient = (user: any) => {
    if (selectedRecipients.some((r) => r.id === user.id)) {
      toast.error("User is already added.");
      return;
    }
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.displayName || user.email);
    setSelectedRecipients((prev) => [...prev, { id: user.id, email: user.email, name }]);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const removeRecipient = (id: number) => {
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const isBroadcasting = selectedTarget === "ALL_USERS";
  const recipientCount = selectedRecipients.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!communicationMutation.isPending) onOpenChange(v); }}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white max-h-[90vh] flex flex-col">
        {/* Header Gradient */}
        <div className="bg-gradient-to-r from-blue via-indigo-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {isBroadcasting ? (
              <Megaphone className="w-5 h-5 text-blue-100 animate-pulse" />
            ) : (
              <Mail className="w-5 h-5 text-blue-100" />
            )}
            <div>
              <DialogTitle className="text-lg font-bold text-white">Send Admin Communication</DialogTitle>
              <p className="text-xs text-blue-100/80 mt-0.5">
                {isBroadcasting ? "Broadcast message to all users" : `Send message to selected users`}
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Warning Banner for System-Wide Broadcasts */}
            {isBroadcasting && (
              <div className="flex gap-3 bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-amber-900 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold">Caution: System-Wide Broadcast</span>
                  <p className="text-xs text-amber-800/90 leading-relaxed">
                    This will queue push notifications and emails to <span className="font-bold underline">every user</span> in the system database. Ensure the subject and message content are proofread and approved.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Dropdown */}
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Message Scope</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (val === "SPECIFIC_USERS" && selectedRecipients.length === 0 && preselectedUsers.length > 0) {
                          const mapped = preselectedUsers.map((u) => ({
                            id: u.id,
                            email: u.email,
                            name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.email ?? `User #${u.id}`),
                          }));
                          setSelectedRecipients(mapped);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white border-gray-200 shadow-sm focus:ring-blue h-10">
                          <SelectValue placeholder="Select target scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_USERS">All Users (Broadcast)</SelectItem>
                        <SelectItem value="SPECIFIC_USERS">Specific Selected Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[11px] text-gray-400">
                      Who should receive this message.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Delivery Channel */}
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Delivery Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white border-gray-200 shadow-sm focus:ring-blue h-10">
                          <SelectValue placeholder="Select communication channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email Dispatch Only</SelectItem>
                        <SelectItem value="PUSH">Mobile Push Notification Only</SelectItem>
                        <SelectItem value="BOTH">Both (Email & Push)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[11px] text-gray-400">
                      Channel used for dispatching.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recipient Search and Management (Only shown for SPECIFIC_USERS) */}
            {!isBroadcasting && (
              <div className="space-y-3 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                <div className="space-y-1.5">
                  <span className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>Recipients ({recipientCount})</span>
                    <span className="text-xs font-normal text-gray-400">Search and select users below</span>
                  </span>
                  
                  {/* Search Input Box */}
                  <div className="relative" ref={suggestionsRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search users by name or email (min 2 characters)..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="pl-9 bg-white border-gray-200 shadow-sm focus:ring-blue h-10"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                      )}
                    </div>

                    {/* Autocomplete Suggestions */}
                    {showSuggestions && searchQuery.trim().length >= 2 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-gray-50">
                        {suggestions.length === 0 && !isSearching ? (
                          <div className="p-3 text-xs text-gray-400 text-center">No users match your query</div>
                        ) : (
                          suggestions.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="w-full text-left p-3 text-xs hover:bg-blue/5 transition-colors flex flex-col gap-0.5"
                              onClick={() => addRecipient(user)}
                            >
                              <span className="font-semibold text-gray-900">
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.displayName || "Unknown User")}
                              </span>
                              <span className="text-gray-400">{user.email}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Recipients Badges */}
                {selectedRecipients.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-2">
                    {selectedRecipients.map((rec) => (
                      <Badge
                        key={rec.id}
                        variant="secondary"
                        className="bg-blue/10 text-blue border border-blue/20 text-xs py-1 pl-2 pr-1.5 flex items-center gap-1.5 rounded-lg font-medium"
                      >
                        <span className="truncate max-w-[200px]" title={`${rec.name} (${rec.email})`}>
                          {rec.name}
                        </span>
                        <button
                          type="button"
                          className="hover:bg-blue/20 rounded-full p-0.5 text-blue transition-colors shrink-0"
                          onClick={() => removeRecipient(rec.id)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic py-2 text-center bg-white rounded-lg border border-dashed border-gray-200">
                    No recipients selected. Use the search input above to add users.
                  </div>
                )}
              </div>
            )}

            {/* Subject/Title Input */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Subject / Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedChannel === "PUSH"
                          ? "Enter notification title..."
                          : "Enter email subject / notification title..."
                      }
                      className="bg-white border-gray-200 shadow-sm focus:ring-blue h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] text-gray-400">
                    Acts as the subject line for emails and the top title card for push alerts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message Body Input */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Message Body
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your message content here..."
                      className="bg-white border-gray-200 shadow-sm focus:ring-blue min-h-[140px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] text-gray-400">
                    Keep body message concise, particularly when push notifications are selected.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm h-10 px-5"
                onClick={() => onOpenChange(false)}
                disabled={communicationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue hover:bg-darkBlue text-white shadow-sm gap-2 h-10 px-5"
                disabled={communicationMutation.isPending}
              >
                {communicationMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Communication
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
