import cors from 'cors';
import env from './env';

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',        // Dev server alternative ports
      'http://localhost:4173',
      'https://sandbooks.space',      // Production frontend
      'http://127.0.0.1:5173',        // Local dev alternative
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-sandbooks-token',
    'X-Requested-With',
    'x-device-id',
    'x-github-token',
  ],
  maxAge: 86400,
  optionsSuccessStatus: 204,
  credentials: false
};
