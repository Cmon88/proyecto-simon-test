import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const wsActiveConnections = new client.Gauge({
  name: 'ws_active_connections',
  help: 'Currently open WebSocket connections',
  registers: [registry],
});

export const aiApiRequestDuration = new client.Histogram({
  name: 'ai_api_request_duration_seconds',
  help: 'Latency of the external AI API',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30],
  registers: [registry],
});

// Normalize req.path to a bounded label set (route pattern if available).
function routeLabel(req: Request): string {
  // @ts-expect-error express types
  const route = (req.route && req.route.path) || req.baseUrl + (req.path === '/' ? '' : req.path);
  // Collapse cuid-ish ids to :id to avoid cardinality explosion
  return route.replace(/\/[a-z0-9]{20,}/gi, '/:id');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durSec = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = {
      method: req.method,
      path: routeLabel(req),
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durSec);
  });
  next();
}
