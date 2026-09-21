const mongoose = require('mongoose');

/**
 * MongoDB Time-Series Telemetry Model
 * timeField: timestamp
 * metaField: deviceId
 */
const telemetrySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    temperature: {
      type: Number,
      default: 0,
    },
    pressure: {
      type: Number,
      default: 0,
    },
    rpm: {
      type: Number,
      default: 0,
    },
    vibration: {
      type: Number,
      default: 0,
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'deviceId',
      granularity: 'seconds',
    },
  }
);

module.exports = mongoose.model('Telemetry', telemetrySchema);
