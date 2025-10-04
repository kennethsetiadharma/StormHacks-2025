
import { useState, createContext, useContext, useEffect, ReactNode } from 'react';

// Create a context to hold the token information.
const TokenContext = createContext(null);

// This is the main component that will wrap your app.
// It will manage the token and show the login modal or the app itself.
export function TokenProvider({ children }) {
  const [token, setTokenState] = useState(null);

  // When the app starts, check if the token is already saved in the browser.
  useEffect(() => {
    const storedToken = localStorage.getItem('canvas_token');
    if (storedToken) {
      setTokenState(storedToken);
    }
  }, []);

  // This function will be used to set the token.
  const setToken = (newToken) => {
    localStorage.setItem('canvas_token', newToken);
    setTokenState(newToken);
  };

  // This function will be used to clear the token.
  const clearToken = () => {
    localStorage.removeItem('canvas_token');
    setTokenState(null);
  };

  return (
    <TokenContext.Provider value={{ token, setToken, clearToken }}>
      {token ? children : <TokenModal setToken={setToken} />}
    </TokenContext.Provider>
  );
}

// This is the modal that will ask for the token.
function TokenModal({ setToken }) {
  const [inputToken, setInputToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputToken) {
      setToken(inputToken);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem' }}>
        <h2 style={{color: 'black', textAlign: 'center'}}>Enter Canvas Token</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            placeholder="Your Canvas API Token"
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', color: 'black', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ width: '100%', padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

// This is a helper function to easily access the token from any component.
export const useToken = () => useContext(TokenContext);
