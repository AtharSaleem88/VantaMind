// HomePage.js
import React, { useState, useEffect, useCallback } from 'react';
import './HomePage.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaMoon, FaBell } from 'react-icons/fa';
import { FiMoreVertical, FiChevronLeft, FiChevronRight, FiMoreHorizontal } from 'react-icons/fi';

const HomePage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const token = localStorage.getItem("token");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user profile", err);
      navigate('/');
    }
  }, [token, navigate]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (err) {
      console.error("Error fetching conversations", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/');
    } else {
      fetchProfile();
      fetchConversations();
    }
  }, [token, navigate, fetchProfile, fetchConversations]);

  useEffect(() => {
    const el = document.querySelector(".chat-messages");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const fetchMessages = async (conversationId) => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsedMessages = res.data.messages.map((m) => {
        if (m.sender === 'bot') {
          try {
            const parsed = JSON.parse(m.content);
            if (typeof parsed === 'string') {
              return { sender: 'bot', text: parsed };
            }
            const resultLines = parsed.result
              ? Object.entries(parsed.result).map(([k, v]) => {
                  if (typeof v === 'object' && v !== null) {
                    return Object.entries(v).map(([key, val]) => `${key}: ${val}`).join('\n');
                  }
                  return `${k}: ${v}`;
                })
              : [];
            return {
              sender: 'bot',
              text: resultLines.join('\n')
            };
          } catch {
            return { sender: 'bot', text: m.content || '❌ Error parsing bot response' };
          }
        } else {
          return { sender: 'user', text: m.content };
        }
      });
      setMessages(parsedMessages);
      setSelectedConversationId(conversationId);
    } catch (err) {
      console.error("Error fetching messages", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    setMessages(prev => [...prev, { sender: 'user', text: input }, { sender: 'bot', text: 'Thinking...' }]);
    setIsLoading(true);
    const question = input;
    setInput('');

    try {
      const res = await axios.post("http://127.0.0.1:8000/ask", {
        message: question,
        conversation_id: selectedConversationId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = res.data;
      const botText = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);

      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        return [...newMsgs, { sender: 'bot', text: botText }];
      });

      if (!selectedConversationId && result.conversation_id) {
        setSelectedConversationId(result.conversation_id);
      }

      fetchConversations();
    } catch (err) {
      console.error("Error in /ask:", err);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        return [...newMsgs, { sender: 'bot', text: '❌ Sorry, an error occurred.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([{ sender: 'bot', text: 'Hello! How can I help you with your business data today?' }]);
    setSelectedConversationId(null);
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      localStorage.removeItem("token");
      navigate("/");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading && input.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEdit = async (conversationId) => {
    const newTitle = prompt("Enter new title:");
    if (!newTitle) return;
    try {
      await axios.put(`http://127.0.0.1:8000/conversations/${conversationId}`, {
        title: newTitle
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConversations();
    } catch (err) {
      console.error("Edit failed", err);
    }
  };

  const handleDelete = async (conversationId) => {
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
      fetchConversations();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className={`home-wrapper ${darkMode ? 'dark-mode' : ''}`}>
      <div className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button className="sidebar-toggle " class="sidebar-toggle"onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
           <i className="bi bi-layout-sidebar"></i>
          
        </button>
        <button className="new-chat-button" onClick={handleNewChat}>+ New Chat</button>
      <div className="conversations-list">
  {conversations.length ? conversations.map(conv => (
    <div
      key={conv.conversationId}
      className={`conversation-item ${selectedConversationId === conv.conversationId ? 'active' : ''}`}
      onClick={() => fetchMessages(conv.conversationId)}
    >
      <p>{conv.title.length > 25 ? conv.title.slice(0, 25) + '…' : conv.title}</p>
      <small>{new Date(conv.startedAt).toLocaleString()}</small>
      <div className="action-menu">
        <button
          className="dots-button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === conv.conversationId ? null : conv.conversationId);
          }}
        >
          <FiMoreHorizontal />
        </button>
        {menuOpenId === conv.conversationId && (
          <div className="dropdown-menu">
            <button onClick={(e) => { e.stopPropagation(); handleEdit(conv.conversationId); setMenuOpenId(null); }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(conv.conversationId); setMenuOpenId(null); }}>Delete</button>
          </div>
        )}
      </div>
    </div>
  )) : <p className="no-conversations">No conversations yet</p>}
</div>

      </div>

      <div className="chat-box">
        <div className="top-right-icon" onClick={() => setShowDropdown(!showDropdown)}>
          <FaUserCircle />
        </div>

        {showDropdown && (
          <div className="dropdown-box">
            <p><strong>{user?.username}</strong></p>
            <button className="dropdown-item" onClick={handleLogout}>Logout</button>
          </div>
        )}

        {showSettings && (
          <div className="settings-panel">
            <h3>Settings</h3>
            <div className="setting-item" onClick={() => setDarkMode(!darkMode)}>
              <FaMoon /> Theme: {darkMode ? 'Dark' : 'Light'}
            </div>
            <div className="setting-item" onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
              <FaBell /> Notifications: {notificationsEnabled ? 'On' : 'Off'}
            </div>
            <button onClick={() => setShowSettings(false)}>Close</button>
          </div>
        )}

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.sender}`}>
              <div className="message-content">
                {(msg.text || '').split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}<br /></React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask anything about your business data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;