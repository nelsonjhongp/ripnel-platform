"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bot,
  ChevronDown,
  Maximize2,
  MessageSquare,
  Minimize2,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { useChatStore } from "@/store/chat-store"

export function ChatbotWidget() {
  const {
    isOpen,
    isMaximized,
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    toggleOpen,
    setOpen,
    toggleMaximize,
    setMaximized,
    setActiveConversation,
    sendMessage,
    loadConversations,
    deleteConversation,
    clearError,
  } = useChatStore()

  const [prompt, setPrompt] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSend = async () => {
    const text = prompt.trim()
    if (!text || isSending) return
    setPrompt("")
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    setMaximized(false)
    setActiveConversation("")
    useChatStore.setState({ activeConversationId: null, messages: [] })
    inputRef.current?.focus()
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id)
    if (isMaximized) {
      setMaximized(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setMaximized(false)
    useChatStore.setState({ activeConversationId: null, messages: [] })
  }

  const activeConv = conversations.find(
    (c) => c.conversation_id === activeConversationId
  )

  return (
    <>
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="group fixed bottom-6 right-6 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[var(--ripnel-accent,#b07ae4)] text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
          aria-label="Abrir chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-white shadow-2xl dark:bg-zinc-900 ${
            isMaximized
              ? "inset-0 m-4 rounded-xl border border-zinc-200 dark:border-zinc-700"
              : "bottom-6 right-6 h-[520px] w-[380px] rounded-xl border border-zinc-200 dark:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between rounded-t-xl border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--ripnel-accent,#b07ae4)]" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Asistente RIPNEL
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="cursor-pointer rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="Nueva conversacion"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={toggleMaximize}
                className="cursor-pointer rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label={isMaximized ? "Minimizar" : "Maximizar"}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="cursor-pointer rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={`flex flex-1 overflow-hidden ${
              isMaximized ? "" : ""
            }`}
          >
            {isMaximized && conversations.length > 0 && (
              <div className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="p-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Conversaciones
                </div>
                {conversations.map((conv) => (
                  <button
                    key={conv.conversation_id}
                    onClick={() => handleSelectConversation(conv.conversation_id)}
                    className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      conv.conversation_id === activeConversationId
                        ? "bg-[var(--ripnel-accent,#b07ae4)]/10 text-[var(--ripnel-accent,#b07ae4)]"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {conv.title || "Sin titulo"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.conversation_id)
                      }}
                      className="ml-auto cursor-pointer rounded p-0.5 text-zinc-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-1 flex-col">
              {isLoadingConversations ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--ripnel-accent,#b07ae4)]" />
                </div>
              ) : messages.length === 0 && !isSending ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <Bot className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Hola, soy el asistente de RIPNEL
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Preguntame sobre ventas, inventario, productos o como usar
                    el sistema.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--ripnel-accent,#b07ae4)]" />
                    </div>
                  ) : (
                    <>
                      {activeConv && (
                        <div className="mb-2 truncate text-xs font-medium text-zinc-400">
                          {activeConv.title || "Conversacion"}
                        </div>
                      )}
                      {messages.map((msg) => (
                        <div
                          key={msg.message_id}
                          className={`mb-2 flex ${
                            msg.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "bg-[var(--ripnel-accent,#b07ae4)] text-white"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="mb-2 flex justify-start">
                          <div className="max-w-[85%] rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
                            <span className="inline-flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.1s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0.2s]" />
                            </span>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              )}

              {error && (
                <div className="mx-3 mb-1 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                  <button
                    onClick={clearError}
                    className="ml-2 cursor-pointer font-medium underline"
                  >
                    ok
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-700">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu consulta..."
                  rows={1}
                  className="max-h-32 flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--ripnel-accent,#b07ae4)] focus:ring-1 focus:ring-[var(--ripnel-accent,#b07ae4)] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!prompt.trim() || isSending}
                  className="flex cursor-pointer items-center justify-center rounded-lg bg-[var(--ripnel-accent,#b07ae4)] p-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
