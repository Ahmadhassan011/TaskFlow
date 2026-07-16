import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="TaskFlow"
      className={cn(
        "inline-block shrink-0 object-contain",
        sizeClasses[size],
        className
      )}
    />
  );
}