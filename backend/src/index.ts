import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import authRoutes from './auth/routes.js';
import conversationRoutes from './routes/conversations.js';
import analyticsRoutes from './routes/analytics.js';
import promptRoutes from './routes/prompts.js';
import { metricsMiddleware, registry } from './metrics.js';
import { initSocket } from './ws/index.js';

const app = express();
const server = createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(metricsMiddleware);

// Health + metrics.
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

// API.
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prompts', promptRoutes);

// Generic error handler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const status = (err as any)?.status ?? 500;
  const message = err instanceof Error ? err.message : 'internal_error';
  res.status(status).json({ error: message });
});

initSocket(server);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 AI Chat backend listening on :${config.port} (env=${config.nodeEnv})`);
});
