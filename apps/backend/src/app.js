/**
 * Express Application Setup
 * @module app
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { generalLimiter } = require('./middlewares/rateLimit.middleware');

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

module.exports = app;
