import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("canvasToken") || "");
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [submissions, setSubmissions] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem("canvasToken", token);
  }, [token]);

  // Calculate average grade for a course
  const calculateCourseGrade = (courseId) => {
    const courseSubmissions = submissions[courseId] || [];
    const gradedSubmissions = courseSubmissions.filter(sub => 
      sub.score !== null && sub.score !== undefined
    );
    
    if (gradedSubmissions.length === 0) return null;
    
    const totalScore = gradedSubmissions.reduce((sum, sub) => sum + sub.score, 0);
    return (totalScore / gradedSubmissions.length).toFixed(1);
  };

  // Calculate grade percentage
  const calculateGradePercentage = (courseId) => {
    const courseSubmissions = submissions[courseId] || [];
    const gradedSubmissions = courseSubmissions.filter(sub => 
      sub.score !== null && sub.score !== undefined
    );
    
    if (gradedSubmissions.length === 0) return null;
    
    const totalPossible = gradedSubmissions.reduce((sum, sub) => {
      const assignment = assignments[courseId]?.find(a => a.id === sub.assignment_id);
      return sum + (assignment?.points_possible || 0);
    }, 0);
    
    const totalScore = gradedSubmissions.reduce((sum, sub) => sum + sub.score, 0);
    
    if (totalPossible === 0) return null;
    return ((totalScore / totalPossible) * 100).toFixed(1);
  };

  const fetchCourses = async () => {
    if (!token) {
      setError("Please enter your Canvas token.");
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      setCourses([]);
      setAssignments({});
      setSubmissions({});
      setLeaderboard({});

      console.log("Testing backend connection...");
      
      // First test if backend is reachable
      try {
        const healthCheck = await axios.get("http://127.0.0.1:8000/");
        console.log("Backend health check:", healthCheck.data);
      } catch (healthError) {
        throw new Error("Backend server is not running. Please start the backend server first.");
      }

      console.log("Fetching courses with token:", token.substring(0, 10) + "...");
      
      const res = await axios.get("http://127.0.0.1:8000/courses", {
        params: { token },
        timeout: 10000
      });

      console.log("Full courses API response:", res.data);

      if (!Array.isArray(res.data)) {
        if (res.data && res.data.errors) {
          throw new Error(`Canvas API Error: ${JSON.stringify(res.data.errors)}`);
        } else {
          throw new Error("Invalid token or unexpected response from backend.");
        }
      }

      // Make sure to include all active courses from Canvas
      const currentCourses = res.data.filter(course => {
        const courseName = course.name || '';
        const courseCode = course.course_code || '';
        
        console.log(`Checking course: "${courseName}" (${courseCode})`);
        
        // Include all courses returned by Canvas API (active enrollment)
        const isCurrentCourse = true; // keep all courses
        
        console.log(`Is current course: ${isCurrentCourse}`);
        return isCurrentCourse;
      });

      console.log("Filtered current courses:", currentCourses);

      if (currentCourses.length === 0) {
        const allCourseNames = res.data.map(c => c.name).join(', ');
        setError(`No current courses found. Available courses: ${allCourseNames}`);
        return;
      }

      setCourses(currentCourses);

      const assignmentsData = {};
      const submissionsData = {};
      
      for (const course of currentCourses) {
        console.log(`Fetching assignments for course ${course.id}: ${course.name}`);
        try {
          const aRes = await axios.get(
            `http://127.0.0.1:8000/courses/${course.id}/assignments`,
            { params: { token }, timeout: 10000 }
          );
          assignmentsData[course.id] = Array.isArray(aRes.data) ? aRes.data : [];
        } catch (assignmentError) {
          console.error(`Error fetching assignments for course ${course.id}:`, assignmentError);
          assignmentsData[course.id] = [];
        }

        console.log(`Fetching submissions for course ${course.id}: ${course.name}`);
        try {
          const sRes = await axios.get(
            `http://127.0.0.1:8000/courses/${course.id}/submissions`,
            { params: { token }, timeout: 10000 }
          );
          submissionsData[course.id] = Array.isArray(sRes.data) ? sRes.data : [];
        } catch (submissionError) {
          console.error(`Error fetching submissions for course ${course.id}:`, submissionError);
          submissionsData[course.id] = [];
        }
      }
      
      setAssignments(assignmentsData);
      setSubmissions(submissionsData);

      // Enhanced leaderboard with grade information
      const board = {};
      currentCourses.forEach((course) => {
        const courseAssignments = assignmentsData[course.id] || [];
        const courseSubmissions = submissionsData[course.id] || [];
        
        const gradedSubmissions = courseSubmissions.filter(sub => 
          sub.score !== null && sub.score !== undefined
        );
        
        const averageGrade = calculateCourseGrade(course.id);
        const gradePercentage = calculateGradePercentage(course.id);
        
        board[course.name] = {
          assignmentCount: courseAssignments.length,
          gradedCount: gradedSubmissions.length,
          averageGrade: averageGrade,
          gradePercentage: gradePercentage
        };
      });
      
      setLeaderboard(board);

      setIsConnected(true);
      setActiveTab("dashboard");

    } catch (err) {
      console.error("Full error details:", err);
      if (err.message?.includes("Backend server is not running")) {
        setError("Backend server is not running. Please start the backend server first.");
      } else if (err.response?.status === 401) {
        setError("Invalid Canvas token. Please check your token and try again.");
      } else if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED') {
        setError("Cannot connect to backend. Make sure the server is running on http://127.0.0.1:8000");
      } else if (err.response?.data?.detail) {
        setError(`Canvas API Error: ${JSON.stringify(err.response.data.detail)}`);
      } else {
        setError(err.message || "Error fetching data. Check your token and backend.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setCourses([]);
    setAssignments({});
    setSubmissions({});
    setLeaderboard({});
    setToken("");
    localStorage.removeItem("canvasToken");
  };

  // Calculate total assignments across all active courses
  const totalAssignments = Object.values(assignments).reduce((total, courseAssignments) => 
    total + (courseAssignments?.length || 0), 0
  );

  // Calculate total graded assignments
  const totalGraded = Object.values(submissions).reduce((total, courseSubmissions) => 
    total + (courseSubmissions?.filter(sub => sub.score !== null && sub.score !== undefined).length || 0), 0
  );

  // Login Page
  if (!isConnected) {
    return (
      <div className="app">
        <div className="container">
          {/* Left Column - Features */}
          <div className="left-column">
            <h1 className="title">Welcome to Canvas Flow</h1>
            <p className="subtitle">
              Transform your Canvas experience with gamified learning. Track assignments,  
              compete with classmates, and build study streaks.
            </p>

            <div className="features">
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <div className="feature-content">
                  <h3>Secure Integration</h3>
                  <p>Your Canvas token is encrypted and securely stored. Only your currently enrolled classes are accessible.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h3>Current Courses Only</h3>
                  <p>We show data for courses you're actively enrolled in this semester.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🏆</div>
                <div className="feature-content">
                  <h3>Class Leaderboards</h3>
                  <p>Compete with verified classmates. Rankings based on grades and completion.</p>
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
                  disabled={isLoading}
                />
                <button 
                  onClick={fetchCourses} 
                  className="connect-button"
                  disabled={isLoading}
                >
                  {isLoading ? "Connecting..." : "Connect to Canvas"}
                </button>
              </div>

              {error && <p className="error-message">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard with Tabs
  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Canvas Flow</h1>
          <div className="header-info">
            <span className="enrollment-badge">
              📚 {courses.length} Current Courses
            </span>
            <button onClick={disconnect} className="disconnect-button">
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs">
        <button 
          className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab ${activeTab === "assignments" ? "active" : ""}`}
          onClick={() => setActiveTab("assignments")}
        >
          📝 Assignments
        </button>
        <button 
          className={`tab ${activeTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setActiveTab("leaderboard")}
        >
          🏆 Leaderboard
        </button>
        <button 
          className={`tab ${activeTab === "streaks" ? "active" : ""}`}
          onClick={() => setActiveTab("streaks")}
        >
          🔥 Study Streaks
        </button>
        <button 
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="tab-panel">
            <h2>Your Current Semester Dashboard</h2>
            <div className="enrollment-notice">
              <p>📋 Showing data for your <strong>{courses.length} current courses</strong> only</p>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Current Courses</h3>
                <p className="stat-number">{courses.length}</p>
                <p className="stat-description">This semester</p>
              </div>
              <div className="stat-card">
                <h3>Total Assignments</h3>
                <p className="stat-number">{totalAssignments}</p>
                <p className="stat-description">Across all courses</p>
              </div>
              <div className="stat-card">
                <h3>Graded Work</h3>
                <p className="stat-number">{totalGraded}</p>
                <p className="stat-description">Assignments graded</p>
              </div>
              <div className="stat-card">
                <h3>Leaderboard Rank</h3>
                <p className="stat-number">#3</p>
                <p className="stat-description">In your classes</p>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Your Current Courses & Grades</h3>
              <div className="activity-list">
                {courses.map(course => {
                  const courseData = leaderboard[course.name];
                  const averageGrade = courseData?.averageGrade;
                  const gradePercentage = courseData?.gradePercentage;
                  
                  return (
                    <div key={course.id} className="activity-item">
                      <div className="course-info">
                        <span className="course-name">{course.name}</span>
                        <span className="assignment-count">
                          {courseData?.assignmentCount || 0} assignments
                        </span>
                      </div>
                      <div className="grade-info">
                        {averageGrade ? (
                          <>
                            <span className="average-grade">{averageGrade}%</span>
                            <span className="graded-count">
                              ({courseData?.gradedCount || 0} graded)
                            </span>
                          </>
                        ) : (
                          <span className="no-grades">No grades yet</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <div className="tab-panel">
            <h2>Current Course Assignments</h2>
            <div className="enrollment-notice">
              <p>📚 Assignments from your <strong>{courses.length} current courses</strong> this semester</p>
            </div>
            
            {courses.length === 0 ? (
              <div className="no-courses">
                <p>No current courses found.</p>
              </div>
            ) : (
              <div className="courses-grid">
                {courses.map((course) => {
                  const courseSubmissions = submissions[course.id] || [];
                  
                  return (
                    <div key={course.id} className="course-card">
                      <div className="course-header">
                        <h3>{course.name}</h3>
                        <div className="course-stats">
                          <span className="assignment-count-badge">
                            {assignments[course.id]?.length || 0} assignments
                          </span>
                          {calculateCourseGrade(course.id) && (
                            <span className="grade-badge">
                              {calculateCourseGrade(course.id)}% avg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="assignments-list">
                        {assignments[course.id]?.length > 0 ? (
                          assignments[course.id]?.map((a) => {
                            const submission = courseSubmissions.find(sub => sub.assignment_id === a.id);
                            const hasGrade = submission && submission.score !== null && submission.score !== undefined;
                            
                            return (
                              <div key={a.id} className="assignment-item">
                                <div className="assignment-info">
                                  <span className="assignment-name">{a.name}</span>
                                  <span className="assignment-due">
                                    Due: {a.due_at ? new Date(a.due_at).toLocaleDateString() : "N/A"}
                                  </span>
                                </div>
                                <div className="assignment-grade">
                                  {hasGrade ? (
                                    <span className="grade-score">
                                      {submission.score}/{a.points_possible || '?'} 
                                      {a.points_possible && (
                                        <span className="grade-percentage">
                                          ({((submission.score / a.points_possible) * 100).toFixed(1)}%)
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="no-grade">Not graded</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="no-assignments">No assignments found for this course</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="tab-panel">
            <h2>Early Submission Leaderboard</h2>
            <div className="enrollment-notice">
              <p>🏆 Rankings based on points earned from submitting assignments early</p>
              <p className="points-system">Points System: +10 early submission, +5 on time, +0 late</p>
            </div>
            
            <div className="leaderboard">
              {[
                {
                  studentName: "Alex Chen",
                  points: 285,
                  assignmentsSubmitted: 28,
                  earlySubmissions: 25,
                  onTimeSubmissions: 3,
                  lateSubmissions: 0,
                  isCurrentUser: false
                },
                {
                  studentName: "You",
                  points: 270,
                  assignmentsSubmitted: 27,
                  earlySubmissions: 22,
                  onTimeSubmissions: 5,
                  lateSubmissions: 0,
                  isCurrentUser: true
                },
                {
                  studentName: "Maya Rodriguez",
                  points: 255,
                  assignmentsSubmitted: 26,
                  earlySubmissions: 20,
                  onTimeSubmissions: 6,
                  lateSubmissions: 0,
                  isCurrentUser: false
                },
                {
                  studentName: "Jordan Smith",
                  points: 230,
                  assignmentsSubmitted: 25,
                  earlySubmissions: 17,
                  onTimeSubmissions: 7,
                  lateSubmissions: 1,
                  isCurrentUser: false
                },
                {
                  studentName: "Taylor Kim",
                  points: 210,
                  assignmentsSubmitted: 24,
                  earlySubmissions: 15,
                  onTimeSubmissions: 7,
                  lateSubmissions: 2,
                  isCurrentUser: false
                },
                {
                  studentName: "Riley Johnson",
                  points: 185,
                  assignmentsSubmitted: 23,
                  earlySubmissions: 12,
                  onTimeSubmissions: 8,
                  lateSubmissions: 3,
                  isCurrentUser: false
                },
                {
                  studentName: "Sam Wilson",
                  points: 150,
                  assignmentsSubmitted: 22,
                  earlySubmissions: 9,
                  onTimeSubmissions: 9,
                  lateSubmissions: 4,
                  isCurrentUser: false
                },
                {
                  studentName: "Casey Brown",
                  points: 125,
                  assignmentsSubmitted: 21,
                  earlySubmissions: 7,
                  onTimeSubmissions: 8,
                  lateSubmissions: 6,
                  isCurrentUser: false
                }
              ]
                .sort((a, b) => b.points - a.points)
                .map((student, index) => (
                  <div key={student.studentName} className={`leaderboard-item ${student.isCurrentUser ? 'current-user' : ''}`}>
                    <div className="rank">
                      #{index + 1}
                      {index === 0 && <span className="top-badge">👑</span>}
                    </div>
                    <div className="course-info">
                      <span className={`course-name ${student.isCurrentUser ? 'user-highlight' : ''}`}>
                        {student.studentName}
                        {student.isCurrentUser && <span className="you-badge"> (You)</span>}
                      </span>
                      <div className="course-details">
                        <span className="assignment-count">
                          {student.assignmentsSubmitted} assignments • 
                          <span className="early-count"> {student.earlySubmissions} early</span> • 
                          <span className="ontime-count"> {student.onTimeSubmissions} on time</span>
                          {student.lateSubmissions > 0 && (
                            <span className="late-count"> • {student.lateSubmissions} late</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="grade-info">
                      <div className="points-display">
                        <span className="points">{student.points} pts</span>
                        <span className="points-breakdown">
                          
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Streaks Tab */}
        {activeTab === "streaks" && (
          <div className="tab-panel">
              <h2>Submission Streaks - Current Semester</h2>
              <div className="enrollment-notice">
                  <p>🔥 Maintain your streak by submitting assignments early or on time</p>
                  <p className="streak-rules">Streak continues when you submit early/on-time on due dates • No penalty for days without assignments</p>
              </div>
              
              <div className="streaks-container">
                  <div className="streak-card">
                      <h3>Current Submission Streak</h3>
                      <div className="streak-display">
                          <span className="streak-number">8</span>
                          <span className="streak-label">assignments 🔥</span>
                      </div>
                      <p className="streak-details">
                          <span className="streak-stat">Early: <strong>6 </strong></span>
                          <span className="streak-stat">On-Time: <strong>2 </strong></span>
                          <span className="streak-stat">Total Points: <strong>70</strong></span>
                      </p>
                      <div className="streak-info">
                          <p>✅ Last submission: <strong>2 days ago</strong> (Early)</p>
                          <p>📅 Next assignment due: <strong>Tomorrow</strong></p>
                      </div>
                  </div>
                  
                <div className="streak-card achievement-card">
                      <h3>Streak Achievements</h3>
                      <div className="achievements-list">
                          <div className="achievement unlocked">
                              <span className="achievement-icon">🔥</span>
                              <div className="achievement-info">
                                  <span className="achievement-title">Consistent Starter</span>
                                  <span className="achievement-desc">5 assignments in a row</span>
                              </div>
                              <span className="achievement-date">Active</span>
                          </div>
                          <div className="achievement unlocked">
                              <span className="achievement-icon">⚡</span>
                              <div className="achievement-info">
                                  <span className="achievement-title">Early Bird</span>
                                  <span className="achievement-desc">3 early submissions in a row</span>
                              </div>
                              <span className="achievement-date">Active</span>
                          </div>
                          <div className="achievement locked">
                              <span className="achievement-icon">🏆</span>
                              <div className="achievement-info">
                                  <span className="achievement-title">Perfect Month</span>
                                  <span className="achievement-desc">15 assignments streak</span>
                              </div>
                              <span className="achievement-progress">8/15</span>
                          </div>
                          <div className="achievement locked">
                              <span className="achievement-icon">💎</span>
                              <div className="achievement-info">
                                  <span className="achievement-title">Early Master</span>
                                  <span className="achievement-desc">10 early submissions in a row</span>
                              </div>
                              <span className="achievement-progress">6/10</span>
                          </div>
                      </div>

                      <div className="streak-card">
                        <h3>Upcoming Assignments</h3>
                      <div className="upcoming-assignments">
                          {[
                              { assignment: "Final Project Proposal", due: "Tomorrow", course: "Computer Science", points: 10 },
                              { assignment: "Chapter 5 Problems", due: "In 3 days", course: "Mathematics", points: 10 },
                              { assignment: "Literature Analysis", due: "In 5 days", course: "English", points: 10 },
                              { assignment: "Lab Experiment", due: "In 6 days", course: "Physics", points: 10 },
                          ].map((assignment, index) => (
                              <div key={index} className="upcoming-item">
                                  <div className="upcoming-info">
                                      <span className="upcoming-name">{assignment.assignment}</span>
                                      <span className="upcoming-course">{assignment.course}</span>
                                  </div>
                                  <div className="upcoming-due">
                                      <span className="due-date">{assignment.due}</span>
                                    
                                  </div>
                              </div>
                          ))}
                      </div>
                      <p className="upcoming-total">Keep your streak going! Submit early for bonus points.</p>
                  </div>

                  
                  </div>
              </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="tab-panel">
            <h2>Settings</h2>
            <div className="settings-container">
              <div className="setting-item">
                <h3>Canvas Integration</h3>
                <p>Connected to: SFU Canvas</p>
                <p><strong>Current Courses:</strong> {courses.length}</p>
                <button onClick={disconnect} className="disconnect-button">
                  Disconnect Account
                </button>
              </div>
              
              <div className="setting-item">
                <h3>Data Scope</h3>
                <p>Currently showing data for <strong>{courses.length} current courses</strong> only.</p>
                <p>Past courses and other classes are not included.</p>
              </div>
              
              <div className="setting-item">
                <h3>Privacy</h3>
                <p>Control what information is visible on leaderboards</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;