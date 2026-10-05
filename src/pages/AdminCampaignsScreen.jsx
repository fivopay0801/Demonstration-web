import React, { useState, useEffect } from 'react';
import { 
  Shield, Mail, Search, RefreshCw, Eye, Download, Users, CheckCircle2, 
  Send, AlertCircle, X, Calendar, ExternalLink, MousePointerClick, Paperclip,
  ChevronLeft, ChevronRight, Copy, Check
} from 'lucide-react';
import { api } from '../services/api';

const ITEMS_PER_SLIDE = 10;

function AdminCampaignsScreen() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [performerFilter, setPerformerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [recipientFilter, setRecipientFilter] = useState('ALL');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);

  const handleOpenCampaignModal = (camp, filter = 'ALL') => {
    setSelectedCampaign(camp);
    setRecipientFilter(filter);
    setRecipientSearch('');
    setCopiedEmails(false);
  };

  const handleCopySeenEmails = (recs) => {
    const listToCopy = (recs || [])
      .filter(r => r.opened)
      .map(r => r.name ? `"${r.name}" <${r.email}>` : r.email);
    
    if (listToCopy.length === 0) return;
    navigator.clipboard.writeText(listToCopy.join(', ')).then(() => {
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 2000);
    }).catch(err => {
      console.warn('Failed to copy emails:', err);
    });
  };

  const fetchAllCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCampaigns();
      if (res && res.data) {
        setCampaigns(res.data);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve campaigns list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCampaigns();
  }, []);

  // Extract unique performer names for filter dropdown
  const uniquePerformers = Array.from(
    new Set(
      campaigns
        .map(c => c.createdByName || 'Sales Executive (BDE)')
        .filter(Boolean)
    )
  );

  // Sort campaigns descending (latest first)
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime();
    const timeB = new Date(b.createdAt || b.date || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const idA = String(a._id || a.id || '');
    const idB = String(b._id || b.id || '');
    return idB.localeCompare(idA);
  });

  // Filtered campaigns
  const filteredCampaigns = sortedCampaigns.filter(camp => {
    const performer = camp.createdByName || 'Sales Executive (BDE)';
    const performerEmail = camp.createdByEmail || '';
    const campName = camp.name || '';
    const campSubject = camp.subject || '';
    const recipientSample = camp.recipients?.map(r => r.email).join(' ') || '';

    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      campName.toLowerCase().includes(query) ||
      campSubject.toLowerCase().includes(query) ||
      performer.toLowerCase().includes(query) ||
      performerEmail.toLowerCase().includes(query) ||
      recipientSample.toLowerCase().includes(query);

    const matchesPerformer = 
      performerFilter === 'ALL' || performer.toLowerCase() === performerFilter.toLowerCase();

    const matchesStatus = 
      statusFilter === 'ALL' || (camp.status || 'Sent').toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesPerformer && matchesStatus;
  });

  // Calculate slide pagination
  const totalSlides = Math.max(1, Math.ceil(filteredCampaigns.length / ITEMS_PER_SLIDE));

  // Reset to first slide on search or filter change
  useEffect(() => {
    setCurrentSlide(1);
  }, [searchTerm, performerFilter, statusFilter]);

  // Ensure currentSlide is within bounds
  useEffect(() => {
    if (currentSlide > totalSlides) {
      setCurrentSlide(totalSlides);
    }
  }, [totalSlides, currentSlide]);

  const startIndex = (currentSlide - 1) * ITEMS_PER_SLIDE;
  const endIndex = Math.min(startIndex + ITEMS_PER_SLIDE, filteredCampaigns.length);
  const currentSlideCampaigns = filteredCampaigns.slice(startIndex, startIndex + ITEMS_PER_SLIDE);

  // Export audit report to CSV
  const handleExportCSV = () => {
    if (campaigns.length === 0) {
      alert('No campaigns available to export.');
      return;
    }

    const headers = ['Campaign Name', 'Subject', 'Performed By', 'Performer Email', 'Performer Role', 'Dispatched Date', 'Total Sent', 'Delivered', 'Failed', 'Status'];
    const rows = campaigns.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.subject || '').replace(/"/g, '""')}"`,
      `"${(c.createdByName || 'Sales Executive (BDE)').replace(/"/g, '""')}"`,
      `"${c.createdByEmail || ''}"`,
      `"${c.createdByRole || 'SALES'}"`,
      `"${c.date || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '')}"`,
      c.sentCount || 0,
      c.delivered || c.sentCount || 0,
      c.failedCount || 0,
      `"${c.status || 'Sent'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Fivopay_Campaigns_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated Stats
  const totalCampaigns = campaigns.length;
  const totalEmailsSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered || c.sentCount || 0), 0);
  const overallDeliveryRate = totalEmailsSent > 0 ? Math.round((totalDelivered / totalEmailsSent) * 100) : 100;
  const totalOpened = campaigns.reduce((acc, c) => acc + (c.opened || 0), 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + (c.clicked || 0), 0);
  const activeDispatchersCount = uniquePerformers.length;

  const parsePerformer = (rawName, role) => {
    if (!rawName) {
      const isRoleAdmin = role?.toUpperCase() === 'ADMIN';
      return {
        name: isRoleAdmin ? 'System Administrator' : 'Sales Executive (BDE)',
        tag: isRoleAdmin ? 'ADMIN' : 'SALES BDE'
      };
    }

    const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      return {
        name: match[1].trim(),
        tag: match[2].trim().toUpperCase()
      };
    }

    const tag = role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'SALES BDE';
    return {
      name: rawName.trim(),
      tag
    };
  };

  const getInitials = (name) => {
    if (!name) return 'SE';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="admin-campaigns-screen" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Governance Header */}
      <div className="top-bar" style={{ marginBottom: 0 }}>
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Shield size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>
              Admin Governance & SES Audit
            </span>
          </div>
          <h1>All Email Campaigns & Performer Logs</h1>
          <p>Supervise all outbound email campaigns across sales representatives (BDEs), examine delivery metrics, and track performer audit logs.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchAllCampaigns} 
            disabled={loading}
            title="Refresh campaigns list"
            style={{ 
              height: '40px', 
              padding: '0 1rem', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              borderRadius: '8px'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleExportCSV} 
            title="Export Campaign Audit Trail as CSV"
            style={{ 
              height: '40px', 
              padding: '0 1.15rem', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              borderRadius: '8px'
            }}
          >
            <Download size={15} /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Total Campaigns Run</span>
            <Mail size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="kpi-value">{totalCampaigns}</div>
          <div className="kpi-footer" style={{ color: 'var(--text-muted)' }}>
            Across all sales team members
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Total Outbound Emails</span>
            <Send size={16} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {totalEmailsSent.toLocaleString()}
          </div>
          <div className="kpi-footer" style={{ color: 'var(--text-muted)' }}>
            Dispatched via AWS Mail Manager
          </div>
        </div>

        <div 
          className="kpi-card"
          onClick={() => {
            if (totalOpened > 0) {
              const campWithOpens = campaigns.find(c => (c.opened || 0) > 0) || campaigns[0];
              if (campWithOpens) {
                handleOpenCampaignModal(campWithOpens, 'SEEN');
              }
            }
          }}
          style={{ 
            cursor: totalOpened > 0 ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
          title={totalOpened > 0 ? "Click to view all seen emails and names" : "No opens recorded yet"}
        >
          <div className="kpi-card-header">
            <span>Email Engagement</span>
            <Eye size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div className="kpi-value" style={{ color: '#06b6d4' }}>
            {totalOpened} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>Opens</span>
          </div>
          <div className="kpi-footer" style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{totalClicked} link click{totalClicked === 1 ? '' : 's'} tracked</span>
            {totalOpened > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: '600' }}>
                View seen &rarr;
              </span>
            )}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span>Active Dispatchers</span>
            <Users size={16} style={{ color: '#ec4899' }} />
          </div>
          <div className="kpi-value" style={{ color: '#ec4899' }}>
            {activeDispatchersCount}
          </div>
          <div className="kpi-footer" style={{ color: 'var(--text-muted)' }}>
            Team members running campaigns
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> {error}
        </div>
      )}

      {/* Main Content Card: Filter Bar & Table */}
      <div className="content-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* Header Title & Subtitle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '0.75rem', 
          paddingBottom: '0.75rem', 
          borderBottom: '1px solid var(--border)' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Campaign Dispatch Roster
              </h3>
              <span className="badge stage-won" style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem', fontWeight: 600 }}>
                {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'Record' : 'Records'}
              </span>
              {totalSlides > 1 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                  (Slide {currentSlide} of {totalSlides})
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Outbound email campaigns dispatched via AWS SES with performer identity logs
            </p>
          </div>
        </div>

        {/* Clean, Non-wrapping Filter Toolbar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.65rem', 
          flexWrap: 'wrap' 
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search campaigns..."
              className="form-input"
              style={{ paddingLeft: '2.15rem', paddingRight: searchTerm ? '2rem' : '0.75rem', height: '36px', fontSize: '0.8rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Performer Filter Dropdown (contained in fixed width wrapper) */}
          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              style={{ height: '36px', fontSize: '0.8rem', width: '100%', padding: '0.4rem 0.75rem' }}
              value={performerFilter}
              onChange={(e) => setPerformerFilter(e.target.value)}
              title="Filter by who dispatched the campaign"
            >
              <option value="ALL">All Team Members</option>
              {uniquePerformers.map((performer, idx) => (
                <option key={idx} value={performer}>
                  {performer}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (contained in fixed width wrapper) */}
          <div style={{ width: '125px' }}>
            <select
              className="form-select"
              style={{ height: '36px', fontSize: '0.8rem', width: '100%', padding: '0.4rem 0.75rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Reset Filters CTA */}
          {(searchTerm || performerFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setPerformerFilter('ALL');
                setStatusFilter('ALL');
              }}
              style={{ height: '36px', fontSize: '0.775rem', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Reset all filters"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>

        {/* Clean Responsive Table */}
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Loading enterprise campaign logs & performer records...
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '28%', padding: '0.75rem 0.85rem', fontSize: '0.725rem' }}>Campaign</th>
                  <th style={{ width: '25%', padding: '0.75rem 0.85rem', fontSize: '0.725rem' }}>Dispatched By</th>
                  <th style={{ width: '15%', padding: '0.75rem 0.85rem', fontSize: '0.725rem' }}>Recipients</th>
                  <th style={{ width: '12%', padding: '0.75rem 0.85rem', fontSize: '0.725rem' }}>Date</th>
                  <th style={{ width: '10%', padding: '0.75rem 0.85rem', fontSize: '0.725rem' }}>Delivery</th>
                  <th style={{ width: '10%', padding: '0.75rem 0.85rem', fontSize: '0.725rem', textAlign: 'right' }}>Audit</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '420px', margin: '0 auto' }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
                          border: '1px solid rgba(99, 102, 241, 0.22)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem',
                          color: 'var(--accent)'
                        }}>
                          <Mail size={24} />
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {campaigns.length === 0 ? 'No Email Campaigns Recorded' : 'No Matching Campaigns Found'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                          {campaigns.length === 0 
                            ? 'Outbound email campaigns dispatched by Sales BDEs or Administrators will appear here with delivery telemetry and engagement audit logs.' 
                            : 'No campaigns match your current search terms or filters. Try adjusting or clearing your filters.'}
                        </p>
                        {campaigns.length > 0 && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setSearchTerm('');
                              setPerformerFilter('ALL');
                              setStatusFilter('ALL');
                            }}
                            style={{ marginTop: '1rem', fontSize: '0.775rem', padding: '0.4rem 0.9rem', gap: '0.35rem' }}
                          >
                            <X size={12} /> Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentSlideCampaigns.map(camp => {
                    const sent = camp.sentCount || 0;
                    const delivered = camp.delivered || sent;
                    const { name: cleanPerformer, tag: performerTag } = parsePerformer(camp.createdByName, camp.createdByRole);
                    const performerEmail = camp.createdByEmail || '';
                    const performerRole = (camp.createdByRole || 'SALES').toUpperCase();
                    const initials = getInitials(cleanPerformer);
                    const isAdminPerformer = performerRole === 'ADMIN' || performerTag.toLowerCase().includes('admin');

                    const recipientCount = camp.recipients ? camp.recipients.length : sent;
                    const recipientSample = camp.recipients && camp.recipients.length > 0
                      ? camp.recipients[0].email
                      : 'CRM Leads Group';

                    return (
                      <tr key={camp.id || camp._id} style={{ transition: 'background 0.15s ease' }}>
                        {/* Campaign Name & Subject */}
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ 
                              fontWeight: '600', 
                              color: 'var(--text-primary)', 
                              fontSize: '0.875rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '200px'
                            }} title={camp.name}>
                              {camp.name || 'Untitled Campaign'}
                            </span>
                            {camp.attachments && camp.attachments.length > 0 && (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.2rem', 
                                  fontSize: '0.675rem', 
                                  color: 'var(--accent)', 
                                  background: 'rgba(99, 102, 241, 0.1)', 
                                  padding: '0.08rem 0.35rem', 
                                  borderRadius: '4px',
                                  border: '1px solid rgba(99, 102, 241, 0.2)' 
                                }}
                                title={`${camp.attachments.length} attachment(s)`}
                              >
                                <Paperclip size={10} /> {camp.attachments.length}
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)', 
                            marginTop: '0.15rem',
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={camp.subject}>
                            {camp.subject || 'No Subject'}
                          </div>
                        </td>

                        {/* Performed By Column with Avatar & Badge */}
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isAdminPerformer 
                                ? 'linear-gradient(135deg, #a855f7, #6366f1)' 
                                : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '0.725rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                              flexShrink: 0
                            }}>
                              {initials}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ 
                                  fontWeight: '600', 
                                  color: 'var(--text-primary)', 
                                  fontSize: '0.825rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '130px'
                                }} title={cleanPerformer}>
                                  {cleanPerformer}
                                </span>
                                <span style={{
                                  fontSize: '0.625rem',
                                  padding: '0.05rem 0.3rem',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  letterSpacing: '0.03em',
                                  flexShrink: 0,
                                  background: isAdminPerformer ? 'rgba(168, 85, 247, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                                  color: isAdminPerformer ? '#c084fc' : 'var(--accent)',
                                  border: isAdminPerformer ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)'
                                }}>
                                  {performerTag}
                                </span>
                              </div>
                              {performerEmail && (
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  color: 'var(--text-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '160px'
                                }} title={performerEmail}>
                                  {performerEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Recipients */}
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}</span>
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-muted)', 
                            marginTop: '0.1rem',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={recipientSample}>
                            {recipientSample}
                          </div>
                        </td>

                        {/* Dispatched Date */}
                        <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)', fontSize: '0.785rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                            <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{camp.date || (camp.createdAt ? new Date(camp.createdAt).toISOString().split('T')[0] : 'Recent')}</span>
                          </div>
                        </td>

                        {/* Delivery */}
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                              {delivered}/{sent}
                            </span>
                            <span style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: camp.failedCount > 0 ? 'var(--danger)' : 'var(--success)'
                            }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.675rem', color: camp.failedCount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '500' }}>
                              {camp.failedCount > 0 ? `${camp.failedCount} failed` : '100% delivered'}
                            </span>
                            {camp.opened > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenCampaignModal(camp, 'SEEN')}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid rgba(16, 185, 129, 0.28)',
                                  color: '#10b981',
                                  borderRadius: '4px',
                                  padding: '0.08rem 0.35rem',
                                  fontSize: '0.675rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                                title="Click to view all seen emails and names"
                              >
                                <Eye size={10} />
                                <span>{camp.opened} seen</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Audit Action Button */}
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                          <button 
                            type="button" 
                            onClick={() => handleOpenCampaignModal(camp, 'ALL')}
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '0.25rem 0.55rem', 
                              fontSize: '0.75rem', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.3rem',
                              height: '28px'
                            }}
                            title="Inspect full performer and delivery logs"
                          >
                            <Eye size={12} /> Logs
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Slide Pagination & Navigation Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingTop: '0.85rem',
          marginTop: '0.5rem',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {filteredCampaigns.length > 0 ? (
              <>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong>–<strong style={{ color: 'var(--text-primary)' }}>{endIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredCampaigns.length}</strong> records
              </>
            ) : (
              <span>0 records</span>
            )}
          </div>

          {totalSlides > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentSlide(prev => Math.max(1, prev - 1))}
                disabled={currentSlide === 1}
                title="Previous Slide"
                style={{
                  height: '30px',
                  padding: '0 0.65rem',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: currentSlide === 1 ? 0.4 : 1,
                  cursor: currentSlide === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={13} /> Previous
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {Array.from({ length: totalSlides }, (_, idx) => idx + 1).map(slideNum => {
                  const isActive = slideNum === currentSlide;
                  const slideStart = (slideNum - 1) * ITEMS_PER_SLIDE + 1;
                  const slideEnd = Math.min(slideNum * ITEMS_PER_SLIDE, filteredCampaigns.length);
                  return (
                    <button
                      key={slideNum}
                      type="button"
                      onClick={() => setCurrentSlide(slideNum)}
                      className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        height: '30px',
                        minWidth: '65px',
                        padding: '0 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: isActive ? '700' : '500',
                        border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)'
                      }}
                      title={`Slide ${slideNum} (Records ${slideStart}–${slideEnd})`}
                    >
                      Slide {slideNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentSlide(prev => Math.min(totalSlides, prev + 1))}
                disabled={currentSlide === totalSlides}
                title="Next Slide"
                style={{
                  height: '30px',
                  padding: '0 0.65rem',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: currentSlide === totalSlides ? 0.4 : 1,
                  cursor: currentSlide === totalSlides ? 'not-allowed' : 'pointer'
                }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details & Performer Audit Modal */}
      {selectedCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="content-card" style={{ width: '920px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Shield size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                    Campaign Audit & Delivery Proof
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  {selectedCampaign.name}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedCampaign(null)} 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Performer Attribution Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  {getInitials(selectedCampaign.createdByName)}
                </div>
                <div>
                  <div style={{ fontSize: '0.675rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '700' }}>
                    Performed By
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{selectedCampaign.createdByName || 'Sales Executive (BDE)'}</span>
                    <span style={{
                      fontSize: '0.625rem',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '4px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}>
                      {selectedCampaign.createdByRole || 'SALES'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedCampaign.createdByEmail || 'Verified Team Account'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.675rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Execution Date
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {selectedCampaign.date || 'Recent'}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.1rem' }}>
                  <span className="pulsing-beacon-dot"></span>
                  <span>AWS Mail Manager (STARTTLS)</span>
                </div>
              </div>
            </div>

            {/* Performance Metric Boxes Across Top */}
            {/* Metric Computations for Recipient Logs */}
            {(() => {
              const allRecipients = selectedCampaign.recipients || [];
              const seenCount = allRecipients.filter(r => !!r.opened).length;
              const clickedCount = allRecipients.filter(r => !!r.clicked).length;
              const unopenedCount = allRecipients.filter(r => !r.opened && r.status === 'Sent').length;
              const failedCount = allRecipients.filter(r => r.status === 'Failed' || !!r.error).length;

              const displayedRecipients = allRecipients.filter(rec => {
                if (recipientFilter === 'SEEN') return !!rec.opened;
                if (recipientFilter === 'CLICKED') return !!rec.clicked;
                if (recipientFilter === 'UNOPENED') return !rec.opened && rec.status === 'Sent';
                if (recipientFilter === 'FAILED') return rec.status === 'Failed' || !!rec.error;
                if (recipientFilter === 'DELIVERED') return rec.status !== 'Failed';
                return true; // 'ALL'
              }).filter(rec => {
                if (!recipientSearch.trim()) return true;
                const q = recipientSearch.toLowerCase();
                const emailMatch = rec.email && rec.email.toLowerCase().includes(q);
                const nameMatch = rec.name && rec.name.toLowerCase().includes(q);
                return emailMatch || nameMatch;
              });

              return (
                <>
                  {/* Performance Metric Boxes Across Top (Interactive Filters) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {/* Dispatched */}
                    <div 
                      className="metric-box" 
                      onClick={() => setRecipientFilter('ALL')}
                      style={{ 
                        padding: '0.75rem 0.5rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        border: recipientFilter === 'ALL' ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: recipientFilter === 'ALL' ? 'rgba(99, 102, 241, 0.08)' : undefined,
                        transition: 'all 0.15s ease'
                      }}
                      title="Click to view all dispatched recipients"
                    >
                      <div className="metric-num" style={{ fontSize: '1.25rem' }}>{selectedCampaign.sentCount || 0}</div>
                      <div className="metric-lbl" style={{ fontSize: '0.725rem', marginTop: '0.15rem' }}>Dispatched</div>
                    </div>

                    {/* Delivered */}
                    <div 
                      className="metric-box" 
                      onClick={() => setRecipientFilter('DELIVERED')}
                      style={{ 
                        padding: '0.75rem 0.5rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        border: recipientFilter === 'DELIVERED' ? '2px solid var(--success)' : '1px solid var(--border)',
                        background: recipientFilter === 'DELIVERED' ? 'rgba(16, 185, 129, 0.08)' : undefined,
                        transition: 'all 0.15s ease'
                      }}
                      title="Click to view delivered recipients"
                    >
                      <div className="metric-num" style={{ color: 'var(--success)', fontSize: '1.25rem' }}>
                        {selectedCampaign.delivered || selectedCampaign.sentCount || 0}
                      </div>
                      <div className="metric-lbl" style={{ fontSize: '0.725rem', marginTop: '0.15rem' }}>Delivered</div>
                    </div>

                    {/* Seen / Opened */}
                    <div 
                      className="metric-box" 
                      onClick={() => setRecipientFilter(recipientFilter === 'SEEN' ? 'ALL' : 'SEEN')}
                      style={{ 
                        padding: '0.75rem 0.5rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        border: recipientFilter === 'SEEN' ? '2px solid #10b981' : '1px solid var(--border)',
                        background: recipientFilter === 'SEEN' ? 'rgba(16, 185, 129, 0.14)' : undefined,
                        boxShadow: recipientFilter === 'SEEN' ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none',
                        transform: recipientFilter === 'SEEN' ? 'scale(1.02)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={recipientFilter === 'SEEN' ? "Active: Showing Seen Recipients (click to reset)" : "Click to show all seen emails and names"}
                    >
                      <div className="metric-num" style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '1.25rem' }}>
                        <Eye size={15} />
                        <span>{selectedCampaign.opened || 0}</span>
                      </div>
                      <div className="metric-lbl" style={{ fontSize: '0.725rem', marginTop: '0.15rem', color: recipientFilter === 'SEEN' ? '#10b981' : undefined, fontWeight: recipientFilter === 'SEEN' ? '700' : 'normal' }}>
                        {recipientFilter === 'SEEN' ? '✓ Seen / Opened' : 'Seen / Opened'}
                      </div>
                    </div>

                    {/* Link Clicks */}
                    <div 
                      className="metric-box" 
                      onClick={() => setRecipientFilter(recipientFilter === 'CLICKED' ? 'ALL' : 'CLICKED')}
                      style={{ 
                        padding: '0.75rem 0.5rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        border: recipientFilter === 'CLICKED' ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: recipientFilter === 'CLICKED' ? 'rgba(99, 102, 241, 0.14)' : undefined,
                        boxShadow: recipientFilter === 'CLICKED' ? '0 0 12px rgba(99, 102, 241, 0.25)' : 'none',
                        transform: recipientFilter === 'CLICKED' ? 'scale(1.02)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={recipientFilter === 'CLICKED' ? "Active: Showing Clicked Recipients" : "Click to show clicked recipients"}
                    >
                      <div className="metric-num" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '1.25rem' }}>
                        <ExternalLink size={14} />
                        <span>{selectedCampaign.clicked || 0}</span>
                      </div>
                      <div className="metric-lbl" style={{ fontSize: '0.725rem', marginTop: '0.15rem', color: recipientFilter === 'CLICKED' ? 'var(--accent)' : undefined, fontWeight: recipientFilter === 'CLICKED' ? '700' : 'normal' }}>
                        {recipientFilter === 'CLICKED' ? '✓ Link Clicks' : 'Link Clicks'}
                      </div>
                    </div>

                    {/* Bounced / Failed */}
                    <div 
                      className="metric-box" 
                      onClick={() => setRecipientFilter(recipientFilter === 'FAILED' ? 'ALL' : 'FAILED')}
                      style={{ 
                        padding: '0.75rem 0.5rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        border: recipientFilter === 'FAILED' ? '2px solid var(--danger)' : '1px solid var(--border)',
                        background: recipientFilter === 'FAILED' ? 'rgba(239, 68, 68, 0.12)' : undefined,
                        transition: 'all 0.15s ease'
                      }}
                      title="Click to view bounced/failed recipients"
                    >
                      <div className="metric-num" style={{ color: selectedCampaign.failedCount ? 'var(--danger)' : 'var(--text-muted)', fontSize: '1.25rem' }}>
                        {selectedCampaign.failedCount || 0}
                      </div>
                      <div className="metric-lbl" style={{ fontSize: '0.725rem', marginTop: '0.15rem', color: recipientFilter === 'FAILED' ? 'var(--danger)' : undefined, fontWeight: recipientFilter === 'FAILED' ? '700' : 'normal' }}>
                        {recipientFilter === 'FAILED' ? '✓ Bounced / Failed' : 'Bounced / Failed'}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Rectangular Body */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                    {/* Left Column: Email Content, Subject, and Attachments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Subject Line */}
                      <div style={{ 
                        padding: '0.85rem 1rem', 
                        borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid var(--border)' 
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                          Subject Line
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                          {selectedCampaign.subject || 'No Subject'}
                        </div>
                      </div>

                      {/* Dispatched Email Content */}
                      {selectedCampaign.templateText && (
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            Dispatched Email Content
                          </div>
                          <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border)',
                            fontSize: '0.825rem',
                            lineHeight: '1.65',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-line',
                            color: 'var(--text-secondary)'
                          }}>
                            {selectedCampaign.templateText}
                          </div>
                        </div>
                      )}

                      {/* Attached Files (if any) */}
                      {selectedCampaign.attachments && selectedCampaign.attachments.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            Campaign Attachments ({selectedCampaign.attachments.length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {selectedCampaign.attachments.map((att, idx) => (
                              <div key={idx} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                fontSize: '0.785rem',
                                color: 'var(--text-primary)'
                              }}>
                                <Paperclip size={13} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontWeight: '500' }}>{att.filename}</span>
                                {att.size > 0 && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    ({att.size > 1024 * 1024 ? `${(att.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(att.size / 1024)} KB`})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Recipient Logs & Engagement Tracking */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                          Recipient Logs & Engagement Tracking
                        </div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {displayedRecipients.length} of {allRecipients.length} targeted lead(s)
                        </span>
                      </div>

                      {/* Filter Pills & Instant Search */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setRecipientFilter('ALL')}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.72rem',
                              borderRadius: '6px',
                              border: recipientFilter === 'ALL' ? '1px solid var(--accent)' : '1px solid var(--border)',
                              background: recipientFilter === 'ALL' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                              color: recipientFilter === 'ALL' ? 'var(--accent)' : 'var(--text-secondary)',
                              fontWeight: recipientFilter === 'ALL' ? '700' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            All ({allRecipients.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => setRecipientFilter('SEEN')}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.72rem',
                              borderRadius: '6px',
                              border: recipientFilter === 'SEEN' ? '1px solid #10b981' : '1px solid var(--border)',
                              background: recipientFilter === 'SEEN' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                              color: recipientFilter === 'SEEN' ? '#10b981' : 'var(--text-secondary)',
                              fontWeight: recipientFilter === 'SEEN' ? '700' : '500',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Eye size={12} />
                            <span>Seen ({seenCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRecipientFilter('CLICKED')}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.72rem',
                              borderRadius: '6px',
                              border: recipientFilter === 'CLICKED' ? '1px solid #818cf8' : '1px solid var(--border)',
                              background: recipientFilter === 'CLICKED' ? 'rgba(129, 140, 248, 0.15)' : 'transparent',
                              color: recipientFilter === 'CLICKED' ? '#818cf8' : 'var(--text-secondary)',
                              fontWeight: recipientFilter === 'CLICKED' ? '700' : '500',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <ExternalLink size={11} />
                            <span>Clicked ({clickedCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRecipientFilter('UNOPENED')}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.72rem',
                              borderRadius: '6px',
                              border: recipientFilter === 'UNOPENED' ? '1px solid var(--text-muted)' : '1px solid var(--border)',
                              background: recipientFilter === 'UNOPENED' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                              color: recipientFilter === 'UNOPENED' ? 'var(--text-primary)' : 'var(--text-muted)',
                              fontWeight: recipientFilter === 'UNOPENED' ? '700' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            Unopened ({unopenedCount})
                          </button>
                        </div>

                        {/* Search input */}
                        <div style={{ position: 'relative' }}>
                          <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            placeholder="Filter by email or name..."
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.35rem 1.8rem 0.35rem 1.85rem',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              outline: 'none'
                            }}
                          />
                          {recipientSearch && (
                            <button
                              onClick={() => setRecipientSearch('')}
                              style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Banner when filtered by SEEN */}
                      {recipientFilter === 'SEEN' && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          marginBottom: '0.5rem',
                          fontSize: '0.75rem'
                        }}>
                          <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Eye size={13} />
                            <span>Showing {displayedRecipients.length} Seen Lead{displayedRecipients.length === 1 ? '' : 's'} (Names & Emails)</span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {displayedRecipients.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleCopySeenEmails(displayedRecipients)}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  color: '#10b981',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.675rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                title="Copy all seen email addresses"
                              >
                                {copiedEmails ? <Check size={11} /> : <Copy size={11} />}
                                <span>{copiedEmails ? 'Copied!' : 'Copy Seen Emails'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setRecipientFilter('ALL')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '0.675rem',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              Show All
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {displayedRecipients.length > 0 ? (
                          displayedRecipients.map((rec, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.775rem',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '6px',
                              background: rec.opened ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255,255,255,0.02)',
                              border: rec.opened ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', minWidth: 0 }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: rec.opened ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: rec.opened ? '#10b981' : 'var(--text-muted)',
                                  flexShrink: 0,
                                  marginTop: '2px'
                                }}>
                                  {rec.opened ? <Eye size={12} /> : <Mail size={11} />}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                      {rec.name || 'Unnamed Recipient'}
                                    </span>
                                    {rec.opened && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        padding: '0.08rem 0.35rem',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        fontWeight: '600',
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16, 185, 129, 0.3)'
                                      }}>
                                        <Eye size={10} />
                                        <span>Seen{rec.openCount > 1 ? ` (${rec.openCount}x)` : ''}</span>
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem', wordBreak: 'break-all' }}>
                                    {rec.email}
                                  </div>

                                  {rec.opened && (rec.lastOpenedAt || rec.openedAt) && (
                                    <div style={{ fontSize: '0.675rem', color: '#10b981', marginTop: '0.15rem' }}>
                                      Opened: {new Date(rec.lastOpenedAt || rec.openedAt).toLocaleString()}
                                    </div>
                                  )}

                                  {rec.lastClickedUrl && (
                                    <div style={{ fontSize: '0.675rem', color: 'var(--accent)', marginTop: '0.1rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.lastClickedUrl}>
                                      Clicked: {rec.lastClickedUrl}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                                {/* Unopened status */}
                                {!rec.opened && rec.status === 'Sent' && (
                                  <span style={{
                                    fontSize: '0.675rem',
                                    color: 'var(--text-muted)',
                                    padding: '0.12rem 0.35rem'
                                  }}>
                                    Unopened
                                  </span>
                                )}

                                {/* Clicked Badge */}
                                {rec.clicked && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '4px',
                                    fontSize: '0.675rem',
                                    fontWeight: '600',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: '#818cf8',
                                    border: '1px solid rgba(99, 102, 241, 0.3)'
                                  }} title={rec.clickedAt ? `Clicked: ${new Date(rec.clickedAt).toLocaleString()}` : 'Clicked'}>
                                    <ExternalLink size={10} />
                                    <span>Clicked{rec.clickCount > 1 ? ` (${rec.clickCount}x)` : ''}</span>
                                  </span>
                                )}

                                {/* Send Status Badge */}
                                <span className={`badge ${rec.status === 'Failed' ? 'stage-lost' : 'stage-won'}`} style={{ padding: '0.12rem 0.4rem', fontSize: '0.675rem' }}>
                                  {rec.status || 'Sent'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '2rem 1rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px dashed var(--border)'
                          }}>
                            <Eye size={22} style={{ color: 'var(--text-muted)', opacity: 0.6, marginBottom: '0.4rem' }} />
                            <div style={{ fontWeight: '600', fontSize: '0.825rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                              {recipientFilter === 'SEEN' ? 'No Seen Recipients Found' : 'No Matching Recipients'}
                            </div>
                            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {recipientFilter === 'SEEN'
                                ? 'None of the targeted leads have opened this email campaign yet.'
                                : 'Try clearing your search query or switching filters.'}
                            </p>
                            {recipientFilter !== 'ALL' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setRecipientFilter('ALL'); setRecipientSearch(''); }}
                                style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                              >
                                View All Recipients ({allRecipients.length})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setSelectedCampaign(null)} 
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCampaignsScreen;
