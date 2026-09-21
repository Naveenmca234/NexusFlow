const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ruleName: {
      type: String,
      default: 'Visual Rule',
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
      enum: ['new', 'acknowledged', 'resolved', 'active'],
      default: 'new',
      index: true,
    },
    valueDetected: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    triggerValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    threshold: {
      type: Number,
      default: null,
    },
    cooldownSeconds: {
      type: Number,
      default: 30,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
