"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders a reason/note textarea */
  reasonField?: boolean;
  reasonLabel?: string;
  reasonRequired?: boolean;
  /** Red destructive styling on confirm button */
  danger?: boolean;
  loading?: boolean;
  onConfirm: (reason?: string) => void;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  reasonField = false,
  reasonLabel = "Reason (optional)",
  reasonRequired = false,
  danger = false,
  loading = false,
  onConfirm,
}: ConfirmModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reasonRequired && !reason.trim()) return;
    onConfirm(reason.trim() || undefined);
  };

  const handleOpenChange = (v: boolean) => {
    if (!loading) {
      setReason("");
      onOpenChange(v);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {danger && (
              <AlertTriangle className="w-5 h-5 text-red shrink-0" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        {message && (
          <p className="text-sm text-gray-600 -mt-1">{message}</p>
        )}

        {reasonField && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              {reasonLabel}
              {reasonRequired && <span className="text-red ml-0.5">*</span>}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="bg-white border-gray-200 resize-none"
              rows={3}
            />
            {reasonRequired && !reason.trim() && (
              <p className="text-xs text-red">Reason is required.</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-gray-200"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            className={danger ? "bg-red hover:bg-red/90 text-white" : "bg-blue hover:bg-darkBlue text-white"}
            onClick={handleConfirm}
            disabled={loading || (reasonRequired && !reason.trim())}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
