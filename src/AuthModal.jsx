import React, { useState } from 'react';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDocs, 
  updateDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Log in existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
        onClose();
      } else {
        // 1. Verify invite code in Firestore (matched to lowercase 'invitecodes')
        const inviteQuery = query(
          collection(db, 'invitecodes'),
          where('code', '==', inviteCode.trim().toUpperCase()),
          where('status', '==', 'unused')
        );
        const querySnapshot = await getDocs(inviteQuery);

        if (querySnapshot.empty) {
          throw new Error('Invalid or already used invite code.');
        }

        const inviteDoc = querySnapshot.docs[0];
        const inviteData = inviteDoc.data();

        // 2. Create Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 3. Mark invite code as used
        await updateDoc(doc(db, 'invitecodes', inviteDoc.id), {
          status: 'used',
          usedBy: user.uid,
          usedAt: serverTimestamp()
        });

        // 4. Create member profile in Firestore
        await setDoc(doc(db, 'members', user.uid), {
          uid: user.uid,
          email: user.email,
          fullName: fullName,
          plan: inviteData.plan || 'Standard',
          role: 'member',
          status: 'active',
          createdAt: serverTimestamp()
        });

        onLoginSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>{isLogin ? 'Member Login' : 'Activate Membership'}</h2>
        
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Invite Code</label>
                <input 
                  type="text" 
                  required 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value)} 
                  placeholder="e.g. WELCOME100"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="user@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="cta-btn submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Activate Account')}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? "Have an invite code? " : "Already activated? "}
          <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up here' : 'Sign in here'}
          </span>
        </p>
      </div>
    </div>
  );
}