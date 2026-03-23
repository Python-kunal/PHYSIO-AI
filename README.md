# PhysioAI

AI-powered physiotherapy and fitness trainer with real-time posture feedback, voice controls, session analytics, and an integrated fitness assistant.

## Overview

PhysioAI combines computer vision, WebSockets, and LLM-based coaching to help users perform exercises with better form.

The app provides:
- Real-time rep counting and corrective feedback using pose landmarks
- Exercise-level workflow (Beginner, Intermediate, Advanced)
- Voice command navigation for hands-free sessions
- Session history tracking in MongoDB
- AI chat assistant for form, recovery, and fitness tips
- Guided tutorial videos for each exercise

## Key Features

### 1) Smart Pose Tracking Engine
- TensorFlow Lite pose model (`pose_landmark_heavy.tflite`)
- Frame-by-frame webcam analysis
- Angle-based exercise validation
- Side-selection based on landmark visibility
- Robust state reset on exercise switch

### 2) Real-Time Coaching (WebSocket)
- Live feedback messages (e.g., `Go Lower`, `Good Rep!`, `Adjust Camera`)
- Instant rep updates while exercising
- Per-exercise logic streamed to frontend every frame cycle

### 3) Multi-Exercise Support
Implemented exercise logic includes:
- Squats
- Pushups
- Lunges
- Cobra
- Straight Leg Raise
- Knee-to-Chest
- Wall Sits
- Glute Bridge
- Russian Twists

Frontend also includes tutorial mapping for:
- Single Leg Squats

### 4) Difficulty-Based Training Paths
- Beginner
- Intermediate
- Advanced

Each level has a curated menu with exercise cards and quick start flow.

### 5) Voice Commands
Built-in browser speech recognition allows users to:
- Navigate views (`go home`, `open menu`, `go to levels`)
- Select level (`beginner`, `intermediate`, `advanced`)
- Start exercises (`squat`, `pushup`, `cobra`, etc.)
- End sessions (`finish`, `quit`, `stop session`)

### 6) Session Analytics
Live workout dashboard shows:
- Reps
- Calories estimate
- Session timer
- Current feedback status
- Exercise history by user

### 7) User Authentication
- Signup/Login endpoints
- Password hashing with bcrypt (`passlib`)
- MongoDB-backed user records

### 8) AI Fitness Assistant (Gemini)
- In-app chat window
- Context-aware responses using current workout stats
- Helpful fallback response when model/API is unavailable

## Tech Stack

### Frontend
- React 19
- Vite
- react-webcam
- Browser APIs: SpeechRecognition, SpeechSynthesis, WebSocket

### Backend
- FastAPI
- OpenCV
- TensorFlow Lite
- NumPy
- PyMongo
- Passlib (bcrypt)
- Google Generative AI (Gemini)

### Database
- MongoDB (local instance expected at `mongodb://localhost:27017/`)

## Project Structure

```text
PhysioAI/
├── main.py                     # FastAPI backend + REST + WebSocket
├── pose_estimator.py           # Pose inference and exercise logic
├── models/
│   └── pose_landmark_heavy.tflite
├── client/                     # Primary React frontend
│   ├── src/
│   │   └── App.jsx
│   └── package.json
├── PhysioAI/                   # Additional Vite app scaffold
└── README.md
```

## API and Socket Endpoints

### REST
- `POST /signup`
- `POST /login`
- `POST /save_session`
- `GET /get_history?username=<name>`
- `POST /ask_ai`

### WebSocket
- `WS /ws`
- Receives:
  - text payload for exercise selection
  - binary image frames from frontend webcam
- Sends:
  - JSON feedback and reps

## Local Setup

## 1) Backend Setup (FastAPI)

1. Create and activate virtual environment.
2. Install dependencies:

```bash
pip install fastapi uvicorn opencv-python numpy tensorflow pymongo passlib[bcrypt] google-generativeai pydantic
```

3. Make sure MongoDB is running locally.
4. Start backend server:

```bash
uvicorn main:app --reload
```

Backend default URL: `http://127.0.0.1:8000`

## 2) Frontend Setup (React)

1. Open a second terminal and move to frontend folder:

```bash
cd client
```

2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

## 3) Open App

Open the Vite URL (usually `http://localhost:5173`) and start training.

## Configuration Notes

- Current backend code contains a hardcoded Gemini API key. For production, move it to an environment variable.
- CORS is currently open (`allow_origins=["*"]`) for easy local testing.
- Webcam and microphone permissions must be allowed in browser for full functionality.

## Current Limitations

- No JWT/session-token auth yet (basic login flow only)
- No Docker setup yet
- AI chat quality depends on Gemini API availability
- Exercise logic is heuristic-based and camera-angle sensitive

## Roadmap Ideas

- JWT auth and protected routes
- Profile dashboard with progress charts
- Personalized plans by injury/recovery stage
- Multi-language voice commands
- Cloud deployment + CI/CD

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

Built with ❤️ to make rehabilitation and home training smarter, safer, and more engaging.
