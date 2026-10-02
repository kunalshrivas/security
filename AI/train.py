from ultralytics import YOLO

# Load base model
model = YOLO("yolov8n.pt")

# Train on your dataset
model.train(
    data="dataset/data.yaml",
    epochs=50,
    imgsz=640
)