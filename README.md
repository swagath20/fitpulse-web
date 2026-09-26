# 🏋️ FitPulse — Gym Operations & Member Performance Platform

A full-stack gym management platform featuring role-based access control, an interactive member portal with biometric progress analytics, real-time check-in streaming, and an owner operations console for subscription billing and broadcasts.

## 🎬 Demo Walkthroughs

### 👤 Member Portal
https://github.com/swagath20/fitpulse-web/raw/main/demo.mp4

### 🛠️ Owner Operations Console
https://github.com/swagath20/fitpulse-web/raw/main/demoowner.mp4

---

## 📖 Overview

FitPulse lets gym owners streamline day-to-day operations — attendance monitoring, member subscription management, dynamic promo codes, and real-time announcements — without a third-party SaaS subscription.

Members get a self-serve portal to track attendance streaks, log biometrics and see auto-calculated BMI, visualize trends over time, and stay informed on facility updates in real time.

This project was built as a self-directed learning project, from zero prior HTML/JS experience, using an AI-assisted, step-by-step build process.

---

## ✨ Features

### 👤 Member Performance Hub
- **Interactive Attendance Calendar** — visual check-in calendar with automatic consecutive-streak calculation.
- **QR Check-In** — in-browser camera scan of the gym's entrance QR code, stamping attendance automatically.
- **Biometric Evolution Tracker** — logs height and weight, auto-calculates BMI, and renders interactive trend charts (Chart.js).
- **Real-Time Noticeboard** — live in-app broadcast feed with automatic 10-hour expiration on facility alerts.
- **Onboarding & Authentication** — secure registration via a one-time, owner-issued invite code, followed by standard email/password login.
- **Membership Status** — days remaining on the current plan, with expiration alerts.

### 🛠️ Owner Operations Console
- **Live Attendance Stream** — real-time, synchronized feed of members checking in today, plus daily visitor counts.
- **Searchable Member CRM** — filterable member registry showing plan tier, active status, contact info, and expiration date.
- **Subscription Management** — one-click "Mark as Paid" renewal controls (`+1 Mo`, `+3 Mo`, `+1 Yr`) that log payment history.
- **Invite Code Engine** — generate custom promo codes or randomized single-use invite codes (`PULSE-XXXXX`) for new member registration.
- **Live Announcement Dispatch** — broadcast holiday schedules and alerts instantly across all active member dashboards.
- **Automated Lockout Rule** — accounts unpaid for 6+ months automatically switch to `deactivated`, revoking access without deleting historical data.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Styling | CSS3 (Glassmorphic Dark UI) |
| Backend / Database | Cloud Firestore (NoSQL) |
| Authentication | Firebase Authentication (Email/Password) |
| Scheduled logic | Firebase Cloud Functions (automated lockout) |
| QR Scanning | html5-qrcode |
| Analytics & Visualization | Chart.js, react-chartjs-2 |
| Security | Firestore Security Rules (RBAC) |
| Hosting | Firebase Hosting / Vercel |
| Version Control | Git, GitHub |

---

## 🗂️ Project Structure

```
fitpulse-web/
├── public/                  # Static assets & icons
├── src/
│   ├── App.css              # Glassmorphism design system & component styles
│   ├── App.jsx               # Root router, auth listener & role coordinator
│   ├── AuthModal.jsx         # Email/password modal & invite code validator
│   ├── firebase.js           # Firebase App, Auth & Firestore initialization
│   ├── index.css              # Global layout & baseline CSS variables
│   ├── main.jsx                # React root mount
│   ├── MemberDashboard.jsx     # Attendance streaks, BMI charts & noticeboard
│   ├── OwnerDashboard.jsx      # Live feed, member CRM & invite generator
│   ├── QRScannerModal.jsx      # Member check-in interface
│   └── functions/                # Cloud Functions source (automated lockout)
├── firestore.rules             # Security rules enforcing RBAC
├── .env.local                   # Local environment credentials (git-ignored)
├── .env.example                  # Template showing required variable names
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org) v18 or higher
- Git installed on your machine
- A free [Firebase](https://console.firebase.google.com) account and project

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/fitpulse-web.git
cd fitpulse-web
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the example file and fill in your Firebase project's keys (Firebase Console → Project Settings → General):
```bash
cp .env.example .env.local
```
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
`.env.local` is git-ignored by default — your keys are never pushed to GitHub. `src/firebase.js` reads from these variables rather than hardcoding any values, so the file is safe to commit.

### 4. Enable Firebase services
In the Firebase console for your project, enable:
- **Authentication** → Email/Password sign-in method
- **Firestore Database** → start in test mode, then apply `firestore.rules` before going live

### 5. Apply Firestore Security Rules
Copy the contents of `firestore.rules` into Firebase Console → Firestore Database → Rules tab, and click **Publish**.

### 6. Start the development server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 7. Deploy (optional)
```bash
firebase deploy
```
or connect the GitHub repo to Vercel for automatic deploys on every push.

---

## 🗃️ Data Model (Cloud Firestore)

| Collection | Description |
|---|---|
| `members/` | Profile documents keyed by `uid` — `fullName`, `email`, `role` (`"member"` \| `"owner"`), `plan`, `planExpiresAt`, `status` |
| `attendance/` | Check-in records — `{ userId, userEmail, timestamp }` |
| `progress/` | Biometric logs — `{ userId, height, weight, bmi, timestamp }` |
| `invitecodes/` | Promo/invite codes — `{ code, plan, status: "unused" \| "used", createdAt }` |
| `announcements/` | Broadcast alerts — `{ title, message, timestamp, expiresAt }` |
| `payments/` | Billing history log — `{ memberId, amount, method, date }` |

---

## 🔒 Security Architecture

Role-Based Access Control (RBAC) is enforced at the database layer via Firestore Security Rules, not just hidden in the UI:

- Regular members have read/write access restricted strictly to their own profile, biometric progress, and check-in logs.
- Privilege escalation is explicitly blocked — members cannot assign themselves the `owner` role or extend their own subscription dates.
- Only authenticated accounts with `role == 'owner'` can issue invite codes, modify subscription terms, or write global announcements.

---

## 🗺️ Roadmap / Future Improvements

- [ ] Push notifications for expiring memberships
- [ ] CSV export of member data for the owner
- [ ] Light mode toggle
- [ ] Basic analytics (daily visitor trend chart)

---

## 📚 Key Technical Learnings

- **Role-Based Access Control (RBAC):** architected Firestore Security Rules to prevent client-side privilege escalation while dynamically mounting separate UI dashboards based on user role.
- **Real-Time Data Streams:** used Firestore `onSnapshot` listeners to render real-time check-in feeds and live announcements without manual polling or page reloads.
- **Dynamic Biometric Tracking:** integrated Chart.js with dual-axis visualization to model non-linear metric trends (weight vs. calculated BMI) over dynamic time periods.
- *(Keep adding to this section as you build — it's one of the most valuable parts for interviews.)*

---

## 👤 Author

[Your Name] — built as a self-directed learning project.
[LinkedIn] · [Portfolio] · [Email]

---

## 📄 License

MIT License — free to use, modify, and adapt for learning purposes.