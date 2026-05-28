"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        ops: "border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_88%,var(--ops-surface))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        "group-data-[variant=ops]/tabs-list:flex-none group-data-[variant=ops]/tabs-list:px-4 group-data-[variant=ops]/tabs-list:py-1.5 group-data-[variant=ops]/tabs-list:text-[var(--ops-text-muted)] group-data-[variant=ops]/tabs-list:hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_20%,var(--ops-border-strong))] group-data-[variant=ops]/tabs-list:hover:bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_34%,var(--ops-surface))] group-data-[variant=ops]/tabs-list:hover:text-[var(--ops-text)] group-data-[variant=ops]/tabs-list:data-[state=active]:border-[color:color-mix(in_srgb,var(--ripnel-accent)_55%,var(--ops-border-strong))] group-data-[variant=ops]/tabs-list:data-[state=active]:bg-[color:color-mix(in_srgb,var(--ripnel-accent)_82%,#ffffff_18%)] group-data-[variant=ops]/tabs-list:data-[state=active]:text-[color:color-mix(in_srgb,#ffffff_92%,var(--ops-text)_8%)] group-data-[variant=ops]/tabs-list:data-[state=active]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--ripnel-accent)_28%,transparent),inset_0_1px_0_rgba(255,255,255,0.1)] dark:group-data-[variant=ops]/tabs-list:data-[state=active]:border-[var(--ripnel-accent-hover)] dark:group-data-[variant=ops]/tabs-list:data-[state=active]:bg-[var(--ripnel-accent)] dark:group-data-[variant=ops]/tabs-list:data-[state=active]:text-white dark:group-data-[variant=ops]/tabs-list:data-[state=active]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--ripnel-accent)_34%,transparent),0_10px_24px_rgba(0,0,0,0.18)]",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
