import express from 'express';

import { getCurrentUser, loginUser, logoutUser, registerUser } from '../controllers/authController.js';
import { generateSpeech, getAvailableVoices, getGenerationHistory } from '../controllers/speechController.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Echo server is healthy', timestamp: new Date().toISOString() });
});

router.get('/api/config', (_req, res) => {
  res.json({ maxCharacters: Number(process.env.MAX_CHARACTERS) || 5000, formats: ['MP3'] });
});

router.get('/api/voices', getAvailableVoices);
router.get('/api/auth/me', getCurrentUser);
router.post('/api/auth/register', registerUser);
router.post('/api/auth/login', loginUser);
router.post('/api/auth/logout', logoutUser);
router.get('/api/history', getGenerationHistory);
router.post('/api/speech', generateSpeech);

export default router;
