"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  showCloseButton?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "2xl",
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-[backdropFadeIn_0.3s_ease-out] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} mx-4 rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFadeIn_0.3s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              {title && (
                <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-slate-600 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

