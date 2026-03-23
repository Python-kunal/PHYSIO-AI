import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000';

// --- CONFIGURATION ---
const VIDEO_IDS = {
  'Squats': 'MVMMA05cx_U',
  'Pushups': 'IODxDxX7oi4',
  'Lunges': 'QOVaHwm-Q6U',
  'Cobra': 'JDcdhTuycOI',
  'Straight Leg Raise': 'l4kQd9eWclE',
  'Knee-to-Chest': 'bJ_q4d7jWjQ',
  'Wall Sits': 'XULOKw4E4P4',
  'Glute Bridge': 'O-a7rB1_i4E',
  'Single Leg Squats': 'hUZpC1tXqK8',
  'Russian Twists': 'wkD8rjkodUI'
};

const EXERCISE_LEVELS = {
  'Beginner': [
    { id: 'Cobra', icon: '🐍', label: 'Cobra Pose', desc: 'Spine Flexibility' },
    { id: 'Straight Leg Raise', icon: '🦵', label: 'Leg Raise', desc: 'Lower Abs' },
    { id: 'Knee-to-Chest', icon: '🛌', label: 'Knee to Chest', desc: 'Back Relief' },
    { id: 'Squats', icon: '🏋️', label: 'Basic Squats', desc: 'Leg Strength' }
  ],
  'Intermediate': [
    { id: 'Squats', icon: '🏋️', label: 'Deep Squats', desc: 'Glutes & Quads' },
    { id: 'Wall Sits', icon: '🧱', label: 'Wall Sits', desc: 'Leg Hold' },
    { id: 'Glute Bridge', icon: '🌉', label: 'Glute Bridge', desc: 'Posterior Chain' },
    { id: 'Lunges', icon: '🧘', label: 'Lunges', desc: 'Balance' }
  ],
  'Advanced': [
    { id: 'Pushups', icon: '💪', label: 'Pushups', desc: 'Upper Body' },
    { id: 'Single Leg Squats', icon: '🦿', label: '1-Leg Squat', desc: 'Elite Balance' },
    { id: 'Russian Twists', icon: '🌪️', label: 'Russian Twists', desc: 'Core' },
    { id: 'Lunges', icon: '⚡', label: 'Power Lunges', desc: 'Explosive' }
  ]
};

const App = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [aiContext, setAiContext] = useState({ exercise: 'Resting', reps: 0, calories: 0 });

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState("");

  // Refs
  const recognitionRef = useRef(null);
  const levelRef = useRef(selectedLevel);
  const viewRef = useRef(currentView);

  useEffect(() => { levelRef.current = selectedLevel; }, [selectedLevel]);
  useEffect(() => { viewRef.current = currentView; }, [currentView]);

  // --- VOICE CONTROL ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log("🎤 Command:", transcript);
      setLastCommand(transcript);

      const currentLvl = levelRef.current;

      // Navigation
      if (transcript.includes('go home') || transcript.includes('landing')) setCurrentView('landing');
      else if (transcript.includes('open menu') || transcript.includes('go to levels')) setCurrentView('levels');
      else if (transcript.includes('login')) setCurrentView('login');
      else if (transcript.includes('stop session') || transcript.includes('finish') || transcript.includes('quit')) setCurrentView('levels');
      else if (transcript.includes('logout')) {
         if (window.confirm("Logout?")) { setCurrentUser(null); setSelectedLevel(null); setCurrentView('landing'); }
      }

      // Levels
      else if (transcript.includes('beginner')) { setSelectedLevel('Beginner'); setCurrentView('menu'); }
      else if (transcript.includes('intermediate')) { setSelectedLevel('Intermediate'); setCurrentView('menu'); }
      else if (transcript.includes('advanced')) { setSelectedLevel('Advanced'); setCurrentView('menu'); }

      // Exercises
      else {
        let exerciseToStart = null;
        if (transcript.includes('squat')) exerciseToStart = 'Squats';
        else if (transcript.includes('pushup') || transcript.includes('push up')) exerciseToStart = 'Pushups';
        else if (transcript.includes('cobra')) exerciseToStart = 'Cobra';
        else if (transcript.includes('lunge')) exerciseToStart = 'Lunges';
        else if (transcript.includes('wall sit')) exerciseToStart = 'Wall Sits';
        else if (transcript.includes('bridge')) exerciseToStart = 'Glute Bridge';
        else if (transcript.includes('twist')) exerciseToStart = 'Russian Twists';
        else if (transcript.includes('leg raise')) exerciseToStart = 'Straight Leg Raise';
        else if (transcript.includes('knee to chest')) exerciseToStart = 'Knee-to-Chest';

        if (exerciseToStart) {
          if (!currentLvl) setSelectedLevel('Beginner');
          setSelectedExercise(exerciseToStart);
          setCurrentView('session');
        }
      }
      setTimeout(() => setLastCommand(""), 3000);
    };

    recognition.onerror = (event) => { if (event.error === 'not-allowed') alert("⚠️ Allow Mic Access!"); };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (error) { console.debug('Speech recognition start skipped:', error); }
    return () => { try { recognition.stop(); } catch (error) { console.debug('Speech recognition stop skipped:', error); } };
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else try { recognitionRef.current.start(); } catch (error) { console.debug('Speech recognition restart skipped:', error); }
  };

  const goHome = () => setCurrentView('landing');
  const handleStart = () => currentUser ? setCurrentView('levels') : setCurrentView('login');
  const handleLoginSuccess = (name) => { setCurrentUser(name); setCurrentView('landing'); };
  const goBackToLevels = () => { setSelectedLevel(null); setCurrentView('levels'); };
  const logout = () => { if (window.confirm("Logout?")) { setCurrentUser(null); setSelectedLevel(null); setCurrentView('landing'); }};

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="blob-container"><div className="blob blob-1"></div><div className="blob blob-2"></div><div className="blob blob-3"></div></div>

      {/* Voice Indicator */}
      <div
        onClick={toggleMic}
        style={{
          position: 'fixed', bottom: '30px', left: '30px', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(10, 10, 10, 0.7)', padding: '12px 24px', borderRadius: '50px',
          border: isListening ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isListening ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 10px 30px rgba(0,0,0,0.3)',
          cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isListening ? 'scale(1.05)' : 'scale(1)'
        }}
        title="Voice Control"
      >
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isListening ? '#10b981' : '#ef4444', boxShadow: isListening ? '0 0 10px #10b981' : 'none', animation: isListening ? 'pulse-dot 1.5s infinite' : 'none' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>VOICE COMMAND</span>
          <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{isListening ? (lastCommand || "Listening...") : "Tap to Activate"}</span>
        </div>
      </div>

      {currentView === 'landing' && (
        <LandingPage
          isLoggedIn={!!currentUser}
          userName={currentUser}
          onLogout={logout}
          onLoginClick={() => setCurrentView('login')}
          onSignupClick={() => setCurrentView('signup')}
          onStart={handleStart}
        />
      )}

      {(currentView === 'login' || currentView === 'signup') && <AuthPage type={currentView} onSwitch={() => setCurrentView(currentView === 'login' ? 'signup' : 'login')} onSuccess={handleLoginSuccess} onBack={goHome} />}
      {currentView === 'levels' && <LevelSelection userName={currentUser} onSelectLevel={(lvl) => { setSelectedLevel(lvl); setCurrentView('menu'); }} onLogout={logout} onBack={goHome} />}
      {currentView === 'menu' && <ExerciseMenu level={selectedLevel} onSelect={(ex) => { setSelectedExercise(ex); setCurrentView('session'); }} onBack={goBackToLevels} />}

      {currentView === 'session' && (
        <TrainerSession
          initialExercise={selectedExercise}
          level={selectedLevel || 'Beginner'}
          currentUser={currentUser}
          onEnd={() => { setCurrentView('levels'); setAiContext({ exercise: 'Resting', reps: 0, calories: 0, page: 'Menu' }); }}
          setGlobalContext={setAiContext}
        />
      )}

      <AIAssistant context={{ ...aiContext, page: currentView }} />

      <style>{`@keyframes pulse-dot { 0% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.5; transform: scale(0.9); } }`}</style>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const LandingPage = ({ onStart, onLoginClick, onSignupClick, isLoggedIn, userName, onLogout }) => (
  <>
    <div className="auth-nav">
      {!isLoggedIn ? (
        <>
          <button className="nav-btn-base nav-btn-login" onClick={onLoginClick}>🔐 Login</button>
          <button className="nav-btn-base nav-btn-signup" onClick={onSignupClick}>✨ Sign Up</button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 15px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '30px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>{userName}</span>
          </div>
          <button className="nav-btn-base" onClick={onLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>Logout ✕</button>
        </>
      )}
    </div>

    <div className="neon-box" style={{ textAlign: 'center', padding: '80px 50px', maxWidth: '900px', width: '90%', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '25px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'inline-block' }}>✨ NEXT GEN FITNESS AI</div>
      <h1 style={{ fontSize: '4.5rem', margin: '0', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-1px' }}>
        Master Your Form <br />
        <span style={{ backgroundImage: 'linear-gradient(to right, #10b981, #3b82f6)', backgroundClip: 'text', color: 'transparent' }}>Train Like a Pro</span>
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#9ca3af', maxWidth: '600px', lineHeight: '1.6', margin: '0' }}>Real-time skeleton tracking, voice coaching, and personalized recovery plans powered by Gemini AI. No equipment needed.</p>
      <button onClick={onStart} style={{ marginTop: '20px', padding: '18px 45px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '50px', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.6)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 40px -10px rgba(16, 185, 129, 0.8)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(16, 185, 129, 0.6)'; }}>
        {isLoggedIn ? "Go to Dashboard" : "Start Your Journey"}
        <span style={{ fontSize: '1.2rem' }}>→</span>
      </button>
    </div>
  </>
);

const LevelSelection = ({ userName, onSelectLevel, onLogout, onBack }) => (
  <div className="selection-container" style={{ textAlign: 'center' }}>
    <button onClick={onBack} style={{ position: 'absolute', top: '40px', left: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(5px)', fontSize: '0.9rem' }}>← Home</button>
    <div style={{ position: 'absolute', top: '40px', right: '40px', display: 'flex', alignItems: 'center', gap: '15px' }}>
       <span style={{ color: '#10b981', fontWeight: 'bold' }}>👤 {userName}</span>
       <button onClick={onLogout} style={{ background: 'rgba(255,50,50,0.2)', border: '1px solid #f87171', color: '#fff', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem' }}>Logout</button>
    </div>
    <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Choose Difficulty</h2>
    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '40px' }}>
      <div className="level-card beginner" onClick={() => onSelectLevel('Beginner')} style={levelCardStyle('#10b981')}><div style={{ fontSize: '3rem' }}>🌱</div><h3>Beginner</h3></div>
      <div className="level-card intermediate" onClick={() => onSelectLevel('Intermediate')} style={levelCardStyle('#fbbf24')}><div style={{ fontSize: '3rem' }}>🔥</div><h3>Intermediate</h3></div>
      <div className="level-card advanced" onClick={() => onSelectLevel('Advanced')} style={levelCardStyle('#ef4444')}><div style={{ fontSize: '3rem' }}>⚡</div><h3>Advanced</h3></div>
    </div>
  </div>
);

const levelCardStyle = (color) => ({ background: `rgba(255,255,255,0.05)`, border: `1px solid ${color}`, padding: '30px', borderRadius: '20px', width: '220px', cursor: 'pointer', transition: 'transform 0.3s', boxShadow: `0 0 15px ${color}20` });

const ExerciseMenu = ({ level, onSelect, onBack }) => {
  const exercises = EXERCISE_LEVELS[level] || [];
  return (
    <div className="selection-container" style={{ textAlign: 'center' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: '40px', left: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer' }}>← Change Level</button>
      <h2 style={{ fontSize: '3rem', marginBottom: '10px', fontWeight: '800' }}>{level} Exercises</h2>
      <div className="exercises-grid" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {exercises.map((ex) => (
          <div key={ex.id} className="big-exercise-card" onClick={() => onSelect(ex.id)}>
            <div className="big-card-icon">{ex.icon}</div><h3>{ex.label}</h3><p>{ex.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuthPage = ({ type, onSwitch, onSuccess, onBack }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const handleSubmit = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (res.ok) { type === 'signup' ? (alert("Account created! Login now."), onSwitch()) : onSuccess(data.name); } else setError(data.detail || "Error");
    } catch { setError("Server error"); }
  };
  return (
    <div className="neon-box" style={{ padding: '50px', maxWidth: '450px', textAlign: 'center' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>←</button>
      <h2 style={{ fontSize: '2rem' }}>{type === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
      <div className="auth-container">
        {type === 'signup' && <input className="auth-input" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />}
        <input className="auth-input" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
        <input className="auth-input" placeholder="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
        {error && <div style={{color: '#f87171'}}>{error}</div>}
        <button className="auth-btn-submit" onClick={handleSubmit}>{type === 'login' ? 'Login' : 'Sign Up'}</button>
      </div>
      <div className="switch-auth-text"><span className="switch-link" onClick={onSwitch}>{type === 'login' ? 'Sign Up' : 'Login'}</span></div>
    </div>
  );
};

const TrainerSession = ({ initialExercise, level, onEnd, currentUser, setGlobalContext }) => {
  const webcamRef = useRef(null);
  const [feedback, setFeedback] = useState("Connecting...");
  const [reps, setReps] = useState(0);
  const [status, setStatus] = useState("neutral");
  const [calories, setCalories] = useState(0);
  const [timer, setTimer] = useState(0);
  const wsRef = useRef(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [history, setHistory] = useState([]);
  const lastSpokenRef = useRef("");

  useEffect(() => {
    setGlobalContext({ exercise: initialExercise, reps: reps, calories: calories, page: 'Session' });
  }, [reps, calories, initialExercise, setGlobalContext]);

  const handleStopSession = async () => {
    if (reps > 0) {
      try {
        await fetch(`${API_BASE_URL}/save_session`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser, exercise: `${initialExercise} (${level})`, reps: reps, calories: parseFloat(calories), duration: formatTime(timer) })
        });
      } catch (e) { console.error(e); }
    }
    onEnd();
  };

  useEffect(() => {
    const fetchHistory = async () => { try { const res = await fetch(`${API_BASE_URL}/get_history?username=${currentUser}`); setHistory(await res.json()); } catch (e) { console.error(e); } };
    fetchHistory();
  }, [currentUser]);

  useEffect(() => { const i = setInterval(() => setTimer(p => p + 1), 1000); return () => clearInterval(i); }, []);
  const formatTime = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  const speak = (msg) => { if (!window.speechSynthesis || lastSpokenRef.current === msg) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(msg); u.rate = 1.0; u.pitch = 1.1; window.speechSynthesis.speak(u); lastSpokenRef.current = msg; };

  useEffect(() => {
    const s = new WebSocket(`${WS_BASE_URL}/ws`);
    s.onopen = () => { s.send(JSON.stringify({ exercise: initialExercise })); speak(`Starting ${level} ${initialExercise}.`); };
    s.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setFeedback(d.feedback); setReps(d.reps); setCalories((d.reps * 0.4).toFixed(1));
      if (d.feedback.includes("Good")) setStatus("good"); else if (d.feedback.includes("Step") || d.feedback.includes("Show")) setStatus("bad"); else setStatus("neutral");
      if (d.feedback !== "No Body Detected" && d.feedback !== lastSpokenRef.current) speak(d.feedback);
    };
    wsRef.current = s;
    return () => {
      s.close();
      wsRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, [initialExercise, level]);

  useEffect(() => {
    const i = setInterval(() => {
      const socket = wsRef.current;
      if (webcamRef.current && socket && socket.readyState === WebSocket.OPEN) {
        const src = webcamRef.current.getScreenshot();
        if (src) {
          const b = window.atob(src.split(',')[1]);
          const u = new Uint8Array(b.length);
          for (let j = 0; j < b.length; j++) u[j] = b.charCodeAt(j);
          socket.send(u.buffer);
        }
      }
    }, 100);
    return () => clearInterval(i);
  }, []);

  const borderColor = status === 'good' ? '#4ade80' : status === 'bad' ? '#f87171' : '#fbbf24';
  const filteredHistory = history.filter(item => item.exercise.includes(initialExercise));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '95%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>PhysioAI <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>● {level.toUpperCase()}</span></h2>
        <button onClick={handleStopSession} style={{ padding: '8px 20px', background: 'rgba(255,50,50,0.2)', color: 'white', border: '1px solid #f87171', borderRadius: '20px', cursor: 'pointer' }}>Finish ✕</button>
      </div>
      <div className="dashboard-grid">
        <div className="sidebar-panel">
           <h3 style={{color:'#888', fontSize:'0.9rem', marginBottom:'20px'}}>STATS</h3>
           <div className="stat-card"><div style={{fontSize:'2.5rem', fontWeight:'bold'}}>{reps}</div><div style={{color:'#aaa', fontSize:'0.8rem'}}>REPS</div></div>
           <div className="stat-card"><div style={{fontSize:'1.5rem', fontWeight:'bold', color: '#fbbf24'}}>{calories}</div><div style={{color:'#aaa', fontSize:'0.8rem'}}>CALORIES</div></div>
           <div className="stat-card"><div style={{fontSize:'1.5rem', fontFamily: 'monospace'}}>{formatTime(timer)}</div><div style={{color:'#aaa', fontSize:'0.8rem'}}>DURATION</div></div>
           <button className="tutorial-btn" onClick={() => setShowTutorial(true)}><span>🎥</span> Watch Tutorial</button>
        </div>
        <div style={{ position: 'relative', border: `2px solid ${borderColor}`, borderRadius: '20px', overflow: 'hidden', boxShadow: `0 0 30px ${borderColor}40` }}>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width="100%" height="100%" style={{ objectFit: 'cover', height: '100%' }} mirrored={true} />
          <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: borderColor, color: '#000', padding: '10px 40px', borderRadius: '30px', fontSize: '1.5rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{feedback}</div>
        </div>
        <div className="sidebar-panel">
          <h3 style={{color:'#888', fontSize:'0.9rem', marginBottom:'10px'}}>HISTORY</h3>
           <div className="history-list">
               {/* 🔥 HERE IS THE CRASH FIX 🔥 */}
               {filteredHistory.map((item, index) => (
                 <div key={index} style={{marginBottom:'10px', borderBottom: '1px solid #333', paddingBottom: '5px', fontSize: '0.85rem'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      {/* Safety Check: If date is missing, show 'Today' */}
                      <span style={{color:'#fff'}}>{item.date ? item.date.split(' ')[0] : "Today"}</span>
                      <span style={{color:'#10b981'}}>{item.reps} Reps</span>
                   </div>
                   <div style={{fontSize:'0.7rem', color:'#888'}}>{item.exercise}</div>
                 </div>
               ))}
           </div>
        </div>
      </div>
      {showTutorial && <div className="modal-overlay" onClick={() => setShowTutorial(false)}><div className="modal-content"><button className="close-modal-btn" onClick={() => setShowTutorial(false)}>✕</button><div className="video-wrapper"><iframe src={`https://www.youtube.com/embed/${VIDEO_IDS[initialExercise]}`} allowFullScreen></iframe></div></div></div>}
    </div>
  );
};

const AIAssistant = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Hey there! I’m your AI Trainer. Ask me about your form, diet, or recovery! ⚡' }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/ask_ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: context })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Brain freeze! 🥶 Can you check my internet?" }]);
    }
    setLoading(false);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen]);

  return (
    <>
      <div className="ai-assistant-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ai-icon-svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ai-icon-svg"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M4 11v2a8 8 0 0 0 16 0v-2"></path><circle cx="12" cy="11" r="1"></circle><circle cx="20" cy="4" r="2"></circle><path d="M9 22h6"></path><path d="M12 16v6"></path></svg>}
      </div>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg> PhysioAI Trainer</div>
            <button className="close-chat" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (<div key={i} className={`msg ${m.role}`}>{m.text}</div>))}
            {loading && <div className="msg ai" style={{display:'flex', gap:'5px', alignItems:'center'}}><span className="dot" style={{animation:'bounce 1s infinite 0s'}}>●</span><span className="dot" style={{animation:'bounce 1s infinite 0.2s'}}>●</span><span className="dot" style={{animation:'bounce 1s infinite 0.4s'}}>●</span></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask about form, diet..." autoFocus />
            <button className="send-btn" onClick={sendMessage} disabled={loading}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'-2px'}}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;