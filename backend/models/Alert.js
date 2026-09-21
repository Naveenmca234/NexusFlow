const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true,
    },
    valueDetected: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    threshold: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
