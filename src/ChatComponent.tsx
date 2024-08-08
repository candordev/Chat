import { useParams } from 'react-router-dom';
import ChatNoWidget from './ChatNoWidget/ChatNoWidget';
import ChatWidget from './ChatWidget/ChatWidget';


const ChatComponent = () => {
  const { chatFormat } = useParams<{ chatFormat: string }>();

  if (chatFormat === "no-widget") {
    return <ChatNoWidget />;
  } else {
    return <ChatWidget />;
  }
};

export default ChatComponent;
