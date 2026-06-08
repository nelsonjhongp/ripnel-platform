const { query } = require('../../shared/db');

async function createConversation(userId, title) {
  const result = await query(
    `INSERT INTO chat_conversations (user_id, title)
     VALUES ($1, $2)
     RETURNING conversation_id, title, created_at`,
    [userId, title || null]
  );
  return result.rows[0];
}

async function findConversationsByUser(userId) {
  const result = await query(
    `SELECT conversation_id, title, created_at, updated_at
     FROM chat_conversations
     WHERE user_id = $1 AND active = TRUE
     ORDER BY updated_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
}

async function findConversationById(conversationId) {
  const result = await query(
    `SELECT conversation_id, user_id, title, active, created_at, updated_at
     FROM chat_conversations
     WHERE conversation_id = $1`,
    [conversationId]
  );
  return result.rows[0] || null;
}

async function deactivateConversation(conversationId) {
  await query(
    `UPDATE chat_conversations SET active = FALSE WHERE conversation_id = $1`,
    [conversationId]
  );
}

async function insertMessage(conversationId, role, content, metadata) {
  const result = await query(
    `INSERT INTO chat_messages (conversation_id, role, content, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING message_id, role, content, metadata, created_at`,
    [conversationId, role, content, metadata ? JSON.stringify(metadata) : null]
  );
  return result.rows[0];
}

async function findMessagesByConversation(conversationId, limit = 50) {
  const result = await query(
    `SELECT message_id, role, content, metadata, created_at
     FROM chat_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows;
}

async function updateConversationTimestamp(conversationId) {
  await query(
    `UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE conversation_id = $1`,
    [conversationId]
  );
}

async function findSemanticCache(embedding, threshold = 0.85) {
  const vectorLiteral = `[${embedding.join(',')}]`;
  const result = await query(
    `SELECT cache_id, prompt_text, response_text,
            1 - (embedding <=> $1::vector) AS similarity
     FROM chat_semantic_cache
     WHERE 1 - (embedding <=> $1::vector) >= $2
     ORDER BY similarity DESC
     LIMIT 1`,
    [vectorLiteral, threshold]
  );
  return result.rows[0] || null;
}

async function insertSemanticCache(promptText, embedding, responseText) {
  const vectorLiteral = `[${embedding.join(',')}]`;
  const result = await query(
    `INSERT INTO chat_semantic_cache (prompt_hash, prompt_text, embedding, response_text)
     VALUES ($1, $2, $3::vector, $4)
     ON CONFLICT DO NOTHING
     RETURNING cache_id`,
    [simpleHash(promptText), promptText, vectorLiteral, responseText]
  );
  return result.rows[0] || null;
}

async function touchCacheAccess(cacheId) {
  await query(
    `UPDATE chat_semantic_cache SET accessed_at = CURRENT_TIMESTAMP WHERE cache_id = $1`,
    [cacheId]
  );
}

async function findResponseCache(questionHash) {
  const result = await query(
    `SELECT id, question_normalized, response_text, accessed_at
     FROM chat_response_cache
     WHERE question_hash = $1
     ORDER BY accessed_at DESC
     LIMIT 1`,
    [questionHash]
  );
  return result.rows[0] || null;
}

async function upsertResponseCache(questionHash, questionNormalized, responseText) {
  const result = await query(
    `INSERT INTO chat_response_cache (question_hash, question_normalized, response_text)
     VALUES ($1, $2, $3)
     ON CONFLICT (question_hash) DO UPDATE
       SET response_text = EXCLUDED.response_text,
           accessed_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [questionHash, questionNormalized, responseText]
  );
  return result.rows[0] || null;
}

async function touchResponseCache(id) {
  await query(
    `UPDATE chat_response_cache SET accessed_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

module.exports = {
  createConversation,
  findConversationsByUser,
  findConversationById,
  deactivateConversation,
  insertMessage,
  findMessagesByConversation,
  updateConversationTimestamp,
  findSemanticCache,
  insertSemanticCache,
  touchCacheAccess,
  findResponseCache,
  upsertResponseCache,
  touchResponseCache,
};
