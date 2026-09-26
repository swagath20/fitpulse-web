import React, { useState, useEffect } from 'react';
import './App.css';
import AuthModal from './AuthModal';
import QRScannerModal from './QRScannerModal';
import MemberDashboard from './MemberDashboard';
import OwnerDashboard from './OwnerDashboard';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen to member profile in Firestore for dynamic role
        const memberRef = doc(db, 'members', user.uid);
        const unsubscribeRole = onSnapshot(memberRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role || 'member');
          } else {
            setUserRole('member');
          }
        });
        return () => unsubscribeRole();
      } else {
        setUserRole(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const plans = [
    {
      name: 'Monthly Pass',
      price: '$49',
      period: '/month',
      featured: false,
      features: ['Full Gym Access', 'Locker Room Access', 'Free Wi-Fi', 'Standard Check-In']
    },
    {
      name: 'Quarterly Pro',
      price: '$129',
      period: '/3 months',
      featured: true,
      badge: 'Most Popular',
      features: ['All Monthly Features', '1 Free PT Session', 'Progress & BMI Tracker', 'QR Fast Check-In']
    },
    {
      name: 'Annual Elite',
      price: '$449',
      period: '/year',
      featured: false,
      features: ['All Quarterly Features', 'Unlimited Guest Passes', 'Diet Consultation', '24/7 Priority Support']
    }
  ];

  return (
    <div>
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      {currentUser && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          user={currentUser}
        />
      )}

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">PULSE GYM</div>
        <div className="nav-links">
          <a href="#plans">Plans</a>
          <a href="#contact">Location</a>
          {currentUser ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {userRole !== 'owner' && (
                <button className="checkin-btn" onClick={() => setIsScannerOpen(true)}>
                  Check In 📷
                </button>
              )}
              <button className="login-btn" onClick={handleLogout}>Log Out</button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setIsAuthOpen(true)}>Member Login</button>
          )}
        </div>
      </nav>

      {/* Role-Based Dashboard View */}
      {currentUser ? (
        userRole === 'owner' ? (
          <OwnerDashboard />
        ) : (
          <MemberDashboard user={currentUser} />
        )
      ) : (
        <header className="hero">
          <h1>UNLEASH YOUR <span>STRENGTH</span></h1>
          <p>
            State-of-the-art equipment, personalized progress tracking, and 
            seamless QR attendance management.
          </p>
          <a href="#plans" className="cta-btn">View Membership Plans</a>
        </header>
      )}

      {/* Pricing Section */}
      <section id="plans" className="pricing-section">
        <h2 className="section-title">Membership Plans</h2>
        <p className="section-subtitle">Choose the plan that matches your fitness goals</p>
        
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
              {plan.badge && <span className="badge">{plan.badge}</span>}
              <div>
                <h3>{plan.name}</h3>
                <div className="price">{plan.price}<span>{plan.period}</span></div>
                <ul className="features-list">
                  {plan.features.map((feat, idx) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>
              <button className="plan-btn" onClick={() => setIsAuthOpen(true)}>Get Started</button>
            </div>
          ))}
        </div>
      </section>

      {/* Contact / Location Section */}
      <section id="contact" className="contact-section">
        <h2 className="section-title">Visit Our Facility</h2>
        <p className="section-subtitle">Drop by or get in touch with our front desk</p>
        
        <div className="contact-info">
          <div className="info-box">
            <h3>📍 Location</h3>
            <p>124 Fitness Boulevard</p>
            <p>Metro Center, Suite 400</p>
          </div>
          <div className="info-box">
            <h3>⏰ Working Hours</h3>
            <p>Mon - Fri: 5:00 AM - 11:00 PM</p>
            <p>Sat - Sun: 6:00 AM - 9:00 PM</p>
          </div>
          <div className="info-box">
            <h3>📞 Contact</h3>
            <p>+1 (555) 019-2834</p>
            <p>contact@pulsefitness.com</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>© {new Date().getFullYear()} Pulse Gym Management. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;