import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <Loader2 className="size-full animate-spin" />
    </span>
  );
}

export { Spinner };
