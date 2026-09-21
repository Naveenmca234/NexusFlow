/**
 * Simple mock telemetry generator for development
 */

const defaultDevices = ['DEV-TH-101', 'DEV-VB-201', 'DEV-PR-301', 'DEV-MS-401'];

function generateSingleTelemetry(deviceId) {
  const targetId = deviceId || defaultDevices[Math.floor(Math.random() * defaultDevices.length)];
  return {
    deviceId: targetId,
    timestamp: new Date(),
    temperature: parseFloat((20 + Math.random() * 15).toFixed(1)), // 20.0 - 35.0 °C
    pressure: parseFloat((980 + Math.random() * 60).toFixed(1)),    // 980.0 - 1040.0 hPa
    rpm: Math.floor(1200 + Math.random() * 2400),                  // 1200 - 3600 RPM
    vibration: parseFloat((0.1 + Math.random() * 0.5).toFixed(2)),  // 0.10 - 0.60 G
  };
}

function generateTelemetryBatch(count = 10, deviceId) {
  const batch = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const timeOffset = (count - i) * 60 * 1000; // minutes in past
    const record = generateSingleTelemetry(deviceId);
    record.timestamp = new Date(now - timeOffset);
    batch.push(record);
  }
  return batch;
}

module.exports = {
  generateSingleTelemetry,
  generateTelemetryBatch,
};
