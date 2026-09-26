import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function MemberDashboard({ user }) {
  const [attendanceDates, setAttendanceDates] = useState(new Set());
  const [streak, setStreak] = useState(0);
  const [progressLogs, setProgressLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [currentDate] = useState(new Date());

  // 1. Fetch In-App Announcements & Auto-Expire after 10 Hours
  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tenHoursAgo = Date.now() - (10 * 60 * 60 * 1000); // 10 hours window
      const list = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.timestamp) {
          const itemTime = data.timestamp.toMillis();
          // Keep only announcements created within the last 10 hours
          if (itemTime >= tenHoursAgo) {
            list.push({ id: docSnap.id, ...data });
          }
        }
      });

      setAnnouncements(list);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Attendance Logs & Compute Streak
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dates = new Set();
      const rawDates = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.timestamp) {
          const dateObj = data.timestamp.toDate();
          const dateStr = dateObj.toISOString().split('T')[0];
          dates.add(dateStr);
          rawDates.push(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime());
        }
      });

      setAttendanceDates(dates);
      calculateStreak(rawDates);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Progress Logs
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'progress'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          ...data,
          dateLabel: data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now'
        });
      });
      setProgressLogs(logs);
    });

    return () => unsubscribe();
  }, [user]);

  const calculateStreak = (timestamps) => {
    if (!timestamps.length) {
      setStreak(0);
      return;
    }

    const uniqueSorted = Array.from(new Set(timestamps)).sort((a, b) => b - a);
    const oneDayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    let currentStreak = 0;
    let expectedDate = todayMidnight;

    if (uniqueSorted[0] !== expectedDate) {
      if (uniqueSorted[0] === expectedDate - oneDayMs) {
        expectedDate -= oneDayMs;
      } else {
        setStreak(0);
        return;
      }
    }

    for (let ts of uniqueSorted) {
      if (ts === expectedDate) {
        currentStreak++;
        expectedDate -= oneDayMs;
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  const liveBmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  }, [weight, height]);

  const handleLogProgress = async (e) => {
    e.preventDefault();
    if (!weight || !height) return;

    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    const calculatedBmi = parseFloat((w / (h * h)).toFixed(1));

    await addDoc(collection(db, 'progress'), {
      userId: user.uid,
      weight: w,
      height: parseFloat(height),
      bmi: calculatedBmi,
      timestamp: serverTimestamp()
    });

    setWeight('');
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const chartData = {
    labels: progressLogs.map(log => log.dateLabel),
    datasets: [
      {
        label: 'Weight (kg)',
        data: progressLogs.map(log => log.weight),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'BMI',
        data: progressLogs.map(log => log.bmi),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
      y: {
        type: 'linear',
        position: 'left',
        ticks: { color: '#38bdf8' },
        grid: { color: '#1e293b' },
        title: { display: true, text: 'Weight (kg)', color: '#38bdf8' }
      },
      y1: {
        type: 'linear',
        position: 'right',
        ticks: { color: '#f59e0b' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'BMI', color: '#f59e0b' }
      }
    }
  };

  return (
    <div className="dashboard-container">
      {/* Announcements Noticeboard (Auto-expires after 10 Hours) */}
      {announcements.length > 0 && (
        <div className="announcements-container">
          <div className="announcement-header">
            <h3>📢 Gym Announcements & Updates</h3>
          </div>
          <div className="announcements-list">
            {announcements.slice(0, 3).map((item) => (
              <div key={item.id} className="announcement-card">
                <div className="announcement-top">
                  <strong>{item.title}</strong>
                  <span className="announcement-date">
                    {item.timestamp ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
                <p className="announcement-message">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <h2>Member Performance Hub</h2>
        <div className="streak-badge">
          🔥 <span className="streak-count">{streak}</span> Day Streak
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Attendance Calendar */}
        <div className="dash-card">
          <h3>{monthName} {year} Attendance</h3>
          <div className="calendar-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} className="calendar-day-label">{d}</span>
            ))}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hasAttended = attendanceDates.has(dateStr);

              return (
                <div 
                  key={dayNum} 
                  className={`calendar-day ${hasAttended ? 'attended' : ''}`}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span className="legend-dot attended-dot"></span> Checked In
            <span className="legend-dot"></span> Rest / Missed
          </div>
        </div>

        {/* BMI Logger */}
        <div className="dash-card">
          <h3>Log Body Metrics</h3>
          <form onSubmit={handleLogProgress} className="metrics-form">
            <div className="form-group">
              <label>Height (cm)</label>
              <input 
                type="number" 
                required 
                placeholder="e.g. 175" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                required 
                placeholder="e.g. 72.5" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            {liveBmi && (
              <div className="bmi-preview">
                Computed BMI: <strong>{liveBmi}</strong>
              </div>
            )}

            <button type="submit" className="cta-btn submit-btn">Log Measurement</button>
          </form>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="dash-card chart-card">
        <h3>Weight & BMI Evolution</h3>
        <div className="chart-wrapper">
          {progressLogs.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <p className="no-data">No metrics recorded yet. Log your first measurement above!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberDashboard;