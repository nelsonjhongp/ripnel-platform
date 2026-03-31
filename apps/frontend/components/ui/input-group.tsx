import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function InputGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "flex items-center rounded-lg border border-input bg-background shadow-xs transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0",
        className
      )}
      {...props}
    />
  );
}

function InputGroupAddon({
  align,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end";
}) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex items-center gap-2 px-2",
        align === "inline-end" ? "ml-auto" : "",
        className
      )}
      {...props}
    />
  );
}

function InputGroupButton({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("shadow-none", className)}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
};
