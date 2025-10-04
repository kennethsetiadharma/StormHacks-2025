
import './App.css';
import { useToken } from './TokenContext.jsx';

function App() {
  const { clearToken } = useToken();

  return (
    <div className="card">
      <h1>Welcome to your Classroom Dashboard</h1>
      <p>You have successfully entered your token.</p>
      <button onClick={clearToken} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
        Go Back
      </button>
    </div>
  );
}

export default App;
