const {
  processPrompt,
  listConversations,
  getConversationMessages,
  deleteConversation,
} = require('./chatbot.service');

async function postMessage(req, res, next) {
  try {
    const { conversation_id, prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ ok: false, message: 'El prompt es requerido' });
    }

    const result = await processPrompt({
      userId: req.auth.sub,
      conversationId: conversation_id || null,
      prompt: prompt.trim(),
    });

    return res.json({ ok: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function getConversations(req, res, next) {
  try {
    const conversations = await listConversations(req.auth.sub);
    return res.json({ ok: true, data: conversations });
  } catch (error) {
    return next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const messages = await getConversationMessages(req.params.id, req.auth.sub);
    return res.json({ ok: true, data: messages });
  } catch (error) {
    return next(error);
  }
}

async function removeConversation(req, res, next) {
  try {
    await deleteConversation(req.params.id, req.auth.sub);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  postMessage,
  getConversations,
  getMessages,
  removeConversation,
};
