"use client"

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

type CompactPickerBaseProps = {
  className?: string
  children?: ReactNode
}

type CompactPickerListProps = CompactPickerBaseProps & HTMLAttributes<HTMLDivElement>

type CompactPickerOptionProps = CompactPickerBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean
    selected?: boolean
  }

export function CompactPickerPopover({ className, children }: CompactPickerBaseProps) {
  return (
    <div className={cn("ops-picker-popover overflow-hidden rounded-xl", className)}>
      {children}
    </div>
  )
}

export function CompactPickerList({ className, children, ...props }: CompactPickerListProps) {
  return (
    <div className={cn("ops-picker-list", className)} {...props}>
      {children}
    </div>
  )
}

export function CompactPickerOption({
  active = false,
  selected = false,
  className,
  children,
  ...props
}: CompactPickerOptionProps) {
  return (
    <button
      type="button"
      data-active={active ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      className={cn("ops-picker-option block w-full px-3 py-2 text-left", className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function CompactPickerEmpty({ className, children }: CompactPickerBaseProps) {
  return (
    <div className={cn("px-3 py-4 text-sm text-[var(--ops-text-muted)]", className)}>
      {children}
    </div>
  )
}

export function CompactPickerSeparator({ className }: Pick<CompactPickerBaseProps, "className">) {
  return <div className={cn("ops-picker-separator", className)} />
}

export default CompactPickerPopover
