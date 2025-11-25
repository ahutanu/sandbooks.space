import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  HOPX_API_KEY: z.string().min(1, 'HOPX_API_KEY is required'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_ACCESS_TOKEN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('1000'),
  MAX_EXECUTION_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('360'), // 6 minutes for pip install
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  // GitHub OAuth App (optional - for GitHub sync feature)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_CALLBACK_URL: z.string().url().optional().default('http://localhost:5173/github/callback'),
});

export type Env = z.infer<typeof EnvSchema>;

let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Use console.error for bootstrap errors (before logger is initialized)
    console.error('Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;
