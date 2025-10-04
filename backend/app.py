from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

CANVAS_BASE_URL = "https://canvas.sfu.ca/api/v1"

app = FastAPI()

# ----------------------------
# Enable CORS for React frontend
# ----------------------------
origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
def get_courses(token: str = Query(...)):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{CANVAS_BASE_URL}/users/self/courses"
    response = requests.get(url, headers=headers)
    return response.json()

# ----------------------------
# Get assignments for a specific course
# ----------------------------
@app.get("/courses/{course_id}/assignments")
def get_assignments(course_id: int, token: str = Query(...)):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{CANVAS_BASE_URL}/courses/{course_id}/assignments"
    response = requests.get(url, headers=headers)
    return response.json()

