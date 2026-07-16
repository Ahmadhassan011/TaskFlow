import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error';

// Import routes
import authRoutes from './auth/routes';
import userRoutes from './users/routes';
import projectRoutes from './projects/routes';
import taskRoutes from './tasks/routes';
import commentRoutes from './comments/routes';
import labelRoutes from './labels/routes';
import dashboardRoutes from './dashboard/routes';
import activityRoutes from './activity/routes';
import notificationRoutes from './notifications/routes';
import attachmentRoutes from './attachments/routes';
import tenantRoutes from './tenants/routes';

const app = express();

// Security middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Apply rate limiting to auth routes
app.use('/api/auth', limiter);

// Swagger docs
const swaggerPath = path.join(__dirname, '..', 'swagger.yaml');
const swaggerDocument = yaml.load(fs.readFileSync(swaggerPath, 'utf8')) as Record<string, unknown>;
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'TaskFlow API Docs',
  explorer: true,
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks', commentRoutes); // Nested under tasks
app.use('/api/projects', labelRoutes); // Nested under projects
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api', attachmentRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

export default app;
