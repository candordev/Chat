import { useState, useEffect } from 'react'
import './ChatNoWidget.css'

interface Chat {
  _id: string;
  content: string;
  author: "AI" | "Resident" | "Leader"; // Assuming these are the only possible authors
  date: Date;
}

interface ChatNoWidgetPropertiesProps {
  closeChat?: () => void;
}

function ChatNoWidgetProperties({closeChat}: ChatNoWidgetPropertiesProps) {
  const config = {
    environment: 'localhost', // Default environment
    urls: {
      candoradmin: 'https://candoradmin.com/api',
      localhost: 'http://localhost:4000/api'
    }
  };

  const [groupId, setGroupId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [inputChat, setInputChat] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Set groupId based on the environment
    console.log('useEffect called');
    const initialize = async () => {
      if (config.environment === 'localhost') {
        setGroupId('6657a0e9d9f0ae27bd3e0021'); // DEV groupId
      } else if (config.environment === 'candoradmin') {
        setGroupId('663fa89af38d72f0490da655'); // PRODUCTION groupId
      }

      let sessionId = getSessionId(); 

      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('candorSessionID', sessionId);
      } 
      setSessionId(sessionId);
      await fetchChats();
    };
    const getLocation = async () => {
      try {
        const response = await fetch("https://ipinfo.io/json?token=00bb23c8331675", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error('Failed to get location');
        const data = await response.json();
        console.log("location:", response);
        console.log("location: ", data.loc, data.city)
      } catch (error) {
        console.error('Failed to get location', error);
      }
    }

    initialize();
    getLocation();
    
  }, []);

  // const resetChats = () => {
  //   setChats([]);
  // }

  const fetchChats = async () => {
    try {
      if (!sessionId || !groupId) return;
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/chat/getWebChats?sessionId=${sessionId}&page=1&limit=10&groupID=${groupId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setChats(data.data.reverse());
    } catch (error) {
      console.error('Failed to fetch chats', error);
    }
  };

  const getBaseUrl = (): string => {
    return config.urls[config.environment as keyof typeof config.urls];
  };

  const getSessionId = (): string | null => {
    return localStorage.getItem('candorSessionID');
  };


  const generateSessionId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  // const resetSessionId = () => {
  //   const newSessionId = generateSessionId();
  //   localStorage.setItem('candorSessionID', newSessionId);
  //   setSessionId(newSessionId);
  // };

  const  sendChat = async (text: string) => {
    try {
      const baseUrl = getBaseUrl();
      const tempChat: Chat = {
        _id: 'temp',
        content: text,
        author: 'Resident',
        date: new Date()
      };
      setLoading(true);
      setInputChat('');
      setChats((prevChats) => [...prevChats, tempChat]);
      
      if (!text.trim()) {
        return;
      }

      const response = await fetch(`${baseUrl}/chat/listingsAssistantAI`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          Body: text, 
          From: sessionId,
          groupId: groupId
        })
      });

      if (!response.ok) throw new Error('Failed to send chat');
    
    //   const responseData = await response.json();

      fetchChats();
    } catch (error) {
      console.error('Failed to send chat', error);
    } finally {
      setLoading(false);
    }
  } 


  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendChat(inputChat);
    }
  };

  return (
    <div id="chatContainer" className={'slideUp'}>
      <div id="chatHeader">
        <div id="chatIconHeader">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#053c6b" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="feather feather-message-square">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div className="ml-4 flex-grow flex flex-col justify-center">
          <span className="text-lg font-medium">Welcome to the Thirdstone Assistant!</span>
          <span className="mt-2 text-gray-500 text-sm font-light">Online</span>
        </div>
        {closeChat && (
          <button id="closeButton" onClick={closeChat}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        )}
      </div>
      <div id="messagesView">
        <div className="message from-bot">To get your conversation started, ask a question about any Thirdstone Property.</div>
        {chats.map((chat, index) => {
          return (
            <div key={index} className={`message ${chat.author === 'AI' ? 'from-bot' : 'from-user'}`}>{chat.content}</div>
          );
        })}
        {loading && 
          <div className="message from-bot">
            <div className="loading-dots">
                <div></div>
                <div></div>
                <div></div>
            </div>
          </div>
        }
      </div>
        <div id="chatControls">
          <div id="chatInputContainer">
            <input
              type="text"
              id="messageInput"
              placeholder="Type your message..."
              value={inputChat}
              onChange={(e) => setInputChat(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button id="sendButton" onClick={()=>{sendChat(inputChat)}}>Send</button>
          </div>
      </div>
      <div id="termsAndConditions">
        <a id="linkTC" href="https://www.thirdstoneproperties.com/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-xs text-[#053c6b] no-underline">Terms and Conditions</a>
      </div>
    </div>
  );
}

export default ChatNoWidgetProperties
