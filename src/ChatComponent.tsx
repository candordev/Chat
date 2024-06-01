import { useParams } from 'react-router-dom';
import ChatNoWidget from './ChatNoWidget/ChatNoWidget';
import ChatWidget from './ChatWidget/ChatWidget';


const ChatComponent = () => {
  const { type } = useParams<{ type: string }>();

  if (type === "no-widget") {
    return <ChatNoWidget />;
  } else {
    return <ChatWidget />;
  }
};

export default ChatComponent;
