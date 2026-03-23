from datetime import datetime
from typing import Any, cast
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pose_estimator import PoseEstimator
import cv2
import numpy as np
import json
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from passlib.context import CryptContext
import google.generativeai as genai

app = FastAPI()

# --- GEMINI SETUP ---
# Yahan apni API KEY daalna mat bhoolna!
GEMINI_API_KEY = "AIzaSyAjo6m1Ts-VjidFV_NS3s06nwfjMpHVPO4"
model: Any | None = None
try:
    configure = getattr(genai, "configure")
    generative_model = getattr(genai, "GenerativeModel")
    configure(api_key=GEMINI_API_KEY)
    model = generative_model('gemini-2.5-flash') # Ya 'gemini-pro' jo apke liye work kare
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
users_collection: Collection[dict[str, Any]] | None = None
sessions_collection: Collection[dict[str, Any]] | None = None
try:
    client: MongoClient[dict[str, Any]] = MongoClient("mongodb://localhost:27017/")
    db: Database[dict[str, Any]] = client["physio_db"]
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
    message: str; context: dict[str, Any]


def get_collections() -> tuple[Collection[dict[str, Any]], Collection[dict[str, Any]]]:
    if users_collection is None or sessions_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    return users_collection, sessions_collection

# --- ROUTES ---
@app.post("/signup")
def signup(user: UserSignup) -> dict[str, str]:
    user_col, _ = get_collections()
    if user_col.find_one({"email": user.email}):
        raise HTTPException(400, "Email exists")
    user_col.insert_one({"name": user.name, "email": user.email, "password": pwd_context.hash(user.password)})
    return {"status": "success", "name": user.name}

@app.post("/login")
def login(user: UserLogin) -> dict[str, str]:
    user_col, _ = get_collections()
    u = user_col.find_one({"email": user.email})
    if not u or not pwd_context.verify(user.password, cast(str, u["password"])):
        raise HTTPException(400, "Invalid credentials")
    return {"status": "success", "name": cast(str, u["name"])}

@app.post("/save_session")
def save_session(data: SessionData) -> dict[str, str]:
    _, session_col = get_collections()
    session_dict = data.model_dump()
    # 🔥 Add Current Date here
    session_dict["date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    session_col.insert_one(session_dict)
    return {"status": "saved"}

@app.get("/get_history")
def get_history(username: str) -> list[dict[str, Any]]:
    _, session_col = get_collections()
    history = list(session_col.find({"username": username}, {"_id": 0}).sort("_id", -1))
    return history

@app.post("/ask_ai")
def ask_ai(req: ChatRequest) -> dict[str, str]:
    if model is None:
        return {"reply": "I'm having trouble connecting to AI right now."}
    try:
        prompt = f"User is doing {req.context.get('exercise', 'workout')}. Stats: {req.context.get('reps', 0)} Reps. Question: {req.message}. Give short fitness advice."
        response = model.generate_content(prompt)
        return {"reply": cast(str, response.text)}
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
            if "text" in message and message["text"] is not None:
                data = cast(dict[str, Any], json.loads(cast(str, message["text"])))
                if "exercise" in data:
                    current_exercise = cast(str, data["exercise"])
                    estimator.reset_state() # Reset count on change

            # 3. Handle Image (Frame Processing)
            if "bytes" in message and message["bytes"] is not None:
                nparr = np.frombuffer(cast(bytes, message["bytes"]), np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                estimator_runtime = cast(Any, estimator)
                # Logic Run Karo
                result = cast(dict[str, Any], estimator_runtime.process_frame(frame, current_exercise))
                # Result Wapas Bhejo
                await websocket.send_text(json.dumps(result))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()