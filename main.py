from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pose_estimator import PoseEstimator
import cv2
import numpy as np
import json
from pymongo import MongoClient
from passlib.context import CryptContext
import google.generativeai as genai
import os

app = FastAPI()

# --- GEMINI SETUP ---
# Yahan apni API KEY daalna mat bhoolna!
GEMINI_API_KEY = "AIzaSyAjo6m1Ts-VjidFV_NS3s06nwfjMpHVPO4"
try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash') # Ya 'gemini-pro' jo apke liye work kare
except:
    print("⚠️ Gemini API Key missing or invalid.")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE ---
try:
    client = MongoClient("mongodb://localhost:27017/")
    db = client["physio_db"]
    users_collection = db["users"]
    sessions_collection = db["sessions"]
    print("✅ Connected to MongoDB!")
except:
    print("❌ MongoDB Not Connected")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
estimator = PoseEstimator()

# --- MODELS ---
class UserSignup(BaseModel):
    name: str; email: str; password: str

class UserLogin(BaseModel):
    email: str; password: str

class SessionData(BaseModel):
    username: str; exercise: str; reps: int; calories: float; duration: str

class ChatRequest(BaseModel):
    message: str; context: dict

# --- ROUTES ---
@app.post("/signup")
def signup(user: UserSignup):
    if users_collection.find_one({"email": user.email}): raise HTTPException(400, "Email exists")
    users_collection.insert_one({"name": user.name, "email": user.email, "password": pwd_context.hash(user.password)})
    return {"status": "success", "name": user.name}

@app.post("/login")
def login(user: UserLogin):
    u = users_collection.find_one({"email": user.email})
    if not u or not pwd_context.verify(user.password, u["password"]): raise HTTPException(400, "Invalid credentials")
    return {"status": "success", "name": u["name"]}

@app.post("/save_session")
def save_session(data: SessionData):
    session_dict = data.dict()
    # 🔥 Add Current Date here
    session_dict["date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sessions_collection.insert_one(session_dict)
    return {"status": "saved"}

@app.get("/get_history")
def get_history(username: str):
    return list(sessions_collection.find({"username": username}, {"_id": 0}).sort("_id", -1))

@app.post("/ask_ai")
def ask_ai(req: ChatRequest):
    try:
        prompt = f"User is doing {req.context.get('exercise')}. Stats: {req.context.get('reps')} Reps. Question: {req.message}. Give short fitness advice."
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except:
        return {"reply": "I'm having trouble connecting to AI right now."}

# --- 🔥 WEBSOCKET (Connection Fix) 🔥 ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Reset estimator state on new connection
    estimator.reset_state()
    current_exercise = "Squats"

    try:
        while True:
            # 1. Receive Data
            message = await websocket.receive()

            # 2. Handle Text (Exercise Change)
            if "text" in message:
                data = json.loads(message["text"])
                if "exercise" in data:
                    current_exercise = data["exercise"]
                    estimator.reset_state() # Reset count on change

            # 3. Handle Image (Frame Processing)
            if "bytes" in message:
                nparr = np.frombuffer(message["bytes"], np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is not None:
                    # Logic Run Karo
                    result = estimator.process_frame(frame, current_exercise)
                    # Result Wapas Bhejo
                    await websocket.send_text(json.dumps(result))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()