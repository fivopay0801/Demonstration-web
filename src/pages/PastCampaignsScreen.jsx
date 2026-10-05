import React, { useState, useEffect } from 'react';
import { 
  Inbox, RefreshCw, Send, CheckCircle, Search, Mail, Eye, X, History, ExternalLink, Paperclip,
  ChevronLeft, ChevronRight, Copy, Check
} from 'lucide-react';
import { api } from '../services/api';

const ITEMS_PER_SLIDE = 10;

function PastCampaignsScreen({ campaigns, setCampaigns, onComposeNew }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [recipientFilter, setRecipientFilter] = useState('ALL');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const refreshCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaigns();
      if (res && res.data) {
        setCampaigns(res.data);
      }
    } catch (err) {
      console.warn('[PastCampaignsScreen] Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCampaigns();
  }, []);

  // Sort campaigns descending (newest first) so Slide 1 always has the latest 10 campaigns
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime();
    const timeB = new Date(b.createdAt || b.date || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const idA = String(a._id || a.id || '');
    const idB = String(b._id || b.id || '');
    return idB.localeCompare(idA);
  });

  const filteredCampaigns = sortedCampaigns.filter(camp => {
    const matchesSearch = 
      (camp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (camp.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' || (camp.status || 'Sent').toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate slide pagination
  const totalSlides = Math.max(1, Math.ceil(filteredCampaigns.length / ITEMS_PER_SLIDE));

  // Reset to first slide whenever search query or status filter changes
  useEffect(() => {
    setCurrentSlide(1);
  }, [searchTerm, statusFilter]);

  // Ensure currentSlide is within valid range if count changes
  useEffect(() => {
    if (currentSlide > totalSlides) {
      setCurrentSlide(totalSlides);
    }
  }, [totalSlides, currentSlide]);

  const startIndex = (currentSlide - 1) * ITEMS_PER_SLIDE;
  const endIndex = Math.min(startIndex + ITEMS_PER_SLIDE, filteredCampaigns.length);
  const currentSlideCampaigns = filteredCampaigns.slice(startIndex, startIndex + ITEMS_PER_SLIDE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div className="content-card">
        {/* Card Header & Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem', 
          paddingBottom: '1rem', 
          borderBottom: '1px solid var(--border)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Past Campaigns</h2>
            <span className="badge stage-won">
              {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'Campaign' : 'Campaigns'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search campaigns..."
                className="form-input"
                style={{ paddingLeft: '2rem', height: '36px', fontSize: '0.8rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              className="form-select"
              style={{ width: '115px', height: '36px', fontSize: '0.8rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Refresh Button */}
            <button 
              type="button" 
              onClick={refreshCampaigns} 
              className="btn btn-secondary"
              disabled={loading}
              title="Refresh Campaigns"
              style={{ height: '36px', padding: '0 0.6rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            {/* Compose Campaign Button */}
            <button 
              type="button" 
              onClick={onComposeNew} 
              className="btn btn-primary"
              style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '600' }}
            >
              <Send size={13} /> Compose Campaign
            </button>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="table-container" style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', minWidth: '780px' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Campaign & Subject</th>
                <th style={{ width: '22%' }}>Recipients</th>
                <th style={{ width: '13%' }}>Dispatched On</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '12%' }}>Delivery</th>
                <th style={{ width: '13%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <Inbox size={36} style={{ opacity: 0.35, color: 'var(--accent)' }} />
                      <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        {campaigns.length === 0 ? 'No Campaigns Dispatched Yet' : 'No Campaigns Match Your Search'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {campaigns.length === 0 
                          ? 'Create and dispatch your first email campaign via AWS SES.'
                          : 'Try clearing your search query.'}
                      </span>
                      {campaigns.length === 0 && (
                        <button className="btn btn-primary btn-sm" onClick={onComposeNew} style={{ marginTop: '0.5rem' }}>
                          <Send size={13} /> Compose First Campaign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentSlideCampaigns.map(camp => {
                  const sent = camp.sentCount || 0;
                  const delivered = camp.delivered || sent;
                  const recipientSample = camp.recipients && camp.recipients.length > 0
                    ? camp.recipients[0].email
                    : 'All Active Leads';

                  return (
                    <tr key={camp.id || camp._id}>
                      {/* Campaign Name & Subject */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', maxWidth: '300px' }}>
                          <span 
                            style={{ 
                              fontWeight: '600', 
                              color: 'var(--text-primary)', 
                              fontSize: '0.875rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} 
                            title={camp.name}
                          >
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
                                padding: '0.1rem 0.35rem', 
                                borderRadius: '4px',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                flexShrink: 0
                              }}
                              title={`${camp.attachments.length} attachment(s)`}
                            >
                              <Paperclip size={11} /> {camp.attachments.length}
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '0.785rem', 
                          color: 'var(--text-secondary)', 
                          marginTop: '0.25rem',
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={camp.subject}>
                          {camp.subject || 'No Subject'}
                        </div>
                      </td>

                      {/* Recipients */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                          <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={recipientSample}>
                            {recipientSample}
                          </span>
                        </div>
                        {camp.recipients && camp.recipients.length > 1 && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            +{camp.recipients.length - 1} more recipient(s)
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                        {camp.date || (camp.createdAt ? new Date(camp.createdAt).toISOString().split('T')[0] : 'Today')}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${camp.status === 'Failed' ? 'stage-lost' : 'stage-won'}`} style={{ fontSize: '0.725rem', padding: '0.2rem 0.55rem' }}>
                          {camp.status || 'Sent'}
                        </span>
                      </td>

                      {/* Delivery Stats & Engagement */}
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {delivered} / {sent}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                          {camp.opened > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCampaignModal(camp, 'SEEN')}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.675rem',
                                fontWeight: '600',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '0.08rem 0.35rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                cursor: 'pointer'
                              }}
                              title="Click to view all seen emails and names"
                            >
                              <Eye size={10} /> {camp.opened} seen
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {camp.failedCount ? `${camp.failedCount} failed` : '100% delivered'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button 
                          type="button" 
                          onClick={() => handleOpenCampaignModal(camp, 'ALL')}
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '0.32rem 0.7rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                        >
                          <Eye size={12} /> View Logs
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Slide Pagination & Navigation Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingTop: '0.85rem',
          marginTop: '0.85rem',
          borderTop: '1px solid var(--border)'
        }}>
          {/* Slide info & items count */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {filteredCampaigns.length > 0 ? (
              <>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong>–<strong style={{ color: 'var(--text-primary)' }}>{endIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredCampaigns.length}</strong> campaigns
              </>
            ) : (
              <span>0 campaigns</span>
            )}
          </div>

          {/* Slide Buttons */}
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
                      title={`Slide ${slideNum} (Campaigns ${slideStart}–${slideEnd})`}
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

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="content-card" style={{ 
            width: '900px', 
            maxWidth: '94vw', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            padding: '1.75rem 2rem',
            borderRadius: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  {selectedCampaign.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem' }}>
                  <span className={`badge ${selectedCampaign.status === 'Failed' ? 'stage-lost' : 'stage-won'}`} style={{ fontSize: '0.725rem', padding: '0.15rem 0.55rem' }}>
                    {selectedCampaign.status || 'Sent'}
                  </span>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Dispatched on {selectedCampaign.date || (selectedCampaign.createdAt ? new Date(selectedCampaign.createdAt).toISOString().split('T')[0] : 'Today')} via AWS SES
                  </span>
                </div>
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
                        {recipientFilter === 'FAILED' ? '✓ Failed' : 'Failed'}
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
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                          {displayedRecipients.length} of {allRecipients.length} recipient(s)
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
                              fontSize: '0.785rem',
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

            {/* Modal Footer */}
            <div style={{ marginTop: '1.75rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setSelectedCampaign(null)} 
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.825rem' }}
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PastCampaignsScreen;
