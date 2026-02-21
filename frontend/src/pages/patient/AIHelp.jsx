import React, { useState, useRef, useEffect } from 'react';
import "../../styles/theme.css";
import "../../styles/patient-components.css";

const AIHelp = ({ patientId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Create new session or load existing
    createNewSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const createNewSession = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/patient/ai/session.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          patientID: patientId,
          action: 'create'
        })
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionID);
        // Add welcome message
        setMessages([{
          id: 'welcome',
          sender: 'ai',
          content: 'Hello! I\'m your AI health assistant. How can I help you today? You can ask me about symptoms, medications, or general health information.',
          time: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: inputMessage,
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/patient/ai/chat.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionID: sessionId,
          message: inputMessage,
          patientID: patientId
        })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          sender: 'ai',
          content: data.response,
          time: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Error message
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'ai',
          content: 'I apologize, but I encountered an error. Please try again or contact support.',
          time: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        content: 'Network error. Please check your connection.',
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    "What are symptoms of flu?",
    "Medication reminders",
    "Book an appointment",
    "Healthy lifestyle tips"
  ];

  return (
    <div className="ai-help">
      <div className="content-header">
        <h2>AI Health Assistant</h2>
        <p>Ask me anything about your health</p>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.sender}`}>
              <div className="message-content">
                {message.sender === 'ai' && (
                  <div className="message-avatar">
                    <i className="fas fa-robot"></i>
                  </div>
                )}
                <div className="message-bubble">
                  <p>{message.content}</p>
                  <span className="message-time">{message.time}</span>
                </div>
                {message.sender === 'user' && (
                  <div className="message-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message ai">
              <div className="message-content">
                <div className="message-avatar">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="message-bubble typing">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="suggestions">
            <p>Suggested questions:</p>
            <div className="suggestion-buttons">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-btn"
                  onClick={() => {
                    setInputMessage(suggestion);
                    setTimeout(sendMessage, 100);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question here..."
            rows="1"
            disabled={loading}
          />
          <button 
            onClick={sendMessage} 
            disabled={!inputMessage.trim() || loading}
            className="send-btn"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>

        <div className="chat-disclaimer">
          <i className="fas fa-info-circle"></i>
          <small>AI assistant provides general information only. For emergencies, call 911 immediately.</small>
        </div>
      </div>
    </div>
  );
};

export default AIHelp;