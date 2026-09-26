import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function QRScannerModal({ isOpen, onClose, user }) {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Unique DOM ID for the reader element
    const scannerId = "reader";
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      qrConfig,
      async (decodedText) => {
        // Prevent duplicate simultaneous submissions
        if (isProcessing) return;
        setIsProcessing(true);

        try {
          // Stop camera stream once detected
          await html5QrCode.stop();
          
          // Save attendance record in Firestore
          await addDoc(collection(db, 'attendance'), {
            userId: user.uid,
            userEmail: user.email,
            qrData: decodedText,
            timestamp: serverTimestamp()
          });

          setScanResult(`Check-in successful! Logged at: ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          setError('Failed to record attendance: ' + err.message);
        } finally {
          setIsProcessing(false);
        }
      },
      (errorMessage) => {
        // Continuous frame errors are normal while seeking a QR code; safely ignored
      }
    ).catch((err) => {
      setError("Unable to access camera. Please allow camera permissions.");
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content scanner-modal">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>Gym Check-In</h2>
        <p className="scanner-instruction">Align the gym entrance QR code inside the box</p>

        {error && <div className="auth-error">{error}</div>}
        
        {scanResult ? (
          <div className="scan-success">
            <div className="success-icon">✓</div>
            <p>{scanResult}</p>
            <button className="cta-btn submit-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div id="reader" className="reader-container"></div>
        )}
      </div>
    </div>
  );
}