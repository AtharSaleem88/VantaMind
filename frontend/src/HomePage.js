import React, { useState, useEffect } from 'react';
import './HomePage.css';
import botImage from './AI_bot.png';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const HomePage = () => {
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'Hello! How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      axios.get("http://localhost:8000/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUser(res.data);
      }).catch(err => {
        console.error("Profile fetch failed", err);
      });
    }
  }, [token]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = { sender: 'user', text: input };
    setMessages([...messages, newMessage, { sender: 'bot', text: 'Let me think about that...' }]);
    setInput('');
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:8000/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Logout failed or token already expired", err);
    }
    localStorage.removeItem("token");
    navigate("/");
    alert("Are you want Logout");
  };

  return (
    
    <div className="home-wrapper">
      {/* Top-right user icon */}
      <div className="top-right-icon" onClick={() => setDropdownVisible(!dropdownVisible)}>
        <i className="fas fa-user-circle"></i>
        {dropdownVisible && (
          <div className="dropdown-box">
              <p> {user?.UserName}</p>
              <p> {user?.Email}</p>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>

      {sidebarVisible && (
        <div className="chat-sidebar">
          <img
            src={botImage}
            alt="VantaMind Bot"
            className="chat-bot-icon"
            onClick={() => setSidebarVisible(false)}
          />
          <h1>VantaMind</h1>
          <p className="tagline">Welcome {user?.UserName || 'User'}</p>
        </div>
      )}

      <div className={`chat-box ${sidebarVisible ? 'shifted' : ''}`}>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.sender}`}>
              {msg.sender === 'bot' && <img src={botImage} alt="Bot" className="message-avatar" />}
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask anything about your business..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="send-button" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>

      {!sidebarVisible && (
        <div className="chat-bot-icon-wrapper" onClick={() => setSidebarVisible(true)}>
          <img src={botImage} alt="Open Sidebar" className="chat-bot-icon" />
        </div>
      )}
    </div>
  );
};

export default HomePage;
