import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/logo.png"
        alt="88Motor Stores"
        className="h-9 w-auto object-contain"
      />
    </span>
  );
}