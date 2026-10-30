import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Avatar = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root data-slot="avatar" className={cn("relative flex size-5 shrink-0 overflow-hidden rounded-full", className)} {...props} />
);
const AvatarImage = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full", className)} {...props} />
);
const AvatarFallback = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn("flex size-full items-center justify-center rounded-full bg-badge text-[10px] uppercase text-badge-foreground", className)} {...props} />
);

export { Avatar, AvatarImage, AvatarFallback };
