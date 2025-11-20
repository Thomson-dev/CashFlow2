import express from 'express';
import { chatWithBot, getChatHistory } from '../controllers/chatbotController';
import auth from '../middleware/auth';

const router = express.Router();

router.post('/chat', auth, chatWithBot);
router.get('/history', auth, getChatHistory);

export default router;
