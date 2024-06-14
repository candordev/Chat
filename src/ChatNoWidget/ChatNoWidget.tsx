import { useState, useEffect } from 'react'
import classNames from 'classnames';
import './ChatNoWidget.css'

interface Chat {
  _id: string;
  content: string;
  author: "AI" | "Resident" | "Leader"; // Assuming these are the only possible authors
  date: Date;
}

interface ExampleQuestions {
  [key: string]: string[];
}

interface ChatNoWidgetProps {
  closeChat?: () => void;
}

function ChatNoWidget({closeChat}: ChatNoWidgetProps) {
  const config = {
    environment: 'localhost', // Default environment
    urls: {
      candoradmin: 'https://candoradmin.com/api',
      localhost: 'http://localhost:4000/api'
    }
  };

  const exampleQuestions: ExampleQuestions = {
    prospectiveResident: ["How do I view a home?", "Is there a pet policy?", "How much is the security deposit?"],
    currentResident: ["How do I submit a maintenance request?", "How do I login to my resident portal?", "How do I pay rent online?"],
    owner: ["Are you licensed?", "Do you have an owner portal?", "Will you manage my property if I already have a tenant in place?"]
  };

  const [groupId, setGroupId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [inputChat, setInputChat] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [contactSubmissionLoading, setContactSubmissionLoading] = useState<boolean>(false);
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [animateOut, setAnimateOut] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [city, setCity] = useState<string | null>(null);


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
      let userType = getUserType();
      setUserType(userType);
      console.log("current session id: ", sessionId);
      console.log("current user type: ", userType);
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
        setLatitude(Number(data.loc.split(',')[0]));
        setLongitude(Number(data.loc.split(',')[1]));
        setCity(data.city);
        console.log("location: ", data.loc, data.city)
      } catch (error) {
        console.error('Failed to get location', error);
      }
    }

    initialize();
    getLocation();
    
  }, [userType]);

  const resetChats = () => {
    setChats([]);
  }

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

  const getUserType = (): string | null => {
    return localStorage.getItem('userType');
  }

  const generateSessionId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleUserTypeChange = (userType: string) => {
    console.log(`Setting userType to: ${userType}`);
    localStorage.setItem('userType', userType);
    setUserType(userType);
    resetChats();
    resetSessionId();
  }

  const resetSessionId = () => {
    const newSessionId = generateSessionId();
    localStorage.setItem('candorSessionID', newSessionId);
    setSessionId(newSessionId);
  };

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
      if (!userType) {
        return
      }
      
      if (!text.trim()) {
        return;
      }

      const response = await fetch(`${baseUrl}/chat/webChatReply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userMessage: text, 
          userSessionID: sessionId,
          userType: userType,
          groupId: groupId,
          latitude: latitude,
          longitude: longitude,
          city: city
        })
      });
      if (!response.ok) throw new Error('Failed to send chat');
    
      const responseData = await response.json();

      if(responseData.status === 200 && responseData.contactForm) {
        console.log("trying to show the contact form!")
        displayContactForm();
      } else {
        await fetchChats();
      }
    } catch (error) {
      console.error('Failed to send chat', error);
    } finally {
      setLoading(false);
    }
  } 

  const displayContactForm = () => {
    setShowContactForm(true);
  }

  const hideContactForm = () => {
    setShowContactForm(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhoneNumber('');
  }

  const submitContactForm = async () => {
    try {
      if (!firstName || !lastName || !email || !phoneNumber) {
        return;
      }
      setContactSubmissionLoading(true);
      const baseUrl = getBaseUrl();
      const sessionId = getSessionId();
      const response = await fetch(`${baseUrl}/chat/submitContactForm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              sessionId: sessionId,
              firstName: firstName,
              lastName: lastName,
              email: email,
              phoneNumber: phoneNumber,
              groupId: groupId
          })
      });
      if (response.ok) {
        hideContactForm();
        const message = `Contact Information:\nFirst Name: ${firstName}\nLast Name: ${lastName}\nEmail: ${email}\nPhone Number: ${phoneNumber}`;
        await sendChat(message);
      } else {
          console.error('Failed to submit contact form');
      }
    } catch (error) {
      console.error('Failed to submit contact form', error);
    } finally {
      setContactSubmissionLoading(false);
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendChat(inputChat);
    }
  };

  const handleCloseChat = () => {
    setAnimateOut(true);
    setTimeout(() => {
      closeChat && closeChat();
      setAnimateOut(false);
    }, 500);
  }

  const isFormFilled = firstName && lastName && email && phoneNumber;

  return (
    <div id="chatContainer" className={animateOut ? 'slideUp' : ''}>
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
        <div className="message from-bot">To get your conversation started, choose from one of the following options below and type a question in the entry field.</div>
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
      {userType && chats.length == 0 && (
        <div id="exampleQuestionsContainer">
          {exampleQuestions[userType].map((question, index) => {
            return (
              <div key={index} className="example-question" onClick={() => {sendChat(question)}}>{question}</div>
            );
          })}
        </div>
      )}
      <div id="chatControls">
        <div id="chatOptions">
          <div id="chatButtonsRow">
            <button
              id="prospectiveTenant"
              className={classNames(
                'optionText flex-1 m-1 p-1 text-white rounded transition duration-300 min-w-[90px] whitespace-nowrap hover:bg-[#053c6b]',
                { 'selected bg-[#053c6b]': userType === 'prospectiveResident' },
                { 'bg-[#bcd1ea]': userType !== 'prospectiveResident'}
              )}
              onClick={() => handleUserTypeChange('prospectiveResident')}
            >
              Prospective Tenant
            </button>
            <button
              id="currentTenant"
              className={classNames(
                'optionText flex-1 m-1 p-1 text-white rounded transition duration-300 min-w-[90px] whitespace-nowrap hover:bg-[#053c6b]',
                { 'selected bg-[#053c6b]': userType === 'currentResident' },
                { 'bg-[#bcd1ea]': userType !== 'currentResident'}
              )}
              onClick={() => handleUserTypeChange('currentResident')}
            >
              Current Tenant
            </button>
            <button
              id="homeOwner"
              className={classNames(
                'optionText flex-1 m-1 p-1 text-white rounded transition duration-300 min-w-[90px] whitespace-nowrap hover:bg-[#053c6b]',
                { 'selected bg-[#053c6b]': userType === 'owner' },
                { 'bg-[#bcd1ea]': userType !== 'owner'}
              )}
              onClick={() => handleUserTypeChange('owner')}
            >
              Home Owner
            </button>
          </div>
        </div>
        {userType && 
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
        }
      </div>
      <div id="termsAndConditions">
        <a id="linkTC" href="https://www.thirdstoneproperties.com/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-xs text-[#053c6b] no-underline">Terms and Conditions</a>
      </div>
      {showContactForm && (
        <div id="contactFormContainer">
          <div id="contactForm">
            <h3 className="font-bold">Contact Information</h3>
            <input type="text" id="firstName" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
            <input type="text" id="lastName" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input type="email" id="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}/>
            <input type="tel" id="phoneNumber" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}/>
            <div id="formButtons">
              <button id="noThanksButton" onClick={()=>{hideContactForm()}}>No Thanks</button>
              <button
                id="sendContactFormButton"
                onClick={submitContactForm}
                className={classNames(
                  { 'disabled': !isFormFilled },
                  { 'enabled': isFormFilled }
                )}
                disabled={!isFormFilled || contactSubmissionLoading}
              >
                {contactSubmissionLoading ? 'Sending ...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatNoWidget
