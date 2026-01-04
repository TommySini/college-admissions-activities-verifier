import * as React from 'react';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export function Sheet({ open, onOpenChange, children, side = 'left' }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed z-50 bg-white shadow-lg transition-transform duration-300',
          side === 'left' && 'left-0 top-0 bottom-0 w-full max-w-md',
          side === 'right' && 'right-0 top-0 bottom-0 w-full max-w-md',
          side === 'top' && 'top-0 left-0 right-0 h-full max-h-96',
          side === 'bottom' && 'bottom-0 left-0 right-0 h-full max-h-96'
        )}
      >
        {children}
      </div>
    </>
  );
}

interface SheetHeaderProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function SheetHeader({ children, onClose }: SheetHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-200">
      <div className="flex-1">{children}</div>
      <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <X className="h-5 w-5 text-slate-600" />
      </button>
    </div>
  );
}

export function SheetTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn('text-xl font-semibold text-slate-900', className)}>{children}</h2>;
}

export function SheetContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-6 overflow-y-auto max-h-[calc(100vh-140px)]', className)}>{children}</div>
  );
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-6 border-t border-slate-200 bg-slate-50', className)}>{children}</div>
  );
}
