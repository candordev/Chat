import { useState, useEffect, useRef } from 'react'
import classNames from 'classnames';
import './ChatNoWidget.css'
import React from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import linkifyStr from 'linkify-string';

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
  mobile?: string;
}

function ChatNoWidget({closeChat}: ChatNoWidgetProps) {
  const config = {
    environment: 'candoradmin', // Default environment
    urls: {
      candoradmin: 'https://candoradmin.com/api',
      localhost: 'http://localhost:4000/api',
      productionTest: 'https://candoradmin.com/api'
    }
  };

  const exampleQuestions: ExampleQuestions = {
    prospectiveResident: ["How do I view a home?", "Is there a pet policy?", "How much is the security deposit?"],
    currentResident: ["How do I submit a maintenance request?", "How do I login to my resident portal?", "How do I pay rent online?"],
    owner: ["Are you licensed?", "Do you have an owner portal?", "Will you manage my property if I already have a tenant in place?"]
  };

  const [groupId, setGroupId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [chatStart, setChatStart] = useState<string | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState<boolean>(false);
  const [homeButtonClicked, setHomeButtonClicked] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add this useEffect hook to scroll to the bottom when chats change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, currentPage]);

  useEffect(() => {
    // Set groupId based on the environment
    console.log('useEffect called');
    const initialize = async () => {
      if (config.environment === 'localhost') {
        setGroupId('6657a0e9d9f0ae27bd3e0021'); // DEV groupId
      } else if (config.environment === 'candoradmin') {
        setGroupId('663fa89af38d72f0490da655'); // PRODUCTION groupId
      } else if (config.environment === 'productionTest') {
        setGroupId('6657a0e9d9f0ae27bd3e0021'); // DEV groupId
      }

      let sessionId = getSessionId(); 
      let userType = getUserType();
      let currentPage = getCurrentPage();
      
      setUserType(userType);
      setCurrentPage(currentPage);

      getChatStart();

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

  const getChatStart = () => {
    let start = localStorage.getItem('chatStart');
    if (!start) {
      const date = new Date();
      start = date.toISOString();
      localStorage.setItem('chatStart', start);
    }
    setChatStart(start);
    return start;
  }

  const setChatStartHelper = (start: string) => {
    localStorage.setItem('chatStart', start);
    setChatStart(start);
  }

  const fetchChats = async () => {
    try {
      if (!sessionId || !groupId) return;
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/chat/getWebChats?sessionId=${sessionId}&page=1&limit=100&groupID=${groupId}`, {
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

  const getCurrentPage = (): string | null => {
    const currentPage =  localStorage.getItem('currentPage');
    if (!currentPage) {
      localStorage.setItem('currentPage', 'main-menu');
      return 'main-menu';
    }
    return currentPage;
  }

  const changeCurrentPage = (currentPage: string) => {
    localStorage.setItem('currentPage', currentPage)
    setCurrentPage(currentPage)
  } 

  const menuToChatPage = () => {
    handleUserTypeChange(null);
    changeCurrentPage('chat')
  }

  const getSessionId = (): string | null => {
    return localStorage.getItem('candorSessionID');
  };

  const getUserType = (): string | null => {
    return localStorage.getItem('userType');
  }

  const generateSessionId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleCloseClick = () => {
    if (currentPage === 'chat') {
      setShowExitConfirmation(true);
    } else if (closeChat) {
      closeChat();
    }
  };

  const handleUserTypeChange = (userType: string | null) => {
    console.log(`Setting userType to: ${userType}`);
    if (userType) {
      localStorage.setItem('userType', userType);
    } else {
      localStorage.setItem('userType', "")
    }
    setUserType(userType);
    resetChats();
    resetSessionId();
    const date = new Date();
    const start = date.toISOString();
    setChatStartHelper(start);
  }

  const resetSessionId = () => {
    const newSessionId = generateSessionId();
    localStorage.setItem('candorSessionID', newSessionId);
    setSessionId(newSessionId);
  };

  const sendChat = async (text: string) => {
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

      const response = await fetch(`${baseUrl}/chat/thirdstoneChatReply`, {
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

  const renderContent = (content: string) => {
    const options = {
      attributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    };
    linkifyStr(content, options);
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  };
  
  const formatTime = (date: Date) => {
    return format(new Date(date), 'p');
  };

  const isFormFilled = firstName && lastName && email && phoneNumber;

  const renderMainMenu = () => (
    <div id="mainMenu">
        <>
          <button className="menuButton" onClick={menuToChatPage}>
            Chat
            <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#FFFFFF">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M8 10.5H16" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"></path>
                <path d="M8 14H13.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"></path>
                <path d="M17 3.33782C15.5291 2.48697 13.8214 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22C17.5228 22 22 17.5228 22 12C22 10.1786 21.513 8.47087 20.6622 7" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"></path>
              </g>
            </svg>
          </button>
          <button className="menuButton" onClick={() => window.open("https://thirdstoneproperties.com/#contact-us", "_blank", "noopener,noreferrer")}>
            Email Us
            <svg width="25px" height="25px" viewBox="0 -2.5 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <title>email [#ffffff]</title>
                <desc>Created with Sketch.</desc>
                <defs></defs>
                <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -922.000000)" fill="#ffffff">
                    <g id="icons" transform="translate(56.000000, 160.000000)">
                      <path d="M262,764.291 L254,771.318 L246,764.281 L246,764 L262,764 L262,764.291 Z M246,775 L246,766.945 L254,773.98 L262,766.953 L262,775 L246,775 Z M244,777 L264,777 L264,762 L244,762 L244,777 Z" id="email-[#ffffff]"></path>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </button>
          <button className="menuButton" onClick={() => window.open("https://calendly.com/thirdstoneproperties/30min", "_blank", "noopener,noreferrer")}>
            Schedule Appointment
            <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M3 9H21M7 3V5M17 3V5M6 12H8M11 12H13M16 12H18M6 15H8M11 15H13M16 15H18M6 18H8M11 18H13M16 18H18M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round"></path>
              </g>
            </svg>
          </button>
        </>
      
    </div>
  );

  const automatedChats = !userType ? [{author: "AI", content: "Hi I'm Thirdstone Assistant. To get your conversation started, choose the option below that best describes you."}] : [{author: "AI", content: "Hi I'm Thirdstone Assistant. To get your conversation started, choose the option below that best describes you."}, {author: "AI", content: "Heard! Please select one of the following questions or type your own question."}]
  const renderChatInterface = () => (
    <>
      <div id="messagesView">
        {automatedChats.map((chat, index) => {
          const isLastInGroup =
          index === automatedChats.length - 1 ||
          automatedChats[index + 1].author !== chat.author;

          return (
            <div key={index} className={`message-group AI`}>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                {isLastInGroup ? (
                  <div className="ai-icon">
                    <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C14 2.74028 13.5978 3.38663 13 3.73244V4H20C21.6569 4 23 5.34315 23 7V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V7C1 5.34315 2.34315 4 4 4H11V3.73244C10.4022 3.38663 10 2.74028 10 2C10 0.895431 10.8954 0 12 0C13.1046 0 14 0.895431 14 2ZM4 6H11H13H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6ZM15 11.5C15 10.6716 15.6716 10 16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5ZM16.5 8C14.567 8 13 9.567 13 11.5C13 13.433 14.567 15 16.5 15C18.433 15 20 13.433 20 11.5C20 9.567 18.433 8 16.5 8ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13C8.32843 13 9 12.3284 9 11.5C9 10.6716 8.32843 10 7.5 10ZM4 11.5C4 9.567 5.567 8 7.5 8C9.433 8 11 9.567 11 11.5C11 13.433 9.433 15 7.5 15C5.567 15 4 13.433 4 11.5ZM10.8944 16.5528C10.6474 16.0588 10.0468 15.8586 9.55279 16.1056C9.05881 16.3526 8.85858 16.9532 9.10557 17.4472C9.68052 18.5971 10.9822 19 12 19C13.0178 19 14.3195 18.5971 14.8944 17.4472C15.1414 16.9532 14.9412 16.3526 14.4472 16.1056C13.9532 15.8586 13.3526 16.0588 13.1056 16.5528C13.0139 16.7362 12.6488 17 12 17C11.3512 17 10.9861 16.7362 10.8944 16.5528Z" fill="#3399ff"></path> </g></svg>
                  </div>
                ) : (
                  <div className="ai-icon-placeholder"></div>
                )}
                <div className={`message from-bot`}>
                  {renderContent(chat.content)}
                </div>
              </div>
              {chatStart && isLastInGroup && (
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className="ai-icon-placeholder"></div>
                  <div className="timestamp">
                    {`Thirdstone Assistant | ${formatTime(new Date(chatStart))}`}
                  </div>
                </div>
              )}
            </div>
          );

        })}

          {chats.length === 0 && !userType && (
            <div style={{flexDirection: 'row', display: 'flex'}}>
              <div className="ai-icon-placeholder"></div>
              <div className="user-type-button-container">
                <button className="user-type-button" onClick={()=>{handleUserTypeChange("prospectiveResident")}}>Looking To Rent A Home</button>
                <button className="user-type-button" onClick={()=>{handleUserTypeChange("currentResident")}}>Current Thirdstone Tenant</button>
                <button className="user-type-button" onClick={()=>{
                    handleUserTypeChange("owner")
                    setShowContactForm(true)
                  }}>Property Owner</button>
              </div>  
          </div>
        )}

        {showExitConfirmation && (
          <div id="confirmationModal">
            <div className="modalContent">
              <h3>Are you sure you want to exit the session?</h3>
              <div className="modalButtons">
                <button onClick={() => {
                  setShowExitConfirmation(false);
                  if (closeChat && !homeButtonClicked) {
                    closeChat();
                  }
                  setHomeButtonClicked(false);
                  changeCurrentPage('main-menu');
                }}>Yes</button>
                <button onClick={() => setShowExitConfirmation(false)}>No</button>
              </div>
            </div>
          </div>
        )}

        {chats.map((chat, index) => {
          const isLastInGroup =
            index === chats.length - 1 ||
            chats[index + 1].author !== chat.author;

          return (
            <div key={index} className={`message-group ${chat.author === 'AI' ? 'from-bot-group' : ''}`}>
              {chat.author === 'AI' ? (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {isLastInGroup ? (
                    <div className="ai-icon">
                      <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C14 2.74028 13.5978 3.38663 13 3.73244V4H20C21.6569 4 23 5.34315 23 7V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V7C1 5.34315 2.34315 4 4 4H11V3.73244C10.4022 3.38663 10 2.74028 10 2C10 0.895431 10.8954 0 12 0C13.1046 0 14 0.895431 14 2ZM4 6H11H13H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6ZM15 11.5C15 10.6716 15.6716 10 16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5ZM16.5 8C14.567 8 13 9.567 13 11.5C13 13.433 14.567 15 16.5 15C18.433 15 20 13.433 20 11.5C20 9.567 18.433 8 16.5 8ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13C8.32843 13 9 12.3284 9 11.5C9 10.6716 8.32843 10 7.5 10ZM4 11.5C4 9.567 5.567 8 7.5 8C9.433 8 11 9.567 11 11.5C11 13.433 9.433 15 7.5 15C5.567 15 4 13.433 4 11.5ZM10.8944 16.5528C10.6474 16.0588 10.0468 15.8586 9.55279 16.1056C9.05881 16.3526 8.85858 16.9532 9.10557 17.4472C9.68052 18.5971 10.9822 19 12 19C13.0178 19 14.3195 18.5971 14.8944 17.4472C15.1414 16.9532 14.9412 16.3526 14.4472 16.1056C13.9532 15.8586 13.3526 16.0588 13.1056 16.5528C13.0139 16.7362 12.6488 17 12 17C11.3512 17 10.9861 16.7362 10.8944 16.5528Z" fill="#3399ff"></path> </g></svg>
                    </div>
                  ) : (
                    <div className="ai-icon-placeholder"></div>
                  )}
                  <div className={`message from-bot`}>
                    {renderContent(chat.content)}
                  </div>
                </div>
              ) : (
                <div className={`message from-user`}>
                  {renderContent(chat.content)}
                </div>
              )}
              {isLastInGroup && chat.author === 'AI' && (     
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className="ai-icon-placeholder"></div>
                  <div className="timestamp">
                    {`Thirdstone Assistant | ${formatTime(chat.date)}`}
                  </div>
                </div>
              )}
              {isLastInGroup && chat.author !== 'AI' && (     
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', width: '100%' }}>
                  <div className="timestamp">
                    {formatTime(chat.date)}
                  </div>
                </div>
              )}
            </div>
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
        <div ref={messagesEndRef} />
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
      
          <div id="chatInputContainer" style={{ display: 'flex', alignItems: 'center' }}>
            <div
              id="homeButton"
              style={{ marginRight: '10px', cursor: 'pointer' }}
              onClick={() => {
                setHomeButtonClicked(true)
                handleCloseClick()
              }}
            >
              <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5.77778 10.2222V18C5.77778 19.1046 6.67321 20 7.77778 20H12M5.77778 10.2222L11.2929 4.70711C11.6834 4.31658 12.3166 4.31658 12.7071 4.70711L17.5 9.5M5.77778 10.2222L4 12M18.2222 10.2222V18C18.2222 19.1046 17.3268 20 16.2222 20H12M18.2222 10.2222L20 12M18.2222 10.2222L17.5 9.5M17.5 9.5V6M12 20V15" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            </div>
            <input
              type="text"
              id="messageInput"
              placeholder={userType ? "Type your message..." : "Select one of the options above to start chatting"}
              value={inputChat}
              disabled={loading || !userType}
              onChange={(e) => setInputChat(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ flex: '1' }}
            />

            <button id="sendButton" disabled={inputChat.length === 0} className = {inputChat.length === 0 ? 'disabled' : ''} onClick={() => sendChat(inputChat)}>
              Send
            </button>
          </div>
        
      </div>
    </>
  );

  return (
      <div id="chatContainer" className={'slideUp'}>
        <div id="chatHeader">
          {/* {mobile && mobile === 'true' && (
            <div id="backArrow" className="mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-arrow-left"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </div>
          )} */}
          <div id="chatIconHeader">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3399ff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="feather feather-message-square">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="ml-4 flex-grow flex flex-col justify-center">
            <span className="text-lg font-medium">Thirdstone Assistant</span>
            <span
              className={`mt-1 text-sm font-light ${
                currentPage === 'chat' ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              Online
            </span>
          </div>
          {closeChat && (
            <button id="closeButton" onClick={handleCloseClick}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          )}
        </div>
        {currentPage === 'main-menu' ? renderMainMenu() : renderChatInterface()}
        {showContactForm && (
          <div id="contactFormContainer">
            <div id="contactForm">
              <h3 className="font-bold">Contact Information</h3>
              {userType && userType === 'owner' && (
                <p style={{marginBottom: '10px'}}>
                  If you do not already manage your property with us, please fill this out! Also reach out to us directly
                  <span style={{ marginLeft: '5px' }}>
                    <a 
                      href="https://www.thirdstoneproperties.com/property-management" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'blue', textDecoration: 'underline'}}
                    >
                      here
                    </a>.
                  </span>
                </p>
              )}

              <input type="text" id="firstName" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input type="text" id="lastName" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <input type="email" id="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="tel" id="phoneNumber" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              <div id="formButtons">
                <button id="noThanksButton" onClick={() => { hideContactForm() }}>No Thanks</button>
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
