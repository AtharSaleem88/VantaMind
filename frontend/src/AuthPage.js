import React, { useState } from 'react';
import './AuthPage.css';
import botImage from './AI_bot.png';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(false); // Toggle between login and register
  const [email, setEmail] = useState("");        // Email for registration
  const [username, setUsername] = useState("");  // Username for login/register
  const [password, setPassword] = useState("");  // Password
  const navigate = useNavigate();                // Navigation hook

  // Switch between Login and Register form
  const toggleForm = () => setIsLogin(!isLogin);

  // Submit handler for both login and register
  const handleSubmit = async () => {
    const url = isLogin
      ? "http://localhost:8000/auth/login"
      : "http://localhost:8000/auth/register";

    // Choose payload based on form type
    const payload = isLogin
      ? { username, password }
      : { username, email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`❌ ${errorData.detail || 'Authentication failed'}`);
        return;
      }

      const data = await response.json();
      debugger
      if (isLogin) {
        // Save token and redirect to home page on successful login
        localStorage.setItem("token", data.access_token);
        alert("✅ Login successful!");
        navigate("/home");
      } else {
        // Show success and switch to login form after registration
        alert("✅ Registration successful! Please log in.");
        setIsLogin(true);  // Switch to login mode
        setPassword("");   // Optionally reset password field
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Network error or server not available.");
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Side Image and Tagline */}
      <div className="auth-img">
        <img src={botImage} alt="VantaMind Bot" className="bot-icon" /> <br />
        <h1>VantaMind</h1>
        <h3>AI Brain For Your Business</h3>
        
      </div>

      {/* Right Side Auth Form */}
      <div className="auth-box">
        <h2>{isLogin ? 'Login to VantaMind' : 'Register for VantaMind'}</h2>
        <p className="tagline">
          Empowering CEOs, Founders, and Business Leaders with Smart AI Insights
        </p>

        {/* Show email only for registration */}
        {!isLogin && (
          <input
            type="email"
            placeholder="Business Email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}

        {/* Username and Password fields */}
        <input
          type="text"
          placeholder="Username"
          className="input-field"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Submit Button */}
        <button className="submit-button" onClick={handleSubmit}>
          {isLogin ? 'Login' : 'Register'}
        </button>

        {/* Toggle Link */}
        <p className="toggle-link" onClick={toggleForm}>
          {isLogin
            ? "Don't have an account? Register here"
            : "Already have an account? Login here"}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
