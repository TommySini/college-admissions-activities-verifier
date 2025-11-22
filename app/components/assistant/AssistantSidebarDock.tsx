"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { useDarkMode } from "@/app/context/DarkModeContext";
import { cx } from "@/utils/cx";
import { ChatPanel } from "./ChatPanel";

export function AssistantSidebarDock() {
  const { data: session, status } = useSession();
  const { darkMode } = useDarkMode();
  const [open, setOpen] = useState(false);

  if (status !== "authenticated" || !session || session.user?.role !== "admin") {
    return null;
  }

  const handleToggle = () => setOpen((prev) => !prev);
  const handleClose = () => setOpen(false);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={handleToggle}
        title="Open Actify Assistant"
        aria-label="Open Actify Assistant"
        className={cx(
          "relative flex h-10 w-full items-center rounded-lg px-3 gap-3 justify-start transition-colors font-medium",
          darkMode
            ? open
              ? "bg-slate-800 text-white"
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
            : open
            ? "bg-gray-200 text-slate-900"
            : "text-slate-700 hover:bg-gray-100 hover:text-slate-900"
        )}
      >
        <MessageSquare className="h-5 w-5 shrink-0" />
        <span
          className="whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          aria-hidden
        >
          Actify Assistant
        </span>
      </button>

      <div
        className={cx(
          "fixed inset-0 z-[9998] bg-slate-950/40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
        onClick={handleClose}
      />

      <div
        className={cx(
          "fixed top-0 left-0 z-[9999] flex h-full w-full max-w-md flex-col border-r shadow-2xl transition-transform duration-300 ease-in-out",
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Actify Assistant"
      >
        <div
          className={cx(
            "flex items-center justify-between border-b px-4 py-4",
            darkMode ? "border-slate-800" : "border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
              AI
            </div>
            <div>
              <p className={cx("text-sm font-semibold", darkMode ? "text-white" : "text-slate-900")}>
                Actify Assistant
              </p>
              <p className={cx("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                Ask anything about your admin tools
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={cx(
              "rounded-full p-2 transition-colors",
              darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"
            )}
            aria-label="Close assistant"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-gray-900">
          <ChatPanel onClose={handleClose} />
        </div>
      </div>
    </div>
  );
}

