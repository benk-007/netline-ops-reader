import { useContext } from "react";
import { ToastContext } from "./ToastProvider";

/**
 * Hook to show toast notifications from any component.
 *
 * @returns {{ toast: (message: string, type?: 'success'|'error'|'info'|'warning', duration?: number) => void }}
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast("User created successfully", "success");
 *   toast("Import failed", "error");
 */
export function useToast() {
  return useContext(ToastContext);
}
