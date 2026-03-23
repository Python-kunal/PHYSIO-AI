import tensorflow as tf
import cv2
import numpy as np
import time

class PoseEstimator:
    def __init__(self, model_path="models/pose_landmark_heavy.tflite"):
        try:
            self.interpreter = tf.lite.Interpreter(model_path=model_path)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            self.input_shape = self.input_details[0]['shape']
            self.height = self.input_shape[1]
            self.width = self.input_shape[2]
            print("✅ AI Model Loaded (Anti-Sitting Logic Active)")
        except Exception as e:
            print(f"❌ Model Error: {e}")

        self.current_exercise = ""
        self.stage = "neutral"
        self.counter = 0
        self.hold_start_time = None
        self.last_feedback = ""
        self.feedback_time = 0

    def reset_state(self):
        self.stage = "neutral"
        self.counter = 0
        self.hold_start_time = None
        self.last_feedback = "Ready"

    def calculate_angle(self, a, b, c):
        a, b, c = np.array(a), np.array(b), np.array(c)
        radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
        angle = np.abs(radians*180.0/np.pi)
        if angle > 180.0: angle = 360-angle
        return angle

    # 🔥 NEW: Check if body is Sitting/Standing (Vertical)
    def is_body_vertical(self, lm):
        # Y-coordinate increases downwards (0 is top, 1 is bottom)
        # If Shoulders are significantly HIGHER (smaller Y) than Hips, body is vertical.
        shoulder_y = (lm[11]['y'] + lm[12]['y']) / 2
        hip_y = (lm[23]['y'] + lm[24]['y']) / 2

        # Threshold 0.2 means significant vertical distance
        return (hip_y - shoulder_y) > 0.2

    # 🔥 NEW: Strict Visibility Checker
    def check_visibility(self, lm, indices):
        for i in indices:
            if lm[i]['visibility'] < 0.4: # Strict threshold to prevent guessing
                return False
        return True

    def get_best_side_points(self, lm, left_indices, right_indices):
        left_score = sum([lm[i]['visibility'] for i in left_indices])
        right_score = sum([lm[i]['visibility'] for i in right_indices])

        best_indices = left_indices if left_score > right_score else right_indices

        # Safety: If even the best side is barely visible, return None
        if max(left_score, right_score) < 1.0: # Sum of 3 points should be decent
            return None

        points = []
        for idx in best_indices:
            points.append([lm[idx]['x'], lm[idx]['y']])
        return points

    def process_frame(self, frame, exercise_type):
        if exercise_type != self.current_exercise:
            self.current_exercise = exercise_type
            self.reset_state()

        img_resized = cv2.resize(frame, (self.width, self.height))
        input_data = np.expand_dims(cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB), axis=0).astype(np.float32) / 255.0
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()
        output_data = self.interpreter.get_tensor(self.output_details[0]['index'])

        lm = []
        raw = output_data.flatten()
        for i in range(33):
            o = i * 5
            lm.append({'x': raw[o], 'y': raw[o+1], 'z': raw[o+2], 'visibility': raw[o+3]})

        # Global Safety Check: Face or Shoulders must be visible
        if lm[0]['visibility'] < 0.3 and lm[11]['visibility'] < 0.3:
             return {"feedback": "No User", "reps": self.counter}

        # Routing
        if exercise_type == "Cobra": feedback = self.check_cobra(lm)
        elif exercise_type == "Squats": feedback = self.check_squats(lm)
        elif exercise_type == "Pushups": feedback = self.check_pushups(lm)
        elif exercise_type == "Straight Leg Raise": feedback = self.check_leg_raise(lm)
        elif exercise_type == "Lunges": feedback = self.check_lunges(lm)
        elif exercise_type == "Knee-to-Chest": feedback = self.check_knee_to_chest(lm)
        elif exercise_type == "Wall Sits": feedback = self.check_wall_sit(lm)
        elif exercise_type == "Glute Bridge": feedback = self.check_glute_bridge(lm)
        elif exercise_type == "Russian Twists": feedback = self.check_russian_twists(lm)
        else: feedback = "Ready"

        # Ultra-Stable Feedback
        if feedback != self.last_feedback:
            if "Good" in feedback or "Perfect" in feedback or (time.time() - self.feedback_time > 1.2):
                self.last_feedback = feedback
                self.feedback_time = time.time()

        return {"feedback": self.last_feedback, "reps": self.counter}

    # --- 🏋️‍♂️ EXERCISE LOGIC (ANTI-SITTING ENABLED) ---

    def check_cobra(self, lm):
        # 1. Anti-Ghosting: Are you sitting?
        if self.is_body_vertical(lm):
            return "Lie on Stomach" # Sitting blocked!

        # 2. Visibility: Are hips visible?
        if not self.check_visibility(lm, [23, 24]):
            return "Adjust Camera"

        pts = self.get_best_side_points(lm, [11, 23, 25], [12, 24, 26]) # Shoulder-Hip-Knee
        if not pts: return "Show Side View"

        angle = self.calculate_angle(pts[0], pts[1], pts[2])

        # Logic: 170+ is Flat. <160 is Cobra.
        if angle > 165:
            self.stage = "down"
            self.hold_start_time = None
            return "Lift Chest"

        if angle < 160 and self.stage == "down":
            if self.hold_start_time is None: self.hold_start_time = time.time()
            elapsed = int(time.time() - self.hold_start_time)

            if elapsed >= 2:
                self.stage = "up"
                self.counter += 1
                self.hold_start_time = None
                return "Good Rep!"
            return f"Hold... {elapsed}"

        return "Lift Higher"

    def check_leg_raise(self, lm):
        # Anti-Ghosting
        if self.is_body_vertical(lm): return "Lie on Back"

        pts = self.get_best_side_points(lm, [11, 23, 25], [12, 24, 26])
        if not pts: return "Show Full Body"

        hip_angle = self.calculate_angle(pts[0], pts[1], pts[2])

        if hip_angle > 150:
            self.stage = "down"
            return "Raise Legs"

        if hip_angle < 130 and self.stage == "down":
            self.stage = "up"
            self.counter += 1
            return "Good Rep!"

        return "Lower Legs"

    def check_squats(self, lm):
        # Squats NEED vertical body
        if not self.is_body_vertical(lm): return "Please Stand Up"

        pts = self.get_best_side_points(lm, [23, 25, 27], [24, 26, 28])
        if not pts: return "Show Legs"

        angle = self.calculate_angle(pts[0], pts[1], pts[2])

        if angle > 160: self.stage = "up"; return "Squat Down"
        if angle < 120 and self.stage == "up":
            self.stage = "down"; self.counter += 1; return "Perfect!"
        if angle < 140: return "Go Lower"
        return "Back Up"

    def check_pushups(self, lm):
        # Pushups are mostly horizontal
        if self.is_body_vertical(lm): return "Get into Position"

        pts = self.get_best_side_points(lm, [11, 13, 15], [12, 14, 16])
        if not pts: return "Show Arms"

        angle = self.calculate_angle(pts[0], pts[1], pts[2])

        if angle > 160: self.stage = "up"; return "Push Down"
        if angle < 100 and self.stage == "up":
            self.stage = "down"; self.counter += 1; return "Good Pushup!"
        return "Up"

    def check_lunges(self, lm):
        if not self.is_body_vertical(lm): return "Stand Up"
        pts = self.get_best_side_points(lm, [23, 25, 27], [24, 26, 28])
        if not pts: return "Show Legs"
        angle = self.calculate_angle(pts[0], pts[1], pts[2])
        if angle > 150: self.stage = "up"; return "Lunge Down"
        if angle < 110 and self.stage == "up": self.stage = "down"; self.counter += 1; return "Great!"
        return "Up"

    def check_knee_to_chest(self, lm):
        if self.is_body_vertical(lm): return "Lie Down"
        pts = self.get_best_side_points(lm, [11, 23, 25], [12, 24, 26])
        if not pts: return "Show Body"
        angle = self.calculate_angle(pts[0], pts[1], pts[2])
        if angle > 150: self.stage="out"; return "Pull Knee"
        if angle < 110 and self.stage=="out": self.stage="in"; self.counter+=1; return "Squeeze!"
        return "Release"

    def check_wall_sit(self, lm):
        # Wall sit is vertical
        pts = self.get_best_side_points(lm, [23, 25, 27], [24, 26, 28])
        if not pts: return "Show Legs"
        angle = self.calculate_angle(pts[0], pts[1], pts[2])
        if 80 < angle < 120:
            if not self.hold_start_time: self.hold_start_time = time.time()
            self.counter = int(time.time() - self.hold_start_time)
            return "Holding..."
        else: self.hold_start_time=None; return "Sit at 90°"

    def check_glute_bridge(self, lm):
        if self.is_body_vertical(lm): return "Lie on Back"
        pts = self.get_best_side_points(lm, [11, 23, 25], [12, 24, 26])
        if not pts: return "Show Side"
        angle = self.calculate_angle(pts[0], pts[1], pts[2])
        if angle < 140: self.stage="down"; return "Lift Hips"
        if angle > 165 and self.stage=="down": self.stage="up"; self.counter+=1; return "Good!"
        return "Lower Hips"

    def check_russian_twists(self, lm):
        if lm[11]['visibility'] < 0.2: return "Face Camera"
        if lm[11]['x'] > lm[24]['x']: self.stage="R"
        if lm[12]['x'] < lm[23]['x'] and self.stage=="R": self.stage="L"; self.counter+=1; return "Twist!"
        return "Twist Side-to-Side"