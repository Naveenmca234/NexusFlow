const { generateSingleTelemetry } = require('../utils/telemetryGenerator');
const { broadcast } = require('./socketServer');

let streamIntervalId = null;
let isStreaming = false;
let streamConfig = {
  intervalMs: 2500,
  deviceId: 'DEV-TH-101',
  sampleCount: 0,
  startedAt: null,
};

// Callback to feed into ingestion
let ingestionHandler = null;

/**
 * Register the telemetry ingestion handler
 * @param {Function} handler 
 */
function setIngestionHandler(handler) {
  ingestionHandler = handler;
}

/**
 * Start the continuous mock sensor stream
 * @param {Object} options
 * @param {number} [options.intervalMs] - Generation interval in milliseconds (default 2500)
 * @param {string} [options.deviceId] - Specific device ID or random
 */
function startMockStream(options = {}) {
  if (isStreaming) {
    return {
      status: 'already_running',
      config: streamConfig,
    };
  }

  const intervalMs = Math.max(Number(options.intervalMs) || 2500, 500);
  const deviceId = options.deviceId || 'DEV-TH-101';

  streamConfig = {
    intervalMs,
    deviceId,
    sampleCount: 0,
    startedAt: new Date(),
  };

  isStreaming = true;
  console.log(`[MockSensorStream] 🚀 Started mock telemetry sensor stream (${intervalMs}ms) for device "${deviceId}"`);

  streamIntervalId = setInterval(async () => {
    try {
      // Generate packet with simulated occasional spikes to exercise conditions
      const packet = generateSingleTelemetry(streamConfig.deviceId === 'all' ? undefined : streamConfig.deviceId);
      
      // Inject occasional spike every 4-5 packets for realistic alert triggering
      if (streamConfig.sampleCount % 4 === 3) {
        packet.temperature = parseFloat((32.0 + Math.random() * 8.0).toFixed(1)); // > 30°C / > 35°C
        packet.vibration = parseFloat((0.48 + Math.random() * 0.25).toFixed(2));  // > 0.45G
      }

      streamConfig.sampleCount++;

      if (typeof ingestionHandler === 'function') {
        await ingestionHandler(packet);
      }

      // Notify clients about stream heartbeats
      broadcast('STREAM_STATUS', {
        isStreaming: true,
        ...streamConfig,
      });
    } catch (err) {
      console.error('[MockSensorStream Error]:', err.message);
    }
  }, intervalMs);

  broadcast('STREAM_STATUS', {
    isStreaming: true,
    ...streamConfig,
  });

  return {
    status: 'started',
    config: streamConfig,
  };
}

/**
 * Stop the continuous mock sensor stream
 */
function stopMockStream() {
  if (!isStreaming) {
    return {
      status: 'already_stopped',
      config: streamConfig,
    };
  }

  if (streamIntervalId) {
    clearInterval(streamIntervalId);
    streamIntervalId = null;
  }

  isStreaming = false;
  console.log(`[MockSensorStream] ⏹ Stopped mock telemetry sensor stream. Total samples: ${streamConfig.sampleCount}`);

  broadcast('STREAM_STATUS', {
    isStreaming: false,
    ...streamConfig,
  });

  return {
    status: 'stopped',
    config: streamConfig,
  };
}

/**
 * Get current mock stream status
 */
function getMockStreamStatus() {
  return {
    isStreaming,
    ...streamConfig,
  };
}

module.exports = {
  startMockStream,
  stopMockStream,
  getMockStreamStatus,
  setIngestionHandler,
};
