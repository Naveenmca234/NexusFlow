const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metrics: {
      temperature: { type: Number },
      humidity: { type: Number },
      pressure: { type: Number },
      vibration: { type: Number },
      voltage: { type: Number },
      battery: { type: Number },
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Telemetry', telemetrySchema);
