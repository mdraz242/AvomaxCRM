import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import accommodationRoutes from './routes/accommodationRoutes.js';
import activityNotificationRoutes from './routes/activityNotificationRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import flightRoutes from './routes/flightRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import visaRoutes from './routes/visaRoutes.js';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = env.corsOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'edu-crm-api',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/visa', visaRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', activityNotificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

