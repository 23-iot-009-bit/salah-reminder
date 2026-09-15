# 🕌 Salah Reminder

A full-stack Node.js and Express web application designed to help Muslims track and maintain their daily prayer (Salah) habits. The application integrates automated location-based prayer timing calculation via the Aladhan API, automated email notifications, 1-click attendance check-ins, and a visual dashboard for tracking prayer consistency.

---

## 🌟 Features

- **User Authentication:** Secure user registration and login powered by JWT (JSON Web Tokens) and bcrypt password hashing.
- **Location-Based Prayer Timings:** Automatic retrieval of daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) based on the user's registered city and country using the Aladhan API.
- **Automated Email Reminders:** Background cron jobs (`node-cron`) inspect user prayer times in real-time aligned with the user's city timezone:
  - **Initial Prayer Email:** Sent at the start of each prayer time.
  - **30-Minute Follow-Up Check-in:** Sent 30 minutes after initial reminder featuring 1-click attendance buttons (`Yes, I prayed ✅` / `No, I missed it ❌`).
  - **Sunday Weekly Performance Summary:** Sent every Sunday night summarizing weekly completion percentages and stats.
- **Interactive Dashboard:**
  - View real-time status badges for today's 5 prayers (`Pending`, `Reminder Sent`, `Done ✅`, `Missed ❌`, `No Response ⏳`).
  - Displays Gregorian and Hijri calendar dates.
  - Includes a 7-day visual attendance progress chart.
- **Zero-Config In-Memory Fallback:** Built-in hybrid storage architecture that seamlessly falls back to an in-memory store if MongoDB is unavailable, ensuring zero downtime.

---

## 🛠️ Technologies Used

### Backend
- **Node.js** & **Express.js** — Server runtime & REST API framework
- **MongoDB** & **Mongoose** — Database and ODM (Object Data Modeling)
- **JSON Web Token (jwt)** & **bcryptjs** — Authentication and password security
- **Nodemailer** — Transporter for email notifications
- **node-cron** — Scheduled background tasks and cron jobs
- **Axios** — HTTP client for fetching external API data
- **dotenv** — Environment variable management

### Frontend
- **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**
- **FontAwesome 6** — Iconography

---

## 📁 Project Structure

```text
salah-reminder/
├── backend/
│   ├── config/
│   │   ├── db.js             # MongoDB connection & fallback handler
│   │   └── nodemailer.js     # Nodemailer transporter configuration
│   ├── controllers/
│   │   ├── attendanceController.js  # Attendance marking & dashboard summary logic
│   │   ├── authController.js        # User signup & login controllers
│   │   └── salahController.js       # Prayer times endpoint controller
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT protection middleware
│   ├── models/
│   │   ├── AttendanceLog.js         # User attendance log schema & fallback
│   │   ├── NotificationTracker.js   # Prayer notification tracking schema & fallback
│   │   └── User.js                  # User model schema & fallback
│   ├── .env.example                 # Example environment variables
│   ├── package.json                 # Backend dependencies & scripts
│   └── server.js                    # Express app entry point & static server
├── frontend/
│   ├── css/
│   │   └── style.css                # Application stylesheet
│   ├── js/
│   │   ├── auth.js                  # Auth form handlers
│   │   ├── confirmation.js          # Email check-in response page handler
│   │   └── dashboard.js             # Dashboard UI logic & API calls
│   ├── confirmation.html            # 1-click check-in confirmation page
│   ├── dashboard.html               # Main user dashboard page
│   ├── index.html                   # Landing page
│   ├── login.html                   # Sign in page
│   └── register.html                # Sign up page
└── README.md                        # Project documentation
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory based on `backend/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/salah_reminder
JWT_SECRET=your_jwt_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
SERVER_URL=http://localhost:5000
```

---

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Optional — the app defaults to an in-memory store if MongoDB is not connected)

### 1. Clone & Install Dependencies

Navigate to the `backend` folder and install the required npm packages:

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` folder (see [Environment Variables](#%EF%B8%8F-environment-variables) above).

---

## 🏃 Running the Application

### Development Mode (with Nodemon)
```bash
cd backend
npm run dev
```

### Production / Standard Mode
```bash
cd backend
npm start
```

Once running, the application will serve the static frontend automatically:
- **Frontend & App Interface:** `http://localhost:5000`
- **Backend API Base URL:** `http://localhost:5000/api`

---

## 📡 API Endpoints Overview

### Authentication (`/api`)
- `POST /api/register` — Register a new user (`fullName`, `email`, `password`, `city`, `country`).
- `POST /api/login` — Authenticate user & receive JWT token.

### Salah Times (`/api`)
- `GET /api/salah-times` — Fetch daily prayer times, Hijri date, and Gregorian date for the authenticated user (Requires JWT Bearer Header).

### Attendance (`/api/attendance`)
- `GET /api/attendance/mark` — 1-click check-in endpoint invoked directly from email links (`user`, `prayer`, `date`, `status`).
- `GET /api/attendance/today` — Retrieve today's prayer status list & past 7-day progress for the dashboard (Requires JWT Bearer Header).
- `GET /api/attendance/history` — Fetch user attendance logs history (Requires JWT Bearer Header).

### System Status (`/api`)
- `GET /api/status` — Server health check.

---

## 📌 Important Notes

1. **Gmail App Passwords:** If using Gmail for `EMAIL_USER`, ensure you generate a 16-character **App Password** via your Google Account Security settings instead of using your account's primary password.
2. **MongoDB Fallback:** If `MONGO_URI` is not reachable or fails to connect, the application will automatically switch to built-in memory storage, allowing full zero-config evaluation.
3. **Timezone Accuracy:** Prayer time comparisons in cron jobs automatically resolve to each user's city timezone using metadata from the Aladhan API and Node's `Intl` API.
