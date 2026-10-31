import { cn } from "@/lib/utils";

/** A thin bar; `value` is 0..100. Decorative: put the numbers next to it. */
export function Progress({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <span data-slot="progress" aria-hidden="true" className={cn("block h-1 overflow-hidden rounded-sm bg-border", className)}>
      <span className="block h-full bg-progress" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </span>
  );
}
