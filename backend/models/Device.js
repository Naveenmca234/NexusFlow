const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Temperature', 'Humidity', 'Pressure', 'Vibration', 'Multi-Sensor', 'Gateway'],
      default: 'Multi-Sensor',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'warning'],
      default: 'online',
    },
    location: {
      type: String,
      default: 'Facility A - Zone 1',
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    firmwareVersion: {
      type: String,
      default: 'v1.0.4',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', deviceSchema);
