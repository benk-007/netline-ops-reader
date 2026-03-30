import { useEffect } from "react";
import styles from "./ImportFeedback.module.scss";

/**
 * Small inline feedback banner shown after a file import attempt.
 * Props:
 *   message  (string)           — text to display
 *   type     ("error"|"success"|null) — visual style
 *   onDismiss (function)        — called after 4 s to clear the message
 */
export default function ImportFeedback({ message, type, onDismiss }) {
  useEffect(() => {
    if (!message || !type) return;
    const id = setTimeout(() => { onDismiss && onDismiss(); }, 4000);
    return () => clearTimeout(id);
  }, [message, type, onDismiss]);

  if (!message || !type) return null;

  return (
    <div className={`${styles.banner} ${type === "error" ? styles.error : styles.success}`}>
      {message}
    </div>
  );
}
