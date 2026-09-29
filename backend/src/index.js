const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const readingRoutes = require('./routes/readingRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const interventionRoutes = require('./routes/interventionRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: config.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JalRakshak AI Backend',
    timestamp: new Date().toISOString(),
  });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Protected Water Readings Routes
app.use('/api/water-readings', readingRoutes);

// Protected Anomaly Detection Routes
app.use('/api/anomalies', anomalyRoutes);

// Protected AI Analysis Routes
app.use('/api/ai', aiRoutes);

// Protected Intervention Routes
app.use('/api/interventions', interventionRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`JalRakshak AI Backend server running on port ${config.PORT}`);
  });
}

module.exports = app;
