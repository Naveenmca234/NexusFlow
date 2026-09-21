const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB, getIsConnected } = require('./config/db');
const { initEngine, getEngineStatus } = require('./engine/ruleEngine');
const { initWebSocketServer, getConnectedClientsCount } = require('./engine/socketServer');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
const deviceRoutes = require('./routes/deviceRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const alertRoutes = require('./routes/alertRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/devices', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'NexusFlow IoT Engine',
    timestamp: new Date().toISOString(),
    databaseConnected: getIsConnected(),
    ruleEngine: getEngineStatus(),
    webSocket: {
      path: '/ws',
      activeClients: getConnectedClientsCount(),
      status: 'listening',
    },
  });
});

// Engine status endpoint
app.get('/api/engine/status', (req, res) => {
  res.json(getEngineStatus());
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.send({
    message: 'Welcome to NexusFlow – Visual IoT Telemetry & Rule Engine API',
    endpoints: [
      '/api/health',
      '/api/dashboard/stats',
      '/api/devices',
      '/api/telemetry',
      '/api/telemetry/series',
      '/api/rules',
      '/api/alerts',
    ],
  });
});

// Seed helper if DB is connected
const seedDatabaseIfEmpty = async () => {
  try {
    const Device = require('./models/Device');
    const Telemetry = require('./models/Telemetry');
    const Rule = require('./models/Rule');
    const Alert = require('./models/Alert');
    const { sampleDevices, sampleTelemetry, sampleRules, sampleAlerts } = require('./data/sampleData');

    const devCount = await Device.countDocuments();
    if (devCount === 0) {
      console.log('[Seed] Seeding initial IoT devices...');
      await Device.insertMany(sampleDevices);
    }
    const ruleCount = await Rule.countDocuments();
    if (ruleCount === 0) {
      console.log('[Seed] Seeding initial visual rules...');
      await Rule.insertMany(sampleRules);
    }
    const alertCount = await Alert.countDocuments();
    if (alertCount === 0) {
      console.log('[Seed] Seeding initial alerts...');
      await Alert.insertMany(sampleAlerts);
    }
    const telCount = await Telemetry.countDocuments();
    if (telCount === 0) {
      console.log('[Seed] Seeding telemetry time series...');
      await Telemetry.insertMany(sampleTelemetry);
    }
  } catch (err) {
    console.warn('[Seed Warning] Could not seed database:', err.message);
  }
};

// Start Server
const startServer = async () => {
  const dbConnected = await connectDB();
  if (dbConnected) {
    await seedDatabaseIfEmpty();
  }

  // Compile and initialize active RxJS rule pipelines
  await initEngine();

  // Initialize Real-time WebSocket Server
  initWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 NexusFlow Backend running at http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`⚡ WebSocket Stream: ws://localhost:${PORT}/ws`);
    console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
    console.log(`💾 Database Status: ${getIsConnected() ? 'MongoDB Connected' : 'In-Memory / Sample Mode'}`);
    console.log(`====================================================`);
  });
};

startServer();
