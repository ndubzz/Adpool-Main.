# AdPool — Fund Ads. Earn Returns.

Full-stack web app: investors fund brand ad campaigns and earn proportional returns on sales generated.

## Tech Stack
- **Backend**: Node.js + Express + MongoDB (Mongoose) + JWT Auth + Stripe
- **Frontend**: React + React Router + Axios + Zustand
- **Database**: MongoDB Atlas (free tier)
- **Hosting**: Render.com (backend) + Vercel (frontend)

## Project Structure
```
adpool/
├── backend/          ← Express API server
│   ├── models/       ← MongoDB schemas
│   ├── routes/       ← API endpoints
│   ├── middleware/   ← Auth, validation
│   ├── server.js     ← Entry point
│   └── package.json
├── frontend/         ← React app
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── utils/
│   └── package.json
└── README.md
```

## Quick Start (Local)
```bash
# 1. Clone your repo
git clone https://github.com/YOUR_USERNAME/adpool.git
cd adpool

# 2. Backend setup
cd backend
cp .env.example .env
# Fill in your .env values (MongoDB URI, JWT secret, Stripe keys)
npm install
npm run dev

# 3. Frontend setup (new terminal)
cd ../frontend
cp .env.example .env
# Fill in your .env values
npm install
npm start
```

## Deploy
See deployment instructions at bottom of README.

---
Built with ❤️ by AdPool
