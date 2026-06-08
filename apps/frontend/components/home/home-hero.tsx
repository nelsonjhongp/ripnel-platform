"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HomeHeaderAction {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  variant?: "accent" | "outline";
}

export function HomeHeader({
  eyebrow,
  title,
  metadata,
  actions,
}: {
  eyebrow: string;
  title: string;
  metadata: string[];
  actions: HomeHeaderAction[];
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ops-text)] md:text-[1.75rem]">
          {title}
        </h1>
        {metadata.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {metadata.map((item) => (
              <span
                key={item}
                className="sales-chip rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--ops-text-muted)]"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant ?? "outline"}
              size="sm"
              className="rounded-full px-4"
              asChild
            >
              <Link href={action.href}>
                <span className={cn("h-4 w-4", "[&_svg]:h-4 [&_svg]:w-4")}>
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      )}
    </header>
  );
}
