/**
 * NexusFlow Telemetry Ingestion Performance Benchmark Tool
 * 
 * Simulates high-frequency IoT device telemetry ingestion to benchmark:
 * - Requests Per Second (RPS)
 * - Ingested Writes / Second
 * - Success vs Error Rate
 * - Latency Percentiles (Min, Avg, p50, p95, p99, Max)
 * 
 * Usage:
 *   node perf_test_telemetry.js --devices 50 --rps 200 --duration 10 --batch 1
 * 
 * Options:
 *   --target <url>     Ingestion endpoint (default: http://localhost:5000/api/telemetry)
 *   --devices <num>    Number of distinct simulated IoT devices (default: 25)
 *   --rps <num>        Target requests per second (default: 100)
 *   --duration <sec>   Benchmark duration in seconds (default: 10)
 *   --batch <num>      Telemetry records per payload (default: 1)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    target: 'http://localhost:5000/api/telemetry',
    devices: 25,
    rps: 100,
    duration: 10,
    batch: 1,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) config.target = args[++i];
    else if (args[i] === '--devices' && args[i + 1]) config.devices = parseInt(args[++i], 10);
    else if (args[i] === '--rps' && args[i + 1]) config.rps = parseInt(args[++i], 10);
    else if (args[i] === '--duration' && args[i + 1]) config.duration = parseInt(args[++i], 10);
    else if (args[i] === '--batch' && args[i + 1]) config.batch = parseInt(args[++i], 10);
  }
  return config;
}

const config = parseArgs();
const targetUrl = new URL(config.target);
const isHttps = targetUrl.protocol === 'https:';
const client = isHttps ? https : http;

const agent = new (isHttps ? https.Agent : http.Agent)({
  keepAlive: true,
  maxSockets: 100,
});

// Mock telemetry generator
const deviceIds = Array.from({ length: config.devices }, (_, i) => `DEV-PERF-${String(i + 1).padStart(3, '0')}`);

function generateRecord(deviceId) {
  return {
    deviceId: deviceId || deviceIds[Math.floor(Math.random() * deviceIds.length)],
    timestamp: new Date().toISOString(),
    temperature: parseFloat((20 + Math.random() * 65).toFixed(2)),
    pressure: parseFloat((990 + Math.random() * 50).toFixed(1)),
    vibration: parseFloat((0.1 + Math.random() * 4.5).toFixed(3)),
    humidity: parseFloat((30 + Math.random() * 50).toFixed(1)),
    metrics: {
      voltage: parseFloat((3.2 + Math.random() * 0.6).toFixed(2)),
      loadPercent: Math.floor(Math.random() * 100),
    },
  };
}

function generatePayload() {
  if (config.batch > 1) {
    return Array.from({ length: config.batch }, () => generateRecord());
  }
  return generateRecord();
}

async function runBenchmark() {
  console.log('===============================================================');
  console.log('⚡ NexusFlow Telemetry Ingestion Performance Benchmark');
  console.log('===============================================================');
  console.log(`Target Endpoint   : ${config.target}`);
  console.log(`Simulated Devices : ${config.devices}`);
  console.log(`Target RPS        : ${config.rps}`);
  console.log(`Batch Size / Req  : ${config.batch} record(s)`);
  console.log(`Duration          : ${config.duration} seconds`);
  console.log('===============================================================\n');

  const latencies = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalWrites = 0;

  const intervalMs = 1000 / config.rps;
  const startTime = Date.now();
  const endTime = startTime + config.duration * 1000;

  function sendRequest() {
    return new Promise((resolve) => {
      const payload = JSON.stringify(generatePayload());
      const reqStart = process.hrtime.bigint();

      const req = client.request(
        targetUrl,
        {
          method: 'POST',
          agent,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            const reqEnd = process.hrtime.bigint();
            const latencyMs = Number(reqEnd - reqStart) / 1e6;
            latencies.push(latencyMs);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              successfulRequests++;
              totalWrites += config.batch;
            } else {
              failedRequests++;
            }
            resolve();
          });
        }
      );

      req.on('error', () => {
        const reqEnd = process.hrtime.bigint();
        const latencyMs = Number(reqEnd - reqStart) / 1e6;
        latencies.push(latencyMs);
        failedRequests++;
        resolve();
      });

      req.write(payload);
      req.end();
    });
  }

  console.log('🚀 Benchmark started... Ingesting packets...');

  const activePromises = [];
  let requestCount = 0;

  return new Promise((done) => {
    const timer = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(timer);
        Promise.all(activePromises).then(() => {
          const totalElapsedSec = (Date.now() - startTime) / 1000;
          printResults(totalElapsedSec, successfulRequests, failedRequests, totalWrites, latencies);
          done();
        });
        return;
      }

      requestCount++;
      activePromises.push(sendRequest());
    }, intervalMs);
  });
}

function calculatePercentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function printResults(elapsedSec, success, failed, writes, latencies) {
  latencies.sort((a, b) => a - b);
  const total = success + failed;
  const actualRps = (total / elapsedSec).toFixed(2);
  const writesPerSec = (writes / elapsedSec).toFixed(2);
  const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
  const minLatency = latencies.length ? latencies[0].toFixed(2) : 0;
  const p50 = calculatePercentile(latencies, 50).toFixed(2);
  const p95 = calculatePercentile(latencies, 95).toFixed(2);
  const p99 = calculatePercentile(latencies, 99).toFixed(2);
  const maxLatency = latencies.length ? latencies[latencies.length - 1].toFixed(2) : 0;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;

  console.log('\n===============================================================');
  console.log('📊 BENCHMARK RESULTS');
  console.log('===============================================================');
  console.log(`Execution Time      : ${elapsedSec.toFixed(2)}s`);
  console.log(`Total Requests      : ${total}`);
  console.log(`Successful Requests : ${success} (${successRate}%)`);
  console.log(`Failed Requests     : ${failed}`);
  console.log(`Total Telemetry Recs: ${writes}`);
  console.log('---------------------------------------------------------------');
  console.log(`Actual Throughput   : ${actualRps} req/s`);
  console.log(`Ingestion Rate      : ${writesPerSec} writes/s`);
  console.log('---------------------------------------------------------------');
  console.log('Latency Statistics:');
  console.log(`  Min Latency       : ${minLatency} ms`);
  console.log(`  Avg Latency       : ${avgLatency} ms`);
  console.log(`  p50 (Median)      : ${p50} ms`);
  console.log(`  p95               : ${p95} ms`);
  console.log(`  p99               : ${p99} ms`);
  console.log(`  Max Latency       : ${maxLatency} ms`);
  console.log('===============================================================\n');
}

if (require.main === module) {
  runBenchmark().catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
  });
}

module.exports = {
  runBenchmark,
  generateRecord,
  generatePayload,
};
