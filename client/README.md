# PhysioAI Frontend (React + Vite)

This folder contains the main web client for PhysioAI.

## What This Frontend Includes

- Modern landing page and auth flow (login/signup)
- Level-based exercise selection (Beginner/Intermediate/Advanced)
- Live trainer session view with webcam feed
- Real-time exercise feedback via WebSocket
- Rep count, calories estimate, and session timer
- Voice command control (navigation + exercise start)
- Tutorial modal with embedded exercise videos
- AI assistant chat panel for form and recovery guidance

## Scripts

```bash
npm run dev      # Start Vite development server
npm run build    # Build production bundle
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Local Run

1. Install dependencies:

```bash
npm install
```

2. Start frontend:

```bash
npm run dev
```

3. Ensure backend is running at:

`http://127.0.0.1:8000`

## Main File

- `src/App.jsx` contains the primary app flow and session UI.

## Note

For full project setup and backend instructions, see root README in this repository.
