const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
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
    webhookUrl: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ['POST', 'GET', 'PUT', 'PATCH'],
      default: 'POST',
    },
    status: {
      type: Number,
      default: 0, // HTTP status or 0 for error/timeout
    },
    statusText: {
      type: String,
      default: '',
    },
    success: {
      type: Boolean,
      default: false,
      index: true,
    },
    responseTimeMs: {
      type: Number,
      default: 0,
    },
    payloadSent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    responseExcerpt: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: null,
    },
    triggerTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
