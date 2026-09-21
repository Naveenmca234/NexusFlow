const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
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
    // Optional compatibility field
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Telemetry', telemetrySchema);
