const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const {
  postMessage,
  getConversations,
  getMessages,
  removeConversation,
} = require('./chatbot.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/messages', postMessage);
router.get('/conversations', getConversations);
router.get('/conversations/:id/messages', getMessages);
router.delete('/conversations/:id', removeConversation);

module.exports = router;
