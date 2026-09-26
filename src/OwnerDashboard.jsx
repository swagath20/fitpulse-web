import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export default function OwnerDashboard() {
  const [members, setMembers] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Invite Generator State
  const [newCode, setNewCode] = useState('');
  const [newPlan, setNewPlan] = useState('Monthly Pass');
  const [generatedSuccess, setGeneratedSuccess] = useState('');

  // Announcement State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // 1. Real-time Members List (CRM)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'members'), (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMembers(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Attendance Feed for Today
  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todayLogs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.timestamp && data.timestamp.toDate() >= startOfToday) {
          todayLogs.push({ id: docSnap.id, ...data });
        }
      });
      setAttendanceToday(todayLogs);
    });
    return () => unsubscribe();
  }, []);

  // Helper: Generate Random Alphanumeric Code (e.g. PULSE-8X92K)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars like 0/O, 1/I
    let result = 'PULSE-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(result);
  };

  // Generate Invite Code Submission
  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    try {
      await addDoc(collection(db, 'invitecodes'), {
        code: newCode.trim().toUpperCase(),
        plan: newPlan,
        status: 'unused',
        createdAt: serverTimestamp()
      });
      setGeneratedSuccess(`Code "${newCode.toUpperCase()}" created for ${newPlan}!`);
      setNewCode('');
      setTimeout(() => setGeneratedSuccess(''), 4000);
    } catch (err) {
      alert('Error creating code: ' + err.message);
    }
  };

  // Broadcast Announcement
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementBody.trim()) return;

    try {
      await addDoc(collection(db, 'announcements'), {
        title: announcementTitle.trim(),
        message: announcementBody.trim(),
        timestamp: serverTimestamp()
      });
      setBroadcastSuccess('Announcement broadcasted to all members!');
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setTimeout(() => setBroadcastSuccess(''), 4000);
    } catch (err) {
      alert('Error broadcasting: ' + err.message);
    }
  };

  // Mark as Paid / Extend Subscription
  const handleExtendPlan = async (memberId, currentExpiry, monthsToAdd) => {
    try {
      let baseDate = new Date();
      if (currentExpiry && currentExpiry.toDate() > baseDate) {
        baseDate = currentExpiry.toDate();
      }
      
      const newExpiry = new Date(baseDate.setMonth(baseDate.getMonth() + monthsToAdd));

      await updateDoc(doc(db, 'members', memberId), {
        status: 'active',
        planExpiresAt: Timestamp.fromDate(newExpiry),
        lastPaymentAt: serverTimestamp()
      });
    } catch (err) {
      alert('Failed to extend membership: ' + err.message);
    }
  };

  // Filtered members for search
  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      (m.fullName && m.fullName.toLowerCase().includes(term)) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      (m.plan && m.plan.toLowerCase().includes(term))
    );
  });

  return (
    <div className="owner-dashboard">
      <div className="owner-header">
        <h2>Gym Management & Operations (Owner Console)</h2>
      </div>

      {/* Top Section: Live Check-ins + Quick Operations */}
      <div className="owner-grid">
        {/* Live Attendance Stream */}
        <div className="owner-card">
          <h3>⚡ Today's Live Check-Ins ({attendanceToday.length})</h3>
          <div className="live-feed">
            {attendanceToday.length === 0 ? (
              <p className="empty-text">No check-ins recorded yet today.</p>
            ) : (
              attendanceToday.map((att) => (
                <div key={att.id} className="feed-item">
                  <div>
                    <strong>{att.userEmail}</strong>
                    <div className="feed-time">
                      {att.timestamp ? att.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                  <span className="feed-badge">Checked In</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite Code Generator */}
        <div className="owner-card">
          <h3>🎟️ Generate Invite Code</h3>
          {generatedSuccess && <div className="success-banner">{generatedSuccess}</div>}
          <form onSubmit={handleGenerateCode} className="owner-form">
            <div className="form-group">
              <label>Custom / Generated Code</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="e.g. SUMMER50" 
                  value={newCode} 
                  onChange={(e) => setNewCode(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="pay-btn" 
                  style={{ whiteSpace: 'nowrap', padding: '0 0.85rem' }} 
                  onClick={generateRandomCode}
                  title="Generate a random code"
                >
                  🎲 Random
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Assigned Plan</label>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}>
                <option value="Monthly Pass">Monthly Pass</option>
                <option value="Quarterly Pro">Quarterly Pro</option>
                <option value="Annual Elite">Annual Elite</option>
              </select>
            </div>
            <button type="submit" className="cta-btn submit-btn">Create Code</button>
          </form>
        </div>

        {/* Broadcast Announcement */}
        <div className="owner-card">
          <h3>📢 Broadcast Announcement</h3>
          {broadcastSuccess && <div className="success-banner">{broadcastSuccess}</div>}
          <form onSubmit={handleBroadcast} className="owner-form">
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                placeholder="Holiday Hours / Maintenance..." 
                value={announcementTitle} 
                onChange={(e) => setAnnouncementTitle(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea 
                rows="2" 
                placeholder="Type your message for all members..." 
                value={announcementBody} 
                onChange={(e) => setAnnouncementBody(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="cta-btn submit-btn">Broadcast Now</button>
          </form>
        </div>
      </div>

      {/* Bottom Section: Members CRM Table */}
      <div className="owner-card crm-card">
        <div className="crm-header">
          <h3>👥 Member Directory & Subscriptions ({filteredMembers.length})</h3>
          <input 
            type="text" 
            className="crm-search" 
            placeholder="Search by name, email, or plan..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Expiry Date</th>
                <th>Payment / Extension</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-text">No members found matching your search.</td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const expiryText = m.planExpiresAt 
                    ? m.planExpiresAt.toDate().toLocaleDateString() 
                    : 'Not set';

                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="member-name">{m.fullName || 'Unnamed'}</div>
                        <div className="member-email">{m.email}</div>
                      </td>
                      <td><span className="plan-pill">{m.plan || 'Standard'}</span></td>
                      <td>
                        <span className={`status-pill ${m.status === 'active' ? 'active' : 'expired'}`}>
                          {m.status || 'active'}
                        </span>
                      </td>
                      <td>{expiryText}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="pay-btn" 
                            onClick={() => handleExtendPlan(m.id, m.planExpiresAt, 1)}
                            title="Extend 1 Month"
                          >
                            +1 Mo
                          </button>
                          <button 
                            className="pay-btn" 
                            onClick={() => handleExtendPlan(m.id, m.planExpiresAt, 3)}
                            title="Extend 3 Months"
                          >
                            +3 Mo
                          </button>
                          <button 
                            className="pay-btn" 
                            onClick={() => handleExtendPlan(m.id, m.planExpiresAt, 12)}
                            title="Extend 1 Year"
                          >
                            +1 Yr
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
    </div>
  );
}