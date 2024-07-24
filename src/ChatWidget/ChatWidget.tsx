import { useState } from 'react';
import './ChatWidget.css';
import ChatNoWidget from '../ChatNoWidget/ChatNoWidget';
import ChatNoWidgetProperties from '../ChatNoWidget/ChatNoWidgetProperties';

interface ChatWidgetProps {
  chatType?: string;
}

function ChatWidget({ chatType }: ChatWidgetProps) {
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [showChat, setShowChat] = useState<boolean>(false);

  const sendMessageToParent = (message: string) => {
    window.parent.postMessage(message, 'https://www.candornow.com');
    window.parent.postMessage(message, 'https://www.thirdstoneproperties.com');
  };

  const handleShowChatChange = (show: boolean) => {
    setShowChat(show);
    sendMessageToParent(show ? 'Expanded' : showPopup ? 'Collapsed Popup' : 'Collapsed');
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    sendMessageToParent('Collapsed');
  };

  const handleCloseChat = () => {
    handleShowChatChange(false);
  };

  return (
    <>
      {!showChat ? (
        <div>
          {showPopup && (
            <div id="popup">
              <span id="popupText">Have any property questions? Ask here!</span>
              <button id="closePopup" onClick={handleClosePopup}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-x"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}
          <div id="chatIcon" onClick={() => handleShowChatChange(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#053c6b"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-message-square"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        </div>
      ) : chatType === 'properties' ? (
        <ChatNoWidgetProperties closeChat={handleCloseChat} />
      ) : (
        <ChatNoWidget closeChat={handleCloseChat} />
      )}
    </>
  );
}

export default ChatWidget;