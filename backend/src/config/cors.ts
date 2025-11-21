import cors from 'cors';
import env from './env';

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser tools
    if ([env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'].includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-sandbooks-token',
    'X-Requested-With'
  ],
  maxAge: 86400,
  optionsSuccessStatus: 204,
  credentials: false
};
