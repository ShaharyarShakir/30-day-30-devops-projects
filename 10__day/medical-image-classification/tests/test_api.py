from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "running"}
    print("GET / passed!")


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "running"}
    print("GET /api/v1/health passed!")


def test_predict_invalid():
    response = client.post("/api/v1/predict", files={"file": ("test.txt", b"not-an-image")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid image file."
    print("POST /api/v1/predict (invalid image) passed!")


def test_predict_valid():
    # Attempt to locate a sample normal image from our raw downloaded dataset
    raw_dir = Path("data/raw/Pneumonia_Dataset/NORMAL")
    raw_images = list(raw_dir.glob("*.jpeg")) + list(raw_dir.glob("*.jpg"))

    if raw_images:
        test_image_path = raw_images[0]
        with open(test_image_path, "rb") as f:
            response = client.post(
                "/api/v1/predict",
                files={"file": (test_image_path.name, f, "image/jpeg")}
            )
        assert response.status_code == 200
        data = response.json()
        assert "prediction" in data
        assert "confidence" in data
        assert data["prediction"] in ["NORMAL", "PNEUMONIA"]
        assert 0.0 <= data["confidence"] <= 1.0
        print(f"POST /api/v1/predict (valid image) passed! Response: {data}")
    else:
        print("Skipping valid image test: no sample NORMAL images found in data/raw.")


if __name__ == "__main__":
    print("Running FastAPI serving layer test suite...")
    test_root()
    test_health()
    test_predict_invalid()
    test_predict_valid()
    print("All tests completed successfully!")
