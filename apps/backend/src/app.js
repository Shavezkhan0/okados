import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());

app.use(compression());

app.use(generalLimiter);

app.use('/uploads', express.static('uploads'));

app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Okados API',
    version: process.env.API_VERSION || 'v1',
    docs: '/api/v1/health',
  });
});

app.use(notFound);

app.use(errorHandler);

export default app;
