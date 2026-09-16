const sampleDevices = [
  {
    _id: 'dev-001',
    deviceId: 'DEV-TH-101',
    name: 'Cold Storage Room A',
    type: 'Temperature',
    status: 'online',
    location: 'Warehouse Alpha - Zone 1',
    batteryLevel: 92,
    firmwareVersion: 'v2.1.0',
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    metadata: { floor: 'Basement', rack: 'R-14' },
  },
  {
    _id: 'dev-002',
    deviceId: 'DEV-TH-102',
    name: 'Server Room HVAC Unit',
    type: 'Temperature',
    status: 'warning',
    location: 'HQ Data Center - Floor 3',
    batteryLevel: 68,
    firmwareVersion: 'v2.0.4',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    metadata: { rack: 'Aisle-4' },
  },
  {
    _id: 'dev-003',
    deviceId: 'DEV-VB-201',
    name: 'Main Turbine Motor 1',
    type: 'Vibration',
    status: 'online',
    location: 'Power Plant - Bay 2',
    batteryLevel: 98,
    firmwareVersion: 'v3.0.1',
    lastSeen: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    metadata: { rpm: 3600 },
  },
  {
    _id: 'dev-004',
    deviceId: 'DEV-PR-301',
    name: 'Hydraulic Line Pressure B',
    type: 'Pressure',
    status: 'online',
    location: 'Assembly Plant - Unit 5',
    batteryLevel: 85,
    firmwareVersion: 'v1.4.2',
    lastSeen: new Date(Date.now() - 30 * 1000).toISOString(),
    metadata: { maxBar: 250 },
  },
  {
    _id: 'dev-005',
    deviceId: 'DEV-MS-401',
    name: 'Greenhouse Ambient Pod',
    type: 'Multi-Sensor',
    status: 'offline',
    location: 'Agri-Tech Zone - Quad 9',
    batteryLevel: 14,
    firmwareVersion: 'v1.1.8',
    lastSeen: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    metadata: { solarPowered: true },
  },
];

const generateSampleTelemetry = () => {
  const points = [];
  const now = Date.now();
  const times = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', 'Now'
  ];

  times.forEach((label, idx) => {
    const pointTime = new Date(now - (times.length - 1 - idx) * 2 * 3600 * 1000).toISOString();
    points.push({
      _id: `tel-${idx + 1}`,
      deviceId: 'DEV-TH-101',
      timeLabel: label,
      timestamp: pointTime,
      metrics: {
        temperature: parseFloat((21.5 + Math.sin(idx * 0.5) * 4.2 + (Math.random() * 0.8)).toFixed(1)),
        humidity: parseFloat((52 + Math.cos(idx * 0.4) * 10 + (Math.random() * 2)).toFixed(1)),
        pressure: parseFloat((1012 + Math.sin(idx * 0.3) * 6).toFixed(1)),
        vibration: parseFloat((0.15 + (Math.random() * 0.2)).toFixed(2)),
        battery: Math.max(70, 95 - idx),
        voltage: 3.3,
      },
    });
  });
  return points;
};

const sampleTelemetry = generateSampleTelemetry();

const sampleRules = [
  {
    _id: 'rule-001',
    name: 'Overheat Detection & Shutdown',
    description: 'Triggers critical alert when server room temperature exceeds 32°C for 2 consecutive cycles.',
    enabled: true,
    targetDeviceId: 'DEV-TH-102',
    executionCount: 142,
    lastTriggered: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    nodes: [
      {
        id: '1',
        type: 'sensor',
        position: { x: 50, y: 120 },
        data: { label: 'Temp Sensor (DEV-TH-102)', sensorType: 'Temperature', metric: 'temperature', interval: '5s' }
      },
      {
        id: '2',
        type: 'filter',
        position: { x: 300, y: 120 },
        data: { label: 'Threshold Filter', field: 'temperature', operator: '>', threshold: 32 }
      },
      {
        id: '3',
        type: 'condition',
        position: { x: 550, y: 120 },
        data: { label: 'Sustained > 2 cycles', conditionType: 'AND', duration: '60s' }
      },
      {
        id: '4',
        type: 'alert',
        position: { x: 800, y: 120 },
        data: { label: 'Critical Ops Alert', severity: 'critical', channel: 'Slack + PagerDuty' }
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true },
    ]
  },
  {
    _id: 'rule-002',
    name: 'Turbine Vibration Anomaly',
    description: 'Monitors turbine vibration amplitude and notifies maintenance if vibration > 0.45 G.',
    enabled: true,
    targetDeviceId: 'DEV-VB-201',
    executionCount: 88,
    lastTriggered: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    nodes: [
      {
        id: '10',
        type: 'sensor',
        position: { x: 60, y: 100 },
        data: { label: 'Turbine Vib Sensor', sensorType: 'Vibration', metric: 'vibration', interval: '1s' }
      },
      {
        id: '11',
        type: 'filter',
        position: { x: 320, y: 100 },
        data: { label: 'Peak Detector', field: 'vibration', operator: '>', threshold: 0.45 }
      },
      {
        id: '12',
        type: 'alert',
        position: { x: 620, y: 100 },
        data: { label: 'Mechanical Warning', severity: 'warning', channel: 'Email' }
      }
    ],
    edges: [
      { id: 'e10-11', source: '10', target: '11', animated: true },
      { id: 'e11-12', source: '11', target: '12', animated: true }
    ]
  },
  {
    _id: 'rule-003',
    name: 'Low Battery Auto-Report',
    description: 'Flags any remote sensor dropping below 20% remaining battery.',
    enabled: false,
    targetDeviceId: 'all',
    executionCount: 29,
    lastTriggered: null,
    nodes: [
      {
        id: '20',
        type: 'sensor',
        position: { x: 60, y: 120 },
        data: { label: 'All Battery Telemetry', sensorType: 'Multi-Sensor', metric: 'battery', interval: '1h' }
      },
      {
        id: '21',
        type: 'filter',
        position: { x: 320, y: 120 },
        data: { label: 'Battery < 20%', field: 'battery', operator: '<', threshold: 20 }
      },
      {
        id: '22',
        type: 'alert',
        position: { x: 600, y: 120 },
        data: { label: 'Routine Field Notification', severity: 'info', channel: 'Dashboard Feed' }
      }
    ],
    edges: [
      { id: 'e20-21', source: '20', target: '21' },
      { id: 'e21-22', source: '21', target: '22' }
    ]
  }
];

const sampleAlerts = [
  {
    _id: 'alt-001',
    ruleId: 'rule-001',
    deviceId: 'DEV-TH-102',
    title: 'HVAC Temperature Spike Exceeded Limit',
    message: 'Ambient rack temperature reached 33.8°C, exceeding 32.0°C critical threshold.',
    severity: 'critical',
    status: 'active',
    valueDetected: 33.8,
    threshold: 32.0,
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    _id: 'alt-002',
    ruleId: 'rule-002',
    deviceId: 'DEV-VB-201',
    title: 'Turbine Motor 1 Vibration Surge',
    message: 'Harmonic vibration detected at 0.48 G (Warning limit: 0.45 G). Inspect bearing.',
    severity: 'warning',
    status: 'active',
    valueDetected: 0.48,
    threshold: 0.45,
    timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    _id: 'alt-003',
    ruleId: 'rule-003',
    deviceId: 'DEV-MS-401',
    title: 'Greenhouse Pod Battery Depleted',
    message: 'Device reported 14% battery capacity and went offline. Scheduled for solar pack swap.',
    severity: 'warning',
    status: 'acknowledged',
    valueDetected: 14,
    threshold: 20,
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
  {
    _id: 'alt-004',
    ruleId: null,
    deviceId: 'DEV-PR-301',
    title: 'Pressure Regulator Calibration Complete',
    message: 'Hydraulic Line 5 returned to nominal baseline 180 bar.',
    severity: 'info',
    status: 'resolved',
    valueDetected: 180,
    threshold: null,
    timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
  }
];

module.exports = {
  sampleDevices,
  sampleTelemetry,
  sampleRules,
  sampleAlerts,
};
