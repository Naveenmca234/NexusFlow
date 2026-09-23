const mongoose = require('mongoose');

const ruleExecutionSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    ruleName: {
      type: String,
      required: true,
      trim: true,
    },
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
    inputValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    executionStatus: {
      type: String,
      enum: ['success', 'failed', 'triggered', 'evaluated', 'error'],
      default: 'success',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RuleExecution', ruleExecutionSchema);
