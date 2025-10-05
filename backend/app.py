from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests

CANVAS_BASE_URL = "https://canvas.sfu.ca/api/v1"

app = FastAPI()

# Enable CORS for React frontend
origins = ["http://localhost:5173"]  # local host port may change 

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Canvas backend is running. Visit /courses to see your courses."}

# Get all active courses for the user
@app.get("/courses")
def get_courses(token: str = Query(...)):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{CANVAS_BASE_URL}/users/self/courses?enrollment_state=active"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    
    return response.json()

# Get assignments for a specific course
@app.get("/courses/{course_id}/assignments")
def get_assignments(course_id: int, token: str = Query(...)):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{CANVAS_BASE_URL}/courses/{course_id}/assignments"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    
    return response.json()

# Get submissions for a specific course (current user)
@app.get("/courses/{course_id}/submissions")
def get_submissions(course_id: int, token: str = Query(...)):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{CANVAS_BASE_URL}/courses/{course_id}/students/submissions"
    params = {"student_ids[]": "self"}  # <-- important for current user only
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    
    return response.json()
