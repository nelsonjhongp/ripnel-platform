"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import Link from "next/link"

type ProceedButtonProps = {
  text?: string
  className?: string
  link?: string
  onClick?: () => void
}

export function ProceedButton({
  text,
  className,
  link,
  onClick,
}: ProceedButtonProps) {
  if (link) {
    return (
      <Button
        asChild
        className={cn("rounded-full bg-violet-600 px-5 py-2 text-white hover:bg-violet-700", className)}
      >
        <Link href={link}>
          <ArrowLeft className="h-4 w-4" />
          <span>{text}</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn("rounded-full bg-violet-600 px-5 py-2 text-white hover:bg-violet-700", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{text}</span>
    </Button>
  )
}

export default ProceedButton
