import { Router, Request, Response } from 'express';
import { broadcastNewMessage, broadcastMessageStatus, broadcastConversationUpdate } from '../services/websocket.js';
import { log } from '../utils/logger.js';

const router = Router();

const authenticateInternal = (req: Request, res: Response, next: () => void) => {
  const token = req.header('x-internal-token');
  if (!process.env.INTERNAL_API_TOKEN || token !== process.env.INTERNAL_API_TOKEN) {
    log.warn('Invalid internal token received');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

router.post('/events/message', authenticateInternal, (req, res) => {
  const { conversationId, message } = req.body || {};
  if (!conversationId || !message) {
    return res.status(400).json({ success: false, error: 'conversationId and message are required' });
  }
  broadcastNewMessage(conversationId, message);
  res.json({ success: true });
});

router.post('/events/status', authenticateInternal, (req, res) => {
  const { conversationId, messageId, status } = req.body || {};
  if (!conversationId || !messageId || !status) {
    return res.status(400).json({ success: false, error: 'conversationId, messageId, status required' });
  }
  broadcastMessageStatus(conversationId, messageId, status);
  res.json({ success: true });
});

router.post('/events/conversation', authenticateInternal, (req, res) => {
  const { conversationId, conversation } = req.body || {};
  if (!conversationId || !conversation) {
    return res.status(400).json({ success: false, error: 'conversationId and conversation are required' });
  }
  broadcastConversationUpdate(conversationId, conversation);
  res.json({ success: true });
});

export default router;
