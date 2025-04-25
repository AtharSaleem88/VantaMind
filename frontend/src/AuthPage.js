import React, { useState } from 'react';
import './AuthPage.css';
import botImage from './AI_bot.png';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(false);
    const navigate = useNavigate();

    const toggleForm = () => setIsLogin(!isLogin);

    return (
    <div className="auth-wrapper">
        <div className="auth-img">
        <img src={botImage} alt="VantaMind Bot" className="bot-icon" /> <br />
        <h1>VantaMind</h1>
        <h3>Your AI Assistant</h3>
        <p className="tagline1">Ask any question you have about sales,<br/> inventory, and business trends!</p>
        </div>

        <div className="auth-box">
        <h2>{isLogin ? 'Login to VantaMind' : 'Register for VantaMind'}</h2>
        <p className="tagline">Empowering CEOs, Founders, and Business Leaders with Smart AI Insights</p>

        {!isLogin && (
            <input type="email" placeholder="Business Email" className="input-field" />
        )}

        <input type="text" placeholder="Username or Email" className="input-field" />
        <input type="password" placeholder="Password" className="input-field" />

        <button
        className="submit-button"
        onClick={() => {
         // Add validation logic here
         if (isLogin) {
         // Simulate successful login
        navigate('/home'); // This will redirect to HomePage
        }
        }}
        >   
        {isLogin ? 'Login' : 'Register'}
        </button>
        <p className="toggle-link" onClick={toggleForm}>
            {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
        </p>
        </div>
    </div>
    );
};

export default AuthPage;
