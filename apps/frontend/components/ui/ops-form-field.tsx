"use client"

import { type ReactNode, type ReactElement, cloneElement, isValidElement, useId } from "react"
import { cn } from "@/lib/utils"

export function OpsFormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
  className,
  density = "default",
}: {
  id?: string
  label: string
  required?: boolean
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
  density?: "default" | "compact"
}) {
  const generatedId = useId()
  const messageId = useId()
  const controlId = id ?? generatedId

  type FieldChildProps = {
    id?: string
    "aria-describedby"?: string
    "aria-invalid"?: boolean
  }

  const describedChild = isValidElement(children)
    ? (() => {
        const child = children as ReactElement<FieldChildProps>

        return cloneElement(child, {
          id: child.props.id ?? controlId,
          "aria-describedby": error || hint ? messageId : child.props["aria-describedby"],
          "aria-invalid": error ? true : child.props["aria-invalid"],
        })
      })()
    : children

  return (
    <div
      data-field-error={error ? "true" : undefined}
      className={cn(
        density === "compact" ? "space-y-1" : "space-y-1.5",
        className,
      )}
    >
      <label
        htmlFor={controlId}
        className={cn(
          "block text-[11px] font-semibold uppercase tracking-[0.16em]",
          error
            ? "text-[var(--ops-tone-danger-text)]"
            : "text-[var(--ops-text-muted)]",
        )}
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-sm leading-none text-[var(--ops-tone-danger-text)]">*</span>
        ) : null}
      </label>
      {describedChild}
      {error ? (
        <p
          id={messageId}
          role="alert"
          className="text-[11px] font-medium text-[var(--ops-tone-danger-text)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[11px] text-[var(--ops-text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Utility: agrega clases de error a un input custom cuando el wrapper
 * OpsFormField tiene el atributo data-field-error="true".
 * Usar en wrappers de input propios que necesiten responder al estado de error.
 */
export function opsFormFieldErrorInputClass(baseClass: string): string {
  return cn(
    baseClass,
    "data-field-error:border-[var(--ops-tone-danger-border)] data-field-error:bg-[var(--ops-tone-danger-bg)]",
  )
}
