from ultralytics import YOLO
import cv2

# Load model
model = YOLO("yolov8n.pt")

# Get class names
names = model.names

# Open webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # Run detection
    results = model(frame)

    # Loop through detections
    for box in results[0].boxes:
        class_id = int(box.cls[0])
        label = names[class_id]

        # FILTER: only detect person
        if label == "person":

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # Draw red box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

            # Alert text
            cv2.putText(frame, "PERSON DETECTED 🚨",
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 0, 255),
                        2)

            print("Person detected 🚨")

    # Show output
    cv2.imshow("Live AI Detection", frame)

    # Exit on ESC
    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()