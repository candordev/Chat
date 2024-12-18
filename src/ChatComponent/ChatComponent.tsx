import { useParams } from 'react-router-dom';
import ChatNoWidget from '../ChatNoWidget/ChatNoWidget';
import ChatWidget from '../ChatWidget/ChatWidget';
import './ChatComponent.css';
import ThirdstoneLogo from './ThirdstoneLogo.png';


const ChatComponent = () => {
  const { chatFormat } = useParams<{ chatFormat: string }>();
  const { mobile } = useParams<{ mobile: string }>();
  if (chatFormat === "no-widget") {
    return (
      <div >
        {mobile === "truesadf" && (
          <div className="back-image-container" onClick={() => window.location.href = 'https://www.thirdstoneproperties.com'} style={{cursor: 'pointer'}}>
            <img
              src={ThirdstoneLogo}
              alt="Back to Thirdstone"
              className="back-image"
            />
          </div>
        )}
        <ChatNoWidget mobile={mobile} />
      </div>
    );
  } else {
    return <ChatWidget />;
  }
};

export default ChatComponent;
