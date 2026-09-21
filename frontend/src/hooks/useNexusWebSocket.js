import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for robust NexusFlow WebSocket connection
 * Manages auto-reconnect, message parsing, and live telemetry & alert feeds
 */
export function useNexusWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [lastAlert, setLastAlert] = useState(null);
  const [lastAlertUpdate, setLastAlertUpdate] = useState(null);
  const [lastRuleEvent, setLastRuleEvent] = useState(null);
  const [lastDeviceStatus, setLastDeviceStatus] = useState(null);
  const [streamStatus, setStreamStatus] = useState({ isStreaming: false });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const host = window.location.hostname || 'localhost';
    const wsUrl = `ws://${host}:5000/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        console.log('[NexusWebSocket] ⚡ Connected to live server:', wsUrl);
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data);
          const { type, payload } = parsed;

          switch (type) {
            case 'TELEMETRY_UPDATE':
              setLastTelemetry(payload);
              break;

            case 'DEVICE_STATUS_UPDATE':
              setLastDeviceStatus(payload);
              break;

            case 'ALERT_TRIGGERED':
              setLastAlert(payload);
              break;

            case 'ALERT_STATUS_UPDATE':
              setLastAlertUpdate(payload);
              break;

            case 'RULE_STATUS':
              setLastRuleEvent(payload);
              break;

            case 'STREAM_STATUS':
              setStreamStatus(payload);
              break;

            case 'CONNECTION_ESTABLISHED':
              console.log('[NexusWebSocket] Handshake OK:', payload);
              break;

            default:
              break;
          }
        } catch (err) {
          console.warn('[NexusWebSocket] JSON parse error:', err.message);
        }
      };

      socket.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        wsRef.current = null;
        console.log('[NexusWebSocket] Connection closed. Retrying in 3000ms...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.warn('[NexusWebSocket] Connection error:', err);
        socket.close();
      };
    } catch (err) {
      console.warn('[NexusWebSocket] Error initializing connection:', err.message);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }, []);

  return {
    isConnected,
    lastTelemetry,
    lastAlert,
    lastAlertUpdate,
    lastRuleEvent,
    lastDeviceStatus,
    streamStatus,
    sendMessage,
  };
}
