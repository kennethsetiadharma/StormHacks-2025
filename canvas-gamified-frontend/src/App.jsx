import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("canvasToken") || "");
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) localStorage.setItem("canvasToken", token);
  }, [token]);

  const fetchCourses = async () => {
    if (!token) {
      setError("Please enter your Canvas token.");
      return;
    }

    try {
      setError("");
      setCourses([]);
      setAssignments({});
      setLeaderboard({});

      const res = await axios.get("http://127.0.0.1:8000/courses", {
        params: { token },
      });

      if (!Array.isArray(res.data)) {
        setError("Invalid token or unexpected response from backend.");
        return;
      }

      setCourses(res.data);

      const assignmentsData = {};
      for (const course of res.data) {
        const aRes = await axios.get(
          `http://127.0.0.1:8000/courses/${course.id}/assignments`,
          { params: { token } }
        );
        assignmentsData[course.id] = Array.isArray(aRes.data) ? aRes.data : [];
      }
      setAssignments(assignmentsData);

      const board = {};
      res.data.forEach((course) => {
        board[course.name] = assignmentsData[course.id]?.length || 0;
      });
      setLeaderboard(board);

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Error fetching data. Check your token and backend."
      );
    }
  };

  return (
    <div className="app">
      <div className="container">
        {/* Left Column - Features */}
        <div className="left-column">
          <h1 className="title">Welcome to Canvas Tracker</h1>
          <p className="subtitle">
            Transform your Canvas experience with gamified learning. Track assignments,  
            compete with classmates, and build study streaks.
          </p>

          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <div className="feature-content">
                <h3>Secure Integration</h3>
                <p>Your Canvas token is encrypted and securely stored. Only your classes are accessible.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <div className="feature-content">
                <h3>Track Progress</h3>
                <p>Real-time sync with Canvas. Monitor assignments, grades, and build study streaks.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <div className="feature-content">
                <h3>Class Leaderboards</h3>
                <p>Compete with verified classmates. Rankings based on completion and performance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Token Input */}
        <div className="right-column">
          <div className="token-card">
            <h2>Canvas Access Token</h2>
            <p className="token-instructions">
              Enter your Canvas API token
            </p>
            <p className="token-help">
              Find your token in Canvas → Account → Settings → New Access Token
            </p>
            
            <div className="token-input-group">
              <input
                type="text"
                placeholder="Enter your Canvas API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="token-input"
              />
              <button onClick={fetchCourses} className="connect-button">
                Connect to Canvas
              </button>
            </div>

            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      </div>

      {/* Data Display Section */}
      {courses.length > 0 && (
        <div className="data-section">
          <div className="courses-section">
            <h2>Courses & Assignments</h2>
            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course.id} className="course-card">
                  <h3>{course.name}</h3>
                  <div className="assignments-list">
                    {assignments[course.id]?.map((a) => (
                      <div key={a.id} className="assignment-item">
                        <span className="assignment-name">{a.name}</span>
                        <span className="assignment-due">
                          Due: {a.due_at ? new Date(a.due_at).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="leaderboard-section">
            <h2>Class Leaderboard</h2>
            <div className="leaderboard">
              {Object.entries(leaderboard).map(([courseName, count]) => (
                <div key={courseName} className="leaderboard-item">
                  <span className="course-name">{courseName}</span>
                  <span className="assignment-count">{count} assignments</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;