import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InputGroupContextValue = {
  inputId?: string;
  describedBy?: string;
  invalid?: boolean;
};

const InputGroupContext = React.createContext<InputGroupContextValue | null>(null);

function InputGroup({
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <InputGroupContext.Provider
      value={{
        inputId: id,
        describedBy: ariaDescribedBy,
        invalid: ariaInvalid === true || ariaInvalid === "true",
      }}
    >
      <div
        data-slot="input-group"
        aria-invalid={ariaInvalid}
        className={cn(
          "flex items-center rounded-lg border border-input bg-background shadow-xs transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    </InputGroupContext.Provider>
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const context = React.useContext(InputGroupContext);

  return (
    <Input
      id={props.id ?? context?.inputId}
      aria-describedby={props["aria-describedby"] ?? context?.describedBy}
      aria-invalid={props["aria-invalid"] ?? context?.invalid}
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
