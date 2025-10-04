import { useState, useEffect } from "react";
import axios from "axios";

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
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Canvas Gamified Dashboard</h1>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Enter Canvas API token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ width: "400px", marginRight: "1rem" }}
        />
        <button onClick={fetchCourses}>Fetch Data</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {courses.length > 0 && (
        <>
          <h2>Courses & Assignments</h2>
          {courses.map((course) => (
            <div key={course.id} style={{ marginBottom: "1rem" }}>
              <h3>{course.name}</h3>
              <ul>
                {assignments[course.id]?.map((a) => (
                  <li key={a.id}>
                    {a.name} - Due: {a.due_at || "N/A"}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <h2>Leaderboard (Assignments per Course)</h2>
          <ul>
            {Object.entries(leaderboard).map(([courseName, count]) => (
              <li key={courseName}>
                {courseName}: {count} assignments
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
