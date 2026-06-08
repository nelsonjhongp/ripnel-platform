"use client"

import dynamic from "next/dynamic"

const ChatbotWidget = dynamic(
  () => import("./ChatbotWidget").then((m) => ({ default: m.ChatbotWidget })),
  { ssr: false }
)

export function ChatbotLazy() {
  return <ChatbotWidget />
}
