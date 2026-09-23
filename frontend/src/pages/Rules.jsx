import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Workflow, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Calendar, 
  Cpu, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Sliders,
  Check,
  Zap,
  Power
} from 'lucide-react';
import { api } from '../services/api';

export default function Rules() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, disabled
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [deleteModalRule, setDeleteModalRule] = useState(null);
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

  useEffect(() => {
    fetchRules();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 3500);
  };

  // Toggle Rule Status (Enable/Disable)
  const handleToggleRule = async (ruleId, currentName) => {
    setActionInProgress(ruleId);
    try {
      const res = await api.toggleRule(ruleId);
      if (res && res.rule) {
        setRules((prev) =>
          prev.map((r) => ((r._id === ruleId || r.id === ruleId) ? { ...r, enabled: res.rule.enabled, updatedAt: res.rule.updatedAt } : r))
        );
        showFeedback(
          'success',
          `"${currentName}" is now ${res.rule.enabled ? 'Active / Enabled' : 'Disabled'}`
        );
      } else {
        // Fallback optimistic toggle
        setRules((prev) =>
          prev.map((r) => {
            if (r._id === ruleId || r.id === ruleId) {
              const updatedStatus = !r.enabled;
              showFeedback('success', `"${currentName}" is now ${updatedStatus ? 'Active' : 'Disabled'}`);
              return { ...r, enabled: updatedStatus, updatedAt: new Date().toISOString() };
            }
            return r;
          })
        );
      }
    } catch (err) {
      showFeedback('error', `Failed to toggle rule: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
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
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      (rule.name && rule.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rule.description && rule.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rule.targetDeviceId && rule.targetDeviceId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && rule.enabled;
    if (statusFilter === 'disabled') return matchesSearch && !rule.enabled;
    return matchesSearch;
  });

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.enabled).length;
  const disabledRules = totalRules - activeRules;
  const totalExecutions = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Primary CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
            }}>
              <Workflow size={20} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Automation Rules</h1>
            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
              {totalRules} {totalRules === 1 ? 'Rule' : 'Rules'}
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Manage, configure, and monitor automated telemetry processing DAG pipelines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchRules}
            className="btn btn-secondary"
            title="Refresh rules"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
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
        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Workflow size={14} color="var(--accent-cyan)" />
            <span>Total Pipelines</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{totalRules}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={14} color="#10b981" />
            <span>Active & Running</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399' }}>{activeRules}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid #64748b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Power size={14} color="#94a3b8" />
            <span>Disabled Rules</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#94a3b8' }}>{disabledRules}</div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', borderLeft: '3px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Zap size={14} color="var(--accent-amber)" />
            <span>Total Trigger Events</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24' }}>
            {totalExecutions.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Toast Feedback Alert */}
      {feedback.message && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: feedback.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
          color: feedback.type === 'error' ? '#f87171' : '#34d399',
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

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search rules by name, description, or device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              background: '#090d16',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#090d16', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: statusFilter === 'all' ? 'var(--bg-card-hover, #161e31)' : 'transparent',
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
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: statusFilter === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: statusFilter === 'active' ? '#34d399' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Active ({activeRules})
          </button>
          <button
            onClick={() => setStatusFilter('disabled')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: statusFilter === 'disabled' ? 'rgba(100, 116, 139, 0.2)' : 'transparent',
              color: statusFilter === 'disabled' ? '#e2e8f0' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Disabled ({disabledRules})
          </button>
        </div>
      </div>

      {/* Rules Table / Cards */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#090d16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rule Name & Target
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Description
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Created Date
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Updated Date
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && rules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem' }} />
                    <p>Loading rules...</p>
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    <Workflow size={32} color="#475569" style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {searchQuery ? 'No rules matching search criteria' : 'No rules found'}
                    </p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Get started by creating your first automated IoT rule pipeline.
                    </p>
                    <Link
                      to="/rules/builder"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', fontSize: '0.8rem' }}
                    >
                      <Plus size={16} />
                      <span>Create Rule in Builder</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const ruleId = rule._id || rule.id;
                  const isBusy = actionInProgress === ruleId;

                  return (
                    <tr
                      key={ruleId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#161e31')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Rule Name & Target */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: rule.enabled ? 'rgba(6, 182, 212, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                            color: rule.enabled ? 'var(--accent-cyan)' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Workflow size={15} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                              {rule.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                background: '#090d16',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}>
                                <Cpu size={10} />
                                {rule.targetDeviceId === 'all' ? 'Fleet-wide' : rule.targetDeviceId || 'All Sensors'}
                              </span>
                              {rule.nodes && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  • {rule.nodes.length} nodes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '280px' }}>
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {rule.description || 'No description provided'}
                        </p>
                      </td>

                      {/* Status Toggle & Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <button
                            onClick={() => handleToggleRule(ruleId, rule.name)}
                            disabled={isBusy}
                            title={rule.enabled ? 'Click to deactivate rule' : 'Click to activate rule'}
                            style={{
                              width: '38px',
                              height: '20px',
                              borderRadius: '999px',
                              background: rule.enabled ? '#10b981' : '#334155',
                              border: 'none',
                              cursor: isBusy ? 'wait' : 'pointer',
                              position: 'relative',
                              transition: 'background 0.2s ease',
                              padding: '2px',
                            }}
                          >
                            <span style={{
                              display: 'block',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: '#fff',
                              transform: rule.enabled ? 'translateX(18px)' : 'translateX(0)',
                              transition: 'transform 0.2s ease',
                            }} />
                          </button>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: rule.enabled ? '#34d399' : '#94a3b8',
                            letterSpacing: '0.04em',
                          }}>
                            {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>{formatDate(rule.createdAt)}</span>
                        </div>
                      </td>

                      {/* Updated Date */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="var(--text-muted)" />
                          <span>{formatDate(rule.updatedAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {/* Open in Rule Builder */}
                          <button
                            onClick={() => navigate(`/rules/builder/${ruleId}`)}
                            className="btn btn-secondary"
                            title="Open in Visual Rule Builder"
                            style={{
                              padding: '0.4rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>Open Builder</span>
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateRule(ruleId, rule.name)}
                            disabled={isBusy}
                            className="navbar-icon-btn"
                            title="Duplicate Rule"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <Copy size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModalRule({ id: ruleId, name: rule.name })}
                            disabled={isBusy}
                            className="navbar-icon-btn"
                            title="Delete Rule"
                            style={{ width: '32px', height: '32px', color: '#f43f5e' }}
                          >
                            <Trash2 size={14} />
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
            background: '#111726',
            border: '1px solid var(--border-color)',
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
