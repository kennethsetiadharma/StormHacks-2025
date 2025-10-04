from fastapi import FastAPI
from dotenv import load_dotenv
import os
import requests

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv(dotenv_path="./.env")  # make sure .env is in backend/

CANVAS_API_TOKEN = os.getenv("CANVAS_API_TOKEN")
CANVAS_BASE_URL = os.getenv("CANVAS_BASE_URL")

# Debug print to confirm token and URL
print("Token loaded:", CANVAS_API_TOKEN)
print("Base URL:", CANVAS_BASE_URL)

headers = {"Authorization": f"Bearer {CANVAS_API_TOKEN}"}

# ----------------------------
# Initialize FastAPI
# ----------------------------
app = FastAPI()

# ----------------------------
# Root endpoint
# ----------------------------
@app.get("/")
def root():
    return {"message": "Canvas backend is running. Visit /courses to see your courses."}

# ----------------------------
# Get all courses for the user
# ----------------------------
@app.get("/courses")
def get_courses():
    url = f"{CANVAS_BASE_URL}/users/self/courses"
    response = requests.get(url, headers=headers)
    print("Status code:", response.status_code)
    print("Response text:", response.text)
    return response.json()

# ----------------------------
# Get assignments for a specific course
# ----------------------------
@app.get("/courses/{course_id}/assignments")
def get_assignments(course_id: int):
    url = f"{CANVAS_BASE_URL}/courses/{course_id}/assignments"
    response = requests.get(url, headers=headers)
    print("Status code:", response.status_code)
    print("Response text:", response.text)
    return response.json()

