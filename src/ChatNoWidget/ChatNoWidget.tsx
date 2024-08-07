import { useState, useEffect, useRef } from 'react'
import classNames from 'classnames';
import './ChatNoWidget.css'
import Linkify from 'linkify-it';
import React from 'react';
import { JSX } from 'react/jsx-runtime';
import { format, set } from 'date-fns';

const linkify = new Linkify();

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
    resetSessionId()
    setChats([])
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
    // Split the content into parts by detecting the bold pattern '**'
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
  
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold formatting
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      } else {
        // Handle links and newlines within the normal text parts
        const matches = linkify.match(part);
        if (matches) {
          let lastIndex = 0;
          const subParts: any[] | JSX.Element = [];
  
          matches.forEach((match, index) => {
            // Add text before the link and handle newlines
            if (match.index > lastIndex) {
              const textBeforeLink = part.substring(lastIndex, match.index);
              textBeforeLink.split('\n').forEach((subPart, j, arr) => {
                subParts.push(subPart);
                if (j < arr.length - 1) {
                  subParts.push(<br key={`br-${i}-${j}`} />);
                }
              });
            }
            // Add the link
            subParts.push(
              <a href={match.url} key={index} target="_blank" rel="noopener noreferrer">
                {match.text}
              </a>
            );
            lastIndex = match.lastIndex;
          });
  
          // Add any remaining text after the last link and handle newlines
          if (lastIndex < part.length) {
            const textAfterLastLink = part.substring(lastIndex);
            textAfterLastLink.split('\n').forEach((subPart, j, arr) => {
              subParts.push(subPart);
              if (j < arr.length - 1) {
                subParts.push(<br key={`br-${i}-${lastIndex}-${j}`} />);
              }
            });
          }
  
          return subParts;
        }
  
        // Handle newlines in the entire content if no links are present
        return part.split('\n').map((subPart, j, arr) => (
          <React.Fragment key={j}>
            {subPart}
            {j < arr.length - 1 && <br />}
          </React.Fragment>
        ));
      }
    });
  };
  
  const formatTime = (date: Date) => {
    return format(new Date(date), 'p');
  };

  const isFormFilled = firstName && lastName && email && phoneNumber;

  const renderMainMenu = () => (
    <div id="mainMenu">
      <div className="dropdownContainer">
        <label htmlFor="userTypeDropdown">Select what best describes you:</label>
        <select
          id="userTypeDropdown"
          value={userType || ""}
          onChange={(e) => handleUserTypeChange(e.target.value)}
        >
          <option value="">Select an option</option>
          <option value="prospectiveResident">Looking to Rent a Home</option>
          <option value="currentResident">Current Tenant</option>
          <option value="owner">Property Owner</option>
        </select>
      </div>
      {userType && (
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
          <button className="menuButton">
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
          <button className="menuButton">
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
      )}
      
    </div>
  );

  const renderChatInterface = () => (
    <>
      <div id="messagesView">
        <div className="message from-bot">To get your conversation started, choose from one of the following options below or type a question in the entry field.</div>
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
                      <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C14 2.74028 13.5978 3.38663 13 3.73244V4H20C21.6569 4 23 5.34315 23 7V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V7C1 5.34315 2.34315 4 4 4H11V3.73244C10.4022 3.38663 10 2.74028 10 2C10 0.895431 10.8954 0 12 0C13.1046 0 14 0.895431 14 2ZM4 6H11H13H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6ZM15 11.5C15 10.6716 15.6716 10 16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5ZM16.5 8C14.567 8 13 9.567 13 11.5C13 13.433 14.567 15 16.5 15C18.433 15 20 13.433 20 11.5C20 9.567 18.433 8 16.5 8ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13C8.32843 13 9 12.3284 9 11.5C9 10.6716 8.32843 10 7.5 10ZM4 11.5C4 9.567 5.567 8 7.5 8C9.433 8 11 9.567 11 11.5C11 13.433 9.433 15 7.5 15C5.567 15 4 13.433 4 11.5ZM10.8944 16.5528C10.6474 16.0588 10.0468 15.8586 9.55279 16.1056C9.05881 16.3526 8.85858 16.9532 9.10557 17.4472C9.68052 18.5971 10.9822 19 12 19C13.0178 19 14.3195 18.5971 14.8944 17.4472C15.1414 16.9532 14.9412 16.3526 14.4472 16.1056C13.9532 15.8586 13.3526 16.0588 13.1056 16.5528C13.0139 16.7362 12.6488 17 12 17C11.3512 17 10.9861 16.7362 10.8944 16.5528Z" fill="#053c6b"></path> </g></svg>
                    </div>
                  ) : (
                    <div className="ai-icon-placeholder"></div>
                  )}
                  <div className={`message from-bot`}>
                    {renderContent(chat.content)}
                  </div>
                </div>
              ) : (
                <div className={`message ${chat.author === 'AI' ? 'from-bot' : 'from-user'}`}>
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
        {/* <div id="chatOptions">
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
        </div> */}
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
    </>
  );

  return (
    <div id="chatContainer" className={'slideUp'}>
      <div id="chatHeader">
        <div id="chatIconHeader">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#053c6b" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="feather feather-message-square">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div className="ml-4 flex-grow flex flex-col justify-center">
          <span className="text-lg font-medium">Thirdstone Assistant</span>
          <span className="mt-1 text-gray-500 text-sm font-light"  onClick={() => changeCurrentPage('main-menu')}>Online</span>
        </div>
        {closeChat && (
          <button id="closeButton" onClick={closeChat}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        )}
      </div>
      {currentPage === 'main-menu' ? renderMainMenu() : renderChatInterface()}
      {showContactForm && (
        <div id="contactFormContainer">
          <div id="contactForm">
            <h3 className="font-bold">Contact Information</h3>
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
