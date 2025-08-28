// src/components/ui/use-toast.ts
import * as React from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Toast options for Reggio UI
 */
export type ToastOptions = {
  title?: string;
  description?: React.ReactNode;
  duration?: number; // ms
  action?: React.ReactNode; // button/link element shown inside the toast
  variant?: "default" | "destructive" | "success" | "warning";
};

/**
 * Fire-and-forget toast function.
 *
 * Examples:
 *  toast({ title: "Saved", description: "Your changes are live." })
 *  toast({ variant: "destructive", title: "Error", description: "Something went wrong." })
 */
export function toast(opts: ToastOptions) {
  const { title, description, duration, action, variant = "default" } = opts ?? {};

  // Map our variants to Sonner styles via className if needed.
  // You can style via global .sonner-* classes or keep default styling.
  return sonnerToast(title ?? "", {
    description,
    duration,
    action,
    className:
      variant === "destructive"
        ? "bg-danger-50 text-danger-700 border border-danger-200"
        : variant === "success"
        ? "bg-success-50 text-success-700 border border-success-200"
        : variant === "warning"
        ? "bg-warning-50 text-warning-700 border border-warning-200"
        : undefined,
  });
}

/**
 * React hook form, mirroring shadcn’s API.
 */
export function useToast() {
  return React.useMemo(
    () => ({
      toast,
      // for API compatibility; add dismiss(id) etc. later if you need it
      dismiss: sonnerToast.dismiss,
      // id accessor if needed
      custom: sonnerToast.custom,
    }),
    []
  );
}

export type { ToastOptions as Toast };
