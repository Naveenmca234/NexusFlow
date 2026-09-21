const { getTelemetryStream, emitTelemetry } = require('./telemetryBus');
const { compileRuleGraph } = require('./ruleCompiler');
const Rule = require('../models/Rule');
const { getIsConnected } = require('../config/db');
const { sampleRules } = require('../data/sampleData');

// Map of active rule subscriptions: ruleId -> { rule, compiledPipeline }
const activeRulePipelines = new Map();

/**
 * Activate and compile a rule graph into an active RxJS pipeline
 * @param {Object} rule 
 */
function activateRule(rule) {
  if (!rule || !rule.enabled) return null;

  const ruleId = (rule._id || rule.id || rule.name).toString();

  // Deactivate existing instance if previously compiled
  deactivateRule(ruleId);

  const telemetrySource$ = getTelemetryStream();
  const compiled = compileRuleGraph(rule, telemetrySource$);

  if (compiled) {
    activeRulePipelines.set(ruleId, {
      rule,
      pipeline: compiled,
      activatedAt: new Date(),
    });
    console.log(`[RuleEngine] ⚡ Rule activated: "${rule.name}" (${compiled.orderedNodes.map(n => n.type).join(' -> ')})`);
    return compiled;
  }
  return null;
}

/**
 * Deactivate an active rule by unsubscribing its RxJS pipeline
 * @param {string} ruleId 
 */
function deactivateRule(ruleId) {
  const idStr = ruleId ? ruleId.toString() : null;
  if (idStr && activeRulePipelines.has(idStr)) {
    const entry = activeRulePipelines.get(idStr);
    try {
      entry.pipeline.unsubscribe();
      console.log(`[RuleEngine] ⏹ Rule deactivated: "${entry.rule.name}"`);
    } catch (e) {
      console.warn(`[RuleEngine] Warning deactivating rule ${idStr}:`, e.message);
    }
    activeRulePipelines.delete(idStr);
    return true;
  }
  return false;
}

/**
 * Initialize the Rule Engine:
 * Compiles all enabled saved rule graphs from MongoDB or sample fixtures
 */
async function initEngine() {
  console.log('[RuleEngine] Initializing RxJS Rule Engine...');
  try {
    let rules = [];
    if (getIsConnected()) {
      rules = await Rule.find({ enabled: true });
    }

    if (rules.length === 0) {
      rules = sampleRules.filter((r) => r.enabled);
    }

    let count = 0;
    for (const rule of rules) {
      const res = activateRule(rule);
      if (res) count++;
    }

    console.log(`[RuleEngine] Successfully compiled and activated ${count} RxJS rule pipeline(s).`);
  } catch (err) {
    console.error('[RuleEngine Error during init]:', err.message);
  }
}

/**
 * Feed a telemetry packet into the reactive engine
 * @param {Object} packet 
 */
function processTelemetry(packet) {
  emitTelemetry(packet);
}

/**
 * Get status of currently running reactive pipelines
 */
function getEngineStatus() {
  const active = [];
  for (const [id, entry] of activeRulePipelines.entries()) {
    active.push({
      ruleId: id,
      ruleName: entry.rule.name,
      activatedAt: entry.activatedAt,
      nodes: entry.pipeline.orderedNodes,
    });
  }
  return {
    engine: 'RxJS Reactive IoT Engine',
    activePipelineCount: active.length,
    pipelines: active,
  };
}

module.exports = {
  initEngine,
  activateRule,
  deactivateRule,
  processTelemetry,
  getEngineStatus,
  activeRulePipelines,
};
