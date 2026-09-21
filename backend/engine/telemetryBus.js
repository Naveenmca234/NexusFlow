const { Subject } = require('rxjs');

// Global event bus for incoming telemetry streams
const telemetry$ = new Subject();

/**
 * Emit a new telemetry packet to the reactive rule engine
 * @param {Object} telemetryPacket 
 */
function emitTelemetry(telemetryPacket) {
  if (telemetryPacket) {
    telemetry$.next(telemetryPacket);
  }
}

/**
 * Obtain the observable stream of all IoT telemetry packets
 * @returns {import('rxjs').Observable}
 */
function getTelemetryStream() {
  return telemetry$.asObservable();
}

module.exports = {
  telemetry$,
  emitTelemetry,
  getTelemetryStream,
};
