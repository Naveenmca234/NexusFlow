import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Workflow, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Calendar, 
  AlertTriangle,
  RefreshCw,
  Zap,
  Power,
  PauseCircle,
  PlayCircle,
  History,
  Activity,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function Rules() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'history'
  const [rules, setRules] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, paused, disabled
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  // Modals state
  const [deleteModalRule, setDeleteModalRule] = useState(null);
  const [disableModalRule, setDisableModalRule] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await api.getRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    setExecutionsLoading(true);
    try {
      const data = await api.getRuleExecutions({ limit: 50 });
      setExecutions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading executions:', err);
    } finally {
      setExecutionsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchExecutions();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 3500);
  };

  // Helper to determine normalized rule status ('active' | 'paused' | 'disabled')
  const getRuleStatus = (rule) => {
    if (rule.status) return rule.status;
    return rule.enabled ? 'active' : 'disabled';
  };

  // Set rule status: 'active', 'paused', 'disabled'
  const handleSetStatus = async (ruleId, newStatus, ruleName) => {
    setActionInProgress(ruleId);
    try {
      const res = await api.updateRuleStatus(ruleId, newStatus);
      const updatedRule = res?.rule;

      setRules((prev) =>
        prev.map((r) => {
          if (r._id === ruleId || r.id === ruleId) {
            return {
              ...r,
              status: newStatus,
              enabled: newStatus === 'active',
              updatedAt: updatedRule?.updatedAt || new Date().toISOString(),
            };
          }
          return r;
        })
      );

      const statusLabels = {
        active: 'Active & Running',
        paused: 'Paused',
        disabled: 'Disabled',
      };
      showFeedback('success', `"${ruleName}" is now ${statusLabels[newStatus]}`);
    } catch (err) {
      showFeedback('error', `Failed to change status: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Confirm Disable Modal
  const confirmDisableRule = async () => {
    if (!disableModalRule) return;
    const { id, name } = disableModalRule;
    await handleSetStatus(id, 'disabled', name);
    setDisableModalRule(null);
  };

  // Duplicate Rule
  const handleDuplicateRule = async (ruleId, ruleName) => {
    setActionInProgress(ruleId);
    try {
      const res = await api.duplicateRule(ruleId);
      if (res && (res._id || res.id)) {
        showFeedback('success', `Rule "${ruleName}" duplicated successfully!`);
        await fetchRules();
      } else {
        showFeedback('error', 'Could not duplicate rule.');
      }
    } catch (err) {
      showFeedback('error', `Duplicate failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete Rule
  const confirmDeleteRule = async () => {
    if (!deleteModalRule) return;
    const { id, name } = deleteModalRule;
    setActionInProgress(id);
    try {
      await api.deleteRule(id);
      setRules((prev) => prev.filter((r) => r._id !== id && r.id !== id));
      showFeedback('success', `Rule "${name}" deleted.`);
      setDeleteModalRule(null);
    } catch (err) {
      showFeedback('error', `Failed to delete rule: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter((rule) => {
    const status = getRuleStatus(rule);
    const matchesSearch =
      (rule.name && rule.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rule.description && rule.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rule.targetDeviceId && rule.targetDeviceId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && status === 'active';
    if (statusFilter === 'paused') return matchesSearch && status === 'paused';
    if (statusFilter === 'disabled') return matchesSearch && status === 'disabled';
    return matchesSearch;
  });

  const totalRules = rules.length;
  const activeCount = rules.filter((r) => getRuleStatus(r) === 'active').length;
  const pausedCount = rules.filter((r) => getRuleStatus(r) === 'paused').length;
  const disabledCount = rules.filter((r) => getRuleStatus(r) === 'disabled').length;
  const totalExecutions = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Primary CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.35)',
            }}>
              <Workflow size={22} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>IoT Automation Rules</h1>
            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
              {totalRules} {totalRules === 1 ? 'Rule' : 'Rules'}
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Configure reactive RxJS stream processing DAG pipelines, pause/resume rules, and audit execution history.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => { fetchRules(); fetchExecutions(); }}
            className="btn btn-secondary"
            title="Refresh rules & executions"
            disabled={loading || executionsLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading || executionsLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <Link
            to="/rules/builder"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <Plus size={18} />
            <span>Create New Rule</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid var(--accent-primary, #6366f1)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={14} color="var(--accent-primary, #6366f1)" />
            <span>Total Pipelines</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{totalRules}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={14} color="#10b981" />
            <span>Active (Executing)</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399' }}>{activeCount}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PauseCircle size={14} color="#fbbf24" />
            <span>Paused</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24' }}>{pausedCount}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid #64748b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Power size={14} color="#94a3b8" />
            <span>Disabled</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#94a3b8' }}>{disabledCount}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid var(--accent-cyan, #06b6d4)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Zap size={14} color="var(--accent-cyan, #06b6d4)" />
            <span>Evaluations Fired</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-cyan, #06b6d4)' }}>
            {totalExecutions.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Toast Feedback Alert */}
      {feedback.message && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          background: feedback.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: feedback.type === 'error' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
          color: feedback.type === 'error' ? '#f43f5e' : '#34d399',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease',
        }}>
          {feedback.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main View Mode Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: activeTab === 'rules' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'rules' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'rules' ? '1px solid var(--border-color)' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Workflow size={16} color={activeTab === 'rules' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
          <span>Rules Management ({totalRules})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: activeTab === 'history' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'history' ? '1px solid var(--border-color)' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <History size={16} color={activeTab === 'history' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Execution History ({executions.length})</span>
        </button>
      </div>

      {activeTab === 'rules' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="card" style={{ padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search rules by name, description, or device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  background: 'var(--bg-main, #0f172a)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-main, #0f172a)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color, #334155)' }}>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: statusFilter === 'all' ? 'var(--bg-card-hover, #243046)' : 'transparent',
                  color: statusFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                All ({totalRules})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: statusFilter === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: statusFilter === 'active' ? '#34d399' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: statusFilter === 'paused' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: statusFilter === 'paused' ? '#fbbf24' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Paused ({pausedCount})
              </button>
              <button
                onClick={() => setStatusFilter('disabled')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: statusFilter === 'disabled' ? 'rgba(100, 116, 139, 0.25)' : 'transparent',
                  color: statusFilter === 'disabled' ? '#e2e8f0' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Disabled ({disabledCount})
              </button>
            </div>
          </div>

          {/* Rules Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main, #0f172a)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rule Name & Target
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pipeline Topology
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Execution Status
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Trigger Count
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                      Execution Controls & Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                        <Workflow size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff', marginBottom: '0.25rem' }}>No rules found</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Try adjusting search query or filter tab.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => {
                      const ruleId = rule._id || rule.id;
                      const status = getRuleStatus(rule);
                      const isBusy = actionInProgress === ruleId;

                      return (
                        <tr
                          key={ruleId}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Name & Target */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                {rule.name}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span className="badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                  Target: {rule.targetDeviceId || 'All Devices'}
                                </span>
                                {rule.description && (
                                  <span style={{ color: 'var(--text-muted)' }}>• {rule.description}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Topology */}
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                {rule.nodes?.length || 0} nodes
                              </span>
                              <span style={{ color: 'var(--text-muted)' }}>→</span>
                              <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                {rule.edges?.length || 0} edges
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {status === 'active' && (
                              <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.75rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                ACTIVE
                              </span>
                            )}
                            {status === 'paused' && (
                              <span className="badge badge-paused" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.75rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                                PAUSED
                              </span>
                            )}
                            {status === 'disabled' && (
                              <span className="badge badge-disabled" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.75rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                                DISABLED
                              </span>
                            )}
                          </td>

                          {/* Trigger Count */}
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Zap size={14} color="var(--accent-amber)" />
                              <span style={{ fontWeight: 600 }}>{rule.executionCount || 0}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>fires</span>
                            </div>
                          </td>

                          {/* Execution Controls & Actions */}
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              {/* Status Control Buttons */}
                              {status === 'active' ? (
                                <>
                                  <button
                                    onClick={() => handleSetStatus(ruleId, 'paused', rule.name)}
                                    disabled={isBusy}
                                    className="btn btn-secondary"
                                    title="Pause Rule Execution"
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.75rem',
                                      color: '#fbbf24',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <PauseCircle size={14} />
                                    <span>Pause</span>
                                  </button>
                                  <button
                                    onClick={() => setDisableModalRule({ id: ruleId, name: rule.name })}
                                    disabled={isBusy}
                                    className="btn btn-secondary"
                                    title="Disable Rule"
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.75rem',
                                      color: '#94a3b8',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <Power size={14} />
                                    <span>Disable</span>
                                  </button>
                                </>
                              ) : status === 'paused' ? (
                                <>
                                  <button
                                    onClick={() => handleSetStatus(ruleId, 'active', rule.name)}
                                    disabled={isBusy}
                                    className="btn"
                                    title="Resume Rule Execution"
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#34d399',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <PlayCircle size={14} />
                                    <span>Resume</span>
                                  </button>
                                  <button
                                    onClick={() => setDisableModalRule({ id: ruleId, name: rule.name })}
                                    disabled={isBusy}
                                    className="btn btn-secondary"
                                    title="Disable Rule"
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.75rem',
                                      color: '#94a3b8',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <Power size={14} />
                                    <span>Disable</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleSetStatus(ruleId, 'active', rule.name)}
                                  disabled={isBusy}
                                  className="btn btn-primary"
                                  title="Activate Rule"
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}
                                >
                                  <PlayCircle size={14} />
                                  <span>Activate</span>
                                </button>
                              )}

                              {/* Open in Builder */}
                              <button
                                onClick={() => navigate(`/rules/builder/${ruleId}`)}
                                className="btn btn-secondary"
                                title="Open in Visual Rule Builder"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <ExternalLink size={13} />
                                <span>Edit</span>
                              </button>

                              {/* Duplicate */}
                              <button
                                onClick={() => handleDuplicateRule(ruleId, rule.name)}
                                disabled={isBusy}
                                className="navbar-icon-btn"
                                title="Duplicate Rule"
                                style={{ width: '30px', height: '30px' }}
                              >
                                <Copy size={13} />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setDeleteModalRule({ id: ruleId, name: rule.name })}
                                disabled={isBusy}
                                className="navbar-icon-btn"
                                title="Delete Rule"
                                style={{ width: '30px', height: '30px', color: '#f43f5e' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Execution History Tab */
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Recent Rule Executions</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Audited timeline of reactive rule triggers, sensor readings, and evaluation results.
              </p>
            </div>
            <button
              onClick={fetchExecutions}
              className="btn btn-secondary"
              disabled={executionsLoading}
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={13} className={executionsLoading ? 'spin' : ''} />
              <span>Refresh History</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main, #0f172a)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Rule
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Device
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Execution Time
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Input Reading
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Evaluation Result
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                      <Activity size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff', marginBottom: '0.25rem' }}>No execution logs recorded yet</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Executions will appear here when telemetry packets evaluate active rule pipelines.
                      </p>
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr
                      key={exec._id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Rule */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {exec.ruleName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID: {exec.ruleId}
                        </div>
                      </td>

                      {/* Device */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          {exec.deviceId}
                        </span>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="var(--text-muted)" />
                          <span>{formatDate(exec.timestamp || exec.createdAt)}</span>
                        </div>
                      </td>

                      {/* Input Value */}
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', fontFamily: 'monospace', color: '#fff' }}>
                        {exec.inputValue !== null && exec.inputValue !== undefined ? String(exec.inputValue) : '—'}
                      </td>

                      {/* Result */}
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {exec.result || 'Condition evaluated'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                        {exec.executionStatus === 'failed' || exec.executionStatus === 'error' ? (
                          <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                            FAILED
                          </span>
                        ) : (
                          <span className="badge badge-active">
                            SUCCESS
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Disabling a Rule */}
      {disableModalRule && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Disable Rule Execution</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Confirmation required</p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to disable rule <strong style={{ color: '#fff' }}>"{disableModalRule.name}"</strong>? Paused or disabled rules will not evaluate incoming telemetry and will not trigger alerts.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDisableModalRule(null)}
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmDisableRule}
                disabled={actionInProgress === disableModalRule.id}
                style={{
                  background: '#f59e0b',
                  borderColor: '#f59e0b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Power size={14} />
                <span>Confirm Disable</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalRule && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(244, 63, 94, 0.12)',
                color: '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Delete Rule Graph</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This action cannot be undone</p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete rule <strong style={{ color: '#fff' }}>"{deleteModalRule.name}"</strong>? The associated active RxJS telemetry pipeline will be stopped and deactivated.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteModalRule(null)}
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={confirmDeleteRule}
                disabled={actionInProgress === deleteModalRule.id}
                style={{
                  background: '#f43f5e',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Trash2 size={14} />
                <span>{actionInProgress === deleteModalRule.id ? 'Deleting...' : 'Delete Rule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
