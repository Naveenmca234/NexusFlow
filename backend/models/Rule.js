const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    nodes: {
      type: Array,
      default: [],
    },
    edges: {
      type: Array,
      default: [],
    },
    targetDeviceId: {
      type: String,
      default: 'all',
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    cooldownSeconds: {
      type: Number,
      default: 30,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rule', ruleSchema);
