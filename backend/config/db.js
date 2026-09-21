const mongoose = require('mongoose');

let isConnected = false;

/**
 * Configure / verify MongoDB Time-Series collection for telemetry
 * timeField: timestamp, metaField: deviceId
 */
const initTimeSeriesCollection = async (connection) => {
  try {
    const db = connection.db;
    const collections = await db.listCollections({ name: 'telemetries' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('telemetries', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'deviceId',
          granularity: 'seconds',
        },
      });
      console.log('[MongoDB Time-Series] Collection "telemetries" created (timeField: timestamp, metaField: deviceId)');
    } else {
      console.log('[MongoDB Time-Series] Telemetry collection verified.');
    }
  } catch (err) {
    console.warn('[MongoDB Time-Series Warning] Configuration note:', err.message);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexusflow';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
    await initTimeSeriesCollection(conn.connection);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${uri}: ${error.message}`);
    console.warn(`[NexusFlow] Backend will operate with in-memory / sample dataset mode.`);
    return false;
  }
};

const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };
