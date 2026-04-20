import 'dotenv/config';

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  port: parseInt(env('PORT', '4000'), 10),
  databaseUrl: env('DATABASE_URL'),
  jwt: {
    secret: env('JWT_SECRET', 'dev-secret-change-me-please-at-least-32-chars'),
    expiresIn: env('JWT_EXPIRES_IN', '12h'),
  },
  ai: {
    provider: env('AI_PROVIDER', 'groq'),
    baseUrl: env('AI_BASE_URL', 'https://api.groq.com/openai/v1'),
    apiKey: process.env.AI_API_KEY ?? '',
    model: env('AI_MODEL', 'llama-3.1-8b-instant'),
  },
  frontendOrigin: env('FRONTEND_ORIGIN', 'http://localhost:5173'),
};
