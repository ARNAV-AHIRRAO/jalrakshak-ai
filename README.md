# JalRakshak AI

JalRakshak AI is a water management and intelligence platform.

## Project Structure

```
JalRakshakAI/
├── frontend/    # React + Vite + Tailwind CSS v4 frontend
└── backend/     # Node.js + Express backend
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
npm install
npm run dev
```
The Express server will start on `http://localhost:5000`.

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server will start on `http://localhost:5173`.

## Available Scripts

### Frontend (`/frontend`)
- `npm run dev`: Starts the Vite dev server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.

### Backend (`/backend`)
- `npm run dev`: Starts the Express server with nodemon for auto-reloading.
- `npm start`: Starts the Express server in production mode.
