import { useParams } from 'react-router-dom';
import ChatNoWidget from './ChatNoWidget/ChatNoWidget';
import ChatWidget from './ChatWidget/ChatWidget';
import ChatNoWidgetProperties from './ChatNoWidget/ChatNoWidgetProperties';


const ChatComponent = () => {
  const { chatFormat, chatType } = useParams<{ chatFormat: string, chatType: string }>();

  if (chatFormat === "no-widget") {
    if (chatType === "properties") {
      return <ChatNoWidgetProperties />;
    } else {
      return <ChatNoWidget />; 
    }
  } else {
    return <ChatWidget chatType={chatType} />;
  }
};

export default ChatComponent;
