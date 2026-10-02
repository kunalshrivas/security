# pyrefly: ignore [missing-import]
from ultralytics import YOLO
import cv2
import requests
import time
import winsound

# Load model
model = YOLO("runs/detect/train/weights/best.pt")

# Class names
names = model.names

# Cooldown setup
last_alert_time = 0
cooldown = 5

# Start camera
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.25)

    threat_score = 0
    detected_objects = []

    # Default values
    status = "LOW THREAT"
    status_color = (0, 255, 0)

    for box in results[0].boxes:
        class_id = int(box.cls[0])
        label = names[class_id]
        print("Detected:", label)

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        # 🔥 DETECTION LOGIC
        if label in ["gun", "handgun", "pistol", "rifle", "shotgun"]:
            threat_score += 70
            detected_objects.append("GUN")
            box_color = (0, 0, 255)
            text = "GUN DETECTED 🚨"

        elif label == "knife":
            threat_score += 50
            detected_objects.append("KNIFE")
            box_color = (0, 165, 255)
            text = "KNIFE DETECTED ⚠️"

        else:
            continue

        # Draw box + label
        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
        cv2.putText(frame, text, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)

    # 🚨 THREAT LEVEL LOGIC
    if threat_score >= 70:
        status = "HIGH THREAT 🚨"
        status_color = (0, 0, 255)

        # 🔊 SOUND ALERT
        winsound.Beep(1000, 500)

        current_time = time.time()

        if current_time - last_alert_time > cooldown:
            alert_data = {
                "threat_level": "HIGH",
                "score": threat_score,
                "objects": detected_objects
            }

            try:
                try:
                    requests.post("http://localhost:5000/alert", json=alert_data)
                    print("🚨 Alert sent locally:", alert_data)
                except requests.RequestException:
                    requests.post("https://sentrix-backend-kfd5.onrender.com/alert", json=alert_data)
                    print("🚨 Alert sent to cloud:", alert_data)
                last_alert_time = current_time
            except:
                print("❌ Server not reachable")

    elif threat_score >= 50:
        status = "MEDIUM THREAT ⚠️"
        status_color = (0, 165, 255)

    else:
        status = "LOW THREAT"
        status_color = (0, 255, 0)

    # ✅ STATUS DISPLAY (FIXED ERROR)
    cv2.putText(frame, status, (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1,
                status_color, 2)

    cv2.imshow("Threat Detection System", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()