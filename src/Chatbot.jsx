import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

const Chatbot = ({ activeContext, chatHistory, setChatHistory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Keep track of the last processed timestamp so we don't spam duplicate messages
  const [lastProcessed, setLastProcessed] = useState(null);

  useEffect(() => {
    if (activeContext && activeContext.timestamp !== lastProcessed) {
      setIsOpen(true);
      setLastProcessed(activeContext.timestamp);
      
      const systemMessage = generateContextMessage(activeContext);
      
      if (systemMessage) {
        // Prevent duplicate consecutive messages
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].text === systemMessage) {
          return; 
        }
        
        setChatHistory(prev => [...prev, { sender: 'bot', text: systemMessage, id: Date.now() }]);
      }
    }
  }, [activeContext, lastProcessed, chatHistory]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isOpen]);

  const generateContextMessage = (ctx) => {
    if (ctx.type === 'suspect') {
      return `I see you selected the vessel **${ctx.data.vessel_name}** (MMSI: ${ctx.data.mmsi}). This is a ${ctx.data.vessel_type} with a ${(ctx.data.final_score * 100).toFixed(0)}% match probability. It was last recorded traveling at ${ctx.data.last_known_speed_knots} knots and its AIS transponder went dark ${ctx.data.went_dark_hours_ago} hours ago. Its proximity and kinematics make it a strong suspect.`;
    }
    if (ctx.type === 'detection') {
      return `You're looking at the **Spill Detection Area**. The AI model detected an oil slick here with ${(ctx.data.confidence * 100).toFixed(1)}% confidence. The total affected surface area is estimated at ${ctx.data.geometry.area_km2} km².`;
    }
    if (ctx.type === 'origin') {
      return `This orange zone represents the **Estimated Origin Probability Area**. Based on Monte Carlo hindcast simulations, the oil most likely originated from within this bounding box between 09:00 and 11:00 UTC.`;
    }
    if (ctx.type === 'forecast') {
      return `This purple dashed polygon is the **Forward Forecast Path**. It projects the anticipated drift of the oil spill over the next few days based on current oceanographic and wind data.`;
    }
    return null;
  };

  const handleClear = () => {
    setChatHistory([{ sender: 'bot', text: 'Hello! I am your AI assistant. Click or hover on map items or the suspect list to learn more about the analysis.', id: Date.now() }]);
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : 'closed'}`}>
      <div className="chatbot-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="chatbot-header-left">
          <div className="chatbot-avatar">🤖</div>
          <span className="chatbot-header-title">AI Assistant</span>
        </div>
        <button>{isOpen ? '▼' : '▲'}</button>
      </div>
      {isOpen && (
        <>
          <div className="chatbot-messages">
            {chatHistory.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input">
             <button onClick={handleClear} className="clear-btn">Clear Chat</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chatbot;
