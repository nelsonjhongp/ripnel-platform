const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface ChatConversation {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SendMessageResult {
  conversation_id: string;
  response: string;
  cached: boolean;
  message_id: string;
}

export async function sendMessage(
  conversationId: string | null,
  prompt: string
): Promise<SendMessageResult> {
  const res = await fetch(`${API_BASE}/api/chatbot/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ conversation_id: conversationId, prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(err.message || 'Error al enviar mensaje');
  }
  const data = await res.json();
  return data.data;
}

export async function getConversations(): Promise<ChatConversation[]> {
  const res = await fetch(`${API_BASE}/api/chatbot/conversations`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error al cargar conversaciones');
  const data = await res.json();
  return data.data;
}

export async function getMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${API_BASE}/api/chatbot/conversations/${conversationId}/messages`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Error al cargar mensajes');
  const data = await res.json();
  return data.data;
}

export async function deleteConversationApi(
  conversationId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/chatbot/conversations/${conversationId}`,
    { method: 'DELETE', credentials: 'include' }
  );
  if (!res.ok) throw new Error('Error al eliminar conversacion');
}
