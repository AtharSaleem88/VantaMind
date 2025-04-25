import React, { useState } from 'react';
import './HomePage.css';
import botImage from './AI_bot.png';

const HomePage = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = { sender: 'user', text: input };
    setMessages([...messages, newMessage, { sender: 'bot', text: 'Let me think about that...' }]);
    setInput('');
  };

  return (
    <div className="home-wrapper">
      {sidebarVisible && (
        <div className="chat-sidebar">
          <img
            src={botImage}
            alt="VantaMind Bot"
            className="chat-bot-icon"
            onClick={() => setSidebarVisible(false)}
          />
          <h1>VantaMind</h1>
          <p className="tagline">Business AI Assistant for CEOs and Founders</p>
          <div className="sidebar-bottom">
            <div className="sidebar-item">
              <i className="fas fa-user"></i>
              <span className="sidebar-text">Profile</span>
            </div>
            <div className="sidebar-item">
              <i className="fas fa-sign-out-alt"></i>
              <span className="sidebar-text">Logout</span>
            </div>
          </div>
        </div>
      )}

      <div className={`chat-box ${sidebarVisible ? 'shifted' : ''}`}>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <img src={botImage} alt="Bot" className="message-avatar" />
              )}
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
        <div
          className="chat-bot-icon-wrapper"
          onClick={() => setSidebarVisible(true)}
        >
          <img src={botImage} alt="Open Sidebar" className="chat-bot-icon" />
        </div>
      )}
    </div>
  );
};

export default HomePage;
