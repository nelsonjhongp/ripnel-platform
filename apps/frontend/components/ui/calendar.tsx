"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  useDayPicker,
  type DayPickerProps,
  type MonthCaptionProps,
} from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function CalendarMonthCaption({ calendarMonth, className }: MonthCaptionProps) {
  const { previousMonth, nextMonth, goToMonth, labels } = useDayPicker()
  const caption = format(calendarMonth.date, "LLLL yyyy", { locale: es })

  return (
    <div
      className={cn("mx-auto flex min-h-7 w-full max-w-[11rem] items-center justify-between gap-2", className)}
    >
      <button
        type="button"
        aria-label={labels.labelPrevious(previousMonth)}
        aria-disabled={!previousMonth}
        tabIndex={previousMonth ? undefined : -1}
        onClick={() => {
          if (previousMonth) goToMonth(previousMonth)
        }}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "h-6 w-6 rounded-md border border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)] disabled:pointer-events-none disabled:opacity-35"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-[var(--ops-text)]">
        {caption}
      </span>

      <button
        type="button"
        aria-label={labels.labelNext(nextMonth)}
        aria-disabled={!nextMonth}
        tabIndex={nextMonth ? undefined : -1}
        onClick={() => {
          if (nextMonth) goToMonth(nextMonth)
        }}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "h-6 w-6 rounded-md border border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)] disabled:pointer-events-none disabled:opacity-35"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = es,
  ...props
}: DayPickerProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      hideNavigation
      className={cn("p-2.5", className)}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn("flex w-full flex-col", defaultClassNames.months),
        month: cn("w-full space-y-3", defaultClassNames.month),
        month_caption: cn("mb-1", defaultClassNames.month_caption),
        caption_label: cn("text-sm font-semibold capitalize text-[var(--ops-text)]", defaultClassNames.caption_label),
        nav: cn("hidden", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "h-6 w-6 rounded-md border border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "h-6 w-6 rounded-md border border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]",
          defaultClassNames.button_next
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("mb-1 grid grid-cols-7", defaultClassNames.weekdays),
        weekday: cn(
          "text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 grid grid-cols-7", defaultClassNames.week),
        day: cn("flex items-center justify-center", defaultClassNames.day),
        today: cn(
          "[&>button]:border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] [&>button]:bg-[color:color-mix(in_srgb,var(--ripnel-accent)_8%,var(--ops-surface))] [&>button]:text-[var(--ripnel-accent-hover)]",
          defaultClassNames.today
        ),
        outside: cn("text-[var(--ops-text-muted)] opacity-45", defaultClassNames.outside),
        disabled: cn("opacity-35", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        selected: cn(
          "[&>button]:border-[color:color-mix(in_srgb,var(--ripnel-accent)_48%,var(--ops-border-strong))] [&>button]:bg-[var(--ripnel-accent)] [&>button]:font-semibold [&>button]:text-white [&>button:hover]:bg-[var(--ripnel-accent-hover)] [&>button:hover]:text-white",
          defaultClassNames.selected
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "h-8 w-8 rounded-md border border-transparent text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)] focus-visible:ring-[var(--ripnel-accent)] aria-selected:border-[color:color-mix(in_srgb,var(--ripnel-accent)_48%,var(--ops-border-strong))] aria-selected:bg-[var(--ripnel-accent)] aria-selected:text-white aria-selected:hover:bg-[var(--ripnel-accent-hover)] aria-selected:hover:text-white",
          defaultClassNames.day_button
        ),
        ...classNames,
      }}
      components={{
        MonthCaption: CalendarMonthCaption,
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...iconProps} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", iconClassName)} {...iconProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
