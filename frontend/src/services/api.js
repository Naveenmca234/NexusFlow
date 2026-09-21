import { mockDevices, mockTelemetryChartData, mockAlerts, mockRules } from '../mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[NexusFlow API] Error calling ${endpoint}, falling back to mock:`, err.message);
    return null;
  }
}

export const api = {
  // Dashboard
  async getDashboardStats() {
    const data = await fetchJson('/dashboard/stats');
    if (data && data.summary) return data;
    return {
      summary: {
        totalDevices: mockDevices.length,
        onlineDevices: mockDevices.filter(d => d.status === 'online').length,
        offlineDevices: mockDevices.filter(d => d.status !== 'online').length,
        totalTelemetryRecords: 14280,
        activeRules: mockRules.filter(r => r.enabled).length,
        activeAlerts: mockAlerts.filter(a => a.status === 'active').length,
      },
      recentAlerts: mockAlerts,
      databaseConnected: false,
    };
  },

  // Devices
  async getDevices() {
    const data = await fetchJson('/devices');
    return data || mockDevices;
  },

  async getDeviceById(id) {
    const data = await fetchJson(`/devices/${id}`);
    return data || mockDevices.find(d => d._id === id || d.deviceId === id);
  },

  async createDevice(device) {
    const res = await fetchJson('/devices', {
      method: 'POST',
      body: JSON.stringify(device),
    });
    return res || { ...device, _id: `dev-${Date.now()}` };
  },

  async deleteDevice(id) {
    const res = await fetchJson(`/devices/${id}`, {
      method: 'DELETE',
    });
    return res || { success: true };
  },

  // Telemetry
  async getTelemetryChartSeries() {
    const data = await fetchJson('/telemetry/series');
    return data || mockTelemetryChartData;
  },

  async getTelemetryList(options = {}) {
    const params = typeof options === 'number' ? { limit: options } : options;
    const cleanParams = {};
    if (params.limit) cleanParams.limit = params.limit;
    if (params.deviceId && params.deviceId !== 'all') cleanParams.deviceId = params.deviceId;
    if (params.startTime) cleanParams.startTime = params.startTime;
    if (params.endTime) cleanParams.endTime = params.endTime;

    const query = new URLSearchParams(cleanParams).toString();
    const data = await fetchJson(`/telemetry${query ? `?${query}` : ''}`);
    return data || mockTelemetryChartData.map((d, i) => ({
      _id: `tel-${i}`,
      deviceId: params.deviceId || 'DEV-TH-101',
      timestamp: new Date().toISOString(),
      temperature: d.temperature ?? 24,
      pressure: d.pressure ?? 1013,
      rpm: 1850,
      vibration: d.vibration ?? 0.2,
      metrics: d,
    }));
  },

  async getLatestTelemetry() {
    const data = await fetchJson('/telemetry/latest');
    return data;
  },

  async postTelemetry(record) {
    const res = await fetchJson('/telemetry', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    return res || { ...record, _id: `tel-${Date.now()}` };
  },

  async generateMockTelemetry(deviceId = 'DEV-TH-101', count = 1) {
    const res = await fetchJson('/telemetry/generate', {
      method: 'POST',
      body: JSON.stringify({ deviceId, count }),
    });
    return res;
  },

  // Rules
  async getRules() {
    const data = await fetchJson('/rules');
    return data || mockRules;
  },

  async getRuleById(id) {
    const data = await fetchJson(`/rules/${id}`);
    return data || mockRules.find(r => r._id === id);
  },

  async createRule(ruleData) {
    const res = await fetchJson('/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    });
    return res || { ...ruleData, _id: `rule-${Date.now()}` };
  },

  async updateRule(id, ruleData) {
    const res = await fetchJson(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ruleData),
    });
    return res || ruleData;
  },

  async deleteRule(id) {
    const res = await fetchJson(`/rules/${id}`, {
      method: 'DELETE',
    });
    return res || { success: true };
  },

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const data = await fetchJson(`/alerts${query ? `?${query}` : ''}`);
    return data || mockAlerts;
  },

  async updateAlertStatus(id, status) {
    const res = await fetchJson(`/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res || { _id: id, status };
  },
};
