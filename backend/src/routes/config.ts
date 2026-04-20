import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { config } from '../config.js';

const router = Router();
router.use(requireAuth);

router.get('/ai', (req, res) => {
  const apiKey = config.ai.apiKey;
  const masked = apiKey 
    ? apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.slice(-4)}` : '****'
    : 'No configurada (Modo Mock)';

  res.json({
    provider: 'Groq (OpenAI-compatible)',
    model: config.ai.model,
    baseUrl: config.ai.baseUrl,
    apiKeyMasked: masked,
  });
});

export default router;