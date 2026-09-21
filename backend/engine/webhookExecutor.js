const WebhookLog = require('../models/WebhookLog');
const { getIsConnected } = require('../config/db');
const socketServer = require('./socketServer');

// In-memory logs store for offline/no-mongo environments
const inMemoryWebhookLogs = [];

function addInMemoryWebhookLog(logEntry) {
  inMemoryWebhookLogs.unshift(logEntry);
  if (inMemoryWebhookLogs.length > 200) {
    inMemoryWebhookLogs.pop();
  }
}

function getInMemoryWebhookLogs() {
  return inMemoryWebhookLogs;
}

/**
 * Validate URL security (protocol enforcement and SSRF protection)
 */
function validateWebhookUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Webhook URL is required' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }

  const host = parsed.hostname.toLowerCase();

  // Block cloud metadata IP and endpoints
  const blockedHosts = ['169.254.169.254', 'metadata.google.internal', 'metadata.aws'];
  if (blockedHosts.includes(host)) {
    return { valid: false, error: `Access to cloud metadata service (${host}) is blocked for security.` };
  }

  return { valid: true, url: parsed.toString() };
}

/**
 * Interpolate payload variables from telemetry packet
 */
function interpolatePayload(template, packet, ruleContext) {
  if (!template) {
    return {
      event: 'nexusflow_rule_triggered',
      ruleId: ruleContext?._id || null,
      ruleName: ruleContext?.name || 'Visual Rule',
      deviceId: packet?.deviceId || 'DEV-N/A',
      timestamp: new Date().toISOString(),
      telemetry: packet,
    };
  }

  if (typeof template === 'object') {
    template = JSON.stringify(template);
  }

  if (typeof template === 'string') {
    let replaced = template
      .replace(/\{\{deviceId\}\}/g, packet?.deviceId || '')
      .replace(/\{\{temperature\}\}/g, packet?.temperature ?? '')
      .replace(/\{\{pressure\}\}/g, packet?.pressure ?? '')
      .replace(/\{\{rpm\}\}/g, packet?.rpm ?? '')
      .replace(/\{\{vibration\}\}/g, packet?.vibration ?? '')
      .replace(/\{\{ruleName\}\}/g, ruleContext?.name || 'Visual Rule')
      .replace(/\{\{ruleId\}\}/g, ruleContext?._id || '')
      .replace(/\{\{timestamp\}\}/g, new Date().toISOString());

    try {
      return JSON.parse(replaced);
    } catch (e) {
      // If not strict JSON, return as string or wrapper object
      return { raw: replaced };
    }
  }

  return template;
}

/**
 * Safely execute an HTTP webhook with timeout and SSRF guard
 * @param {Object} config - { url, method, payload, timeoutMs }
 * @param {Object} packet - Telemetry data
 * @param {Object} ruleContext - Rule metadata
 */
async function executeWebhook(config = {}, packet = {}, ruleContext = {}) {
  const rawUrl = config.url || config.webhookUrl;
  const method = (config.method || 'POST').toUpperCase();
  const timeoutMs = Math.min(Math.max(Number(config.timeoutMs) || 5000, 1000), 15000);
  const startTime = Date.now();

  const urlCheck = validateWebhookUrl(rawUrl);
  if (!urlCheck.valid) {
    const logEntry = {
      _id: `whk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ruleId: ruleContext?._id || null,
      ruleName: ruleContext?.name || 'Visual Rule',
      deviceId: packet?.deviceId || 'DEV-N/A',
      webhookUrl: rawUrl || 'N/A',
      method,
      status: 400,
      statusText: 'Security Validation Error',
      success: false,
      responseTimeMs: 0,
      payloadSent: null,
      responseExcerpt: '',
      error: urlCheck.error,
      triggerTime: new Date(),
    };

    if (getIsConnected()) {
      try {
        await new WebhookLog(logEntry).save();
      } catch (e) {
        addInMemoryWebhookLog(logEntry);
      }
    } else {
      addInMemoryWebhookLog(logEntry);
    }

    socketServer.broadcast('WEBHOOK_EXECUTED', logEntry);
    return logEntry;
  }

  const targetUrl = urlCheck.url;
  const payloadData = interpolatePayload(config.payload, packet, ruleContext);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let status = 0;
  let statusText = '';
  let success = false;
  let responseExcerpt = '';
  let errorMessage = null;

  try {
    const fetchOptions = {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'NexusFlow-IoT-RuleEngine/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(payloadData);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    status = response.status;
    statusText = response.statusText || (status >= 200 && status < 300 ? 'OK' : 'HTTP Error');
    success = response.ok;

    try {
      const text = await response.text();
      responseExcerpt = text.slice(0, 300);
    } catch (readErr) {
      responseExcerpt = '';
    }
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      status = 408;
      statusText = 'Request Timeout';
      errorMessage = `Webhook request timed out after ${timeoutMs}ms`;
    } else {
      status = 0;
      statusText = 'Network / Host Unreachable';
      errorMessage = fetchErr.message;
    }
    success = false;
  }

  const responseTimeMs = Date.now() - startTime;

  const logPayload = {
    ruleId: ruleContext?._id || null,
    ruleName: ruleContext?.name || 'Visual Rule',
    deviceId: packet?.deviceId || 'DEV-N/A',
    webhookUrl: targetUrl,
    method,
    status,
    statusText,
    success,
    responseTimeMs,
    payloadSent: payloadData,
    responseExcerpt,
    error: errorMessage,
    triggerTime: new Date(),
  };

  let savedLog = logPayload;
  if (getIsConnected()) {
    try {
      const doc = new WebhookLog(logPayload);
      savedLog = await doc.save();
    } catch (dbErr) {
      savedLog = { ...logPayload, _id: `whk-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
      addInMemoryWebhookLog(savedLog);
    }
  } else {
    savedLog = { ...logPayload, _id: `whk-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
    addInMemoryWebhookLog(savedLog);
  }

  console.log(`[WebhookExecutor] 🚀 [${method}] ${targetUrl} -> ${status} ${statusText} (${responseTimeMs}ms) [success: ${success}]`);
  socketServer.broadcast('WEBHOOK_EXECUTED', savedLog);

  return savedLog;
}

module.exports = {
  executeWebhook,
  validateWebhookUrl,
  interpolatePayload,
  getInMemoryWebhookLogs,
  addInMemoryWebhookLog,
};
