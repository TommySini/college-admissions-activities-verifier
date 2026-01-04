import { cn } from '@/lib/utils';

type StatItemProps = {
  label: string;
  value: number;
  color: string;
  icon: string;
};

export function StatItem({ label, value, color, icon }: StatItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100">
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-bold', color)}>{icon}</span>
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}
