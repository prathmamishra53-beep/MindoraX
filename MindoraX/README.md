# MindoraX 🌐

> A modern full-stack social media platform built with React, Node.js, Express, and MongoDB.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Security](#security)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Node.js + Express.js + TypeScript |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Auth** | JWT (access + refresh tokens) + bcrypt |
| **File Uploads** | Multer (disk storage) |
| **Validation** | Zod (backend) + react-hook-form (frontend) |
| **Testing** | Jest + Supertest (backend) |

---

## Project Structure

```
MindoraX/
├── client/               # React + TypeScript frontend (Vite)
│   └── src/
│       ├── api/          # Axios instance + interceptors
│       ├── components/   # Reusable UI components
│       ├── context/      # AuthContext (global auth state)
│       ├── pages/        # Login, Register, Profile, Home
│       ├── types/        # Shared TypeScript interfaces
│       └── utils/        # Zod schemas, validators
│
├── server/               # Node + Express backend
│   └── src/
│       ├── config/       # DB connection, Multer config
│       ├── controllers/  # Auth & User controllers
│       ├── middleware/   # JWT auth, rate limiter, error handler
│       ├── models/       # User Mongoose model
│       ├── routes/       # API route definitions
│       └── utils/        # Token helpers, Zod validators
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm v9+
- A MongoDB Atlas account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/MindoraX.git
cd MindoraX
```

### 2. Set up the Backend

```bash
cd server
npm install

# Copy the example env file and fill in your values
cp .env.example .env
```

Edit `server/.env` with your MongoDB Atlas URI and JWT secrets (see [Environment Variables](#environment-variables)).

```bash
# Start the development server
npm run dev
```

The backend will start on **http://localhost:5000**.

### 3. Set up the Frontend

```bash
cd client
npm install

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:5173**.

---

## Environment Variables

Create `server/.env` based on `server/.env.example`:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | long random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | different long random string |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CLIENT_URL` | Frontend URL (for CORS) | `http://localhost:5173` |

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`.

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Login and receive tokens |
| `POST` | `/api/auth/logout` | Yes | Logout and clear session |
| `POST` | `/api/auth/refresh` | Cookie | Refresh access token |

### User Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | Yes | Get own profile |
| `PATCH` | `/api/users/me` | Yes | Update display name |
| `POST` | `/api/users/me/avatar` | Yes | Upload profile picture |

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

### Register — `POST /api/auth/register`

**Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "displayName": "John Doe"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Account created",
  "data": {
    "user": {
      "id": "...",
      "username": "john_doe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "profilePicture": "",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbG..."
  }
}
```

---

## Running Tests

```bash
cd server
npm test
```

Tests cover:
- User registration (valid/invalid inputs)
- User login (correct/wrong credentials)
- Protected route enforcement
- Profile fetch and update

---

## Security

| Concern | Implementation |
|---|---|
| Password hashing | bcrypt with salt rounds = 12 |
| Token storage | Access token: memory/Authorization header; Refresh: httpOnly secure cookie |
| Token expiry | Access: 15 min · Refresh: 7 days (rotated on use) |
| Brute force | express-rate-limit (10 req/15 min on login endpoint) |
| Injection | express-mongo-sanitize strips `$` and `.` operators |
| XSS / headers | Helmet.js sets all security headers |
| Input validation | Zod schemas on every API endpoint |
| CORS | Restricted to `CLIENT_URL` only |

---

## License

MIT © MindoraX Team

## Community + Media Upgrade

This build connects the community flow to real MongoDB users instead of demo users. Discover/Search now returns relationship status; Add Friend persists a relationship; requests can be accepted/declined from Community; notifications are persisted and delivered live through Socket.IO; public user profiles show relationship actions and public posts; and the composer has a visible photo/video upload control with previews and the existing Cloudinary upload pipeline.

### Run locally
1. Copy `server/.env.example` to `server/.env` and fill in your MongoDB, JWT and Cloudinary values.
2. Run `npm install` in `server` and `client`.
3. In `server`, run `npm run dev`.
4. In `client`, run `npm run dev`.
