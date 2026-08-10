# Mutual Transfer Partner Finder

A full-stack web application for Indian government employees to find mutual transfer partners across districts.

## Features

- **User Registration** with Name, Employee ID, Designation (GDS/Departmental), Contact, Current & Required Districts
- **90-Day Auto-Expiry** — MongoDB TTL index automatically deletes expired entries
- **Duplicate Prevention** — Employee ID uniqueness enforced at database level
- **Mutual Search** — Finds employees whose current district matches your required district (and vice versa)
- **Contact Masking** — Only last 4 digits visible until disclaimer is accepted
- **Eye Icon + Disclaimer Modal** — Legal agreement before contact reveal
- **Light/Dark Theme** — Persistent across sessions
- **Rate Limiting** — Prevents spam registrations and abuse
- **Responsive Design** — Works on mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | MongoDB (with Mongoose ODM) |
| Frontend | Vanilla HTML/CSS/JS (no frameworks needed) |
| Security | Helmet, CORS, Express Rate Limit |

## Project Structure

```
mutual-transfer-app/
├── server.js              # Express server entry point
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── README.md              # This file
├── models/
│   └── Employee.js        # Mongoose schema with TTL index
├── routes/
│   └── employees.js       # API routes (register, search, listings, stats)
└── public/
    └── index.html         # Complete frontend application
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register a new transfer request |
| GET | `/api/search?current=X&required=Y&designation=Z` | Search mutual partners |
| GET | `/api/listings` | Get all active listings |
| GET | `/api/stats` | Get platform statistics |
| DELETE | `/api/listings/:id` | Delete a specific listing |
| DELETE | `/api/clear` | Clear all data (admin) |

## Deployment Guide

### Step 1: Get a MongoDB Database (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new cluster (M0 Sandbox is free forever)
3. Create a database user with a password
4. Add your server's IP to the Network Access whitelist (or allow from anywhere `0.0.0.0/0` for testing)
5. Click "Connect" → "Drivers" → "Node.js" → Copy the connection string
6. Replace `<password>` with your actual password in the string

### Step 2: Choose a Hosting Platform

#### Option A: Render (Recommended - Free)
1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repo or upload files directly
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Add `MONGODB_URI` with your Atlas connection string
5. Click "Create Web Service" — done!

#### Option B: Railway (Free)
1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project → Deploy from GitHub repo
3. Add environment variable `MONGODB_URI`
4. Railway auto-detects Node.js and deploys

#### Option C: Heroku (Free tier discontinued, use paid or alternatives above)

#### Option D: VPS / Own Server
```bash
# 1. Install Node.js (v18+)
# 2. Clone/upload the project
# 3. Install dependencies
npm install

# 4. Create .env file
cp .env.example .env
# Edit .env and add your MONGODB_URI

# 5. Start the server
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start server.js --name "mutual-transfer"
```

### Step 3: Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mutual_transfer?retryWrites=true&w=majority
PORT=3000
```

### Step 4: Verify Deployment

Once deployed, visit your app's URL. You should see the homepage with stats. Try registering a test entry and searching for it.

## Local Development

```bash
# 1. Clone the project
cd mutual-transfer-app

# 2. Install dependencies
npm install

# 3. Start MongoDB locally (or use MongoDB Atlas)
# If using local MongoDB, make sure it's running on port 27017

# 4. Create .env
cp .env.example .env
# Edit .env to use local MongoDB: mongodb://localhost:27017/mutual_transfer

# 5. Run development server with auto-reload
npm run dev

# 6. Open http://localhost:3000 in your browser
```

## Security Notes

- The `/api/clear` endpoint has no authentication in this version. For production, add an admin auth middleware.
- Rate limiting is configured: 100 requests per 15 minutes per IP, 10 registrations per hour per IP.
- Helmet.js sets secure HTTP headers.
- Input validation and sanitization are handled on both frontend and backend.
- Phone numbers are masked in search results; full numbers only shown after disclaimer acceptance.

## License

MIT
