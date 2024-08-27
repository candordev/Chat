import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatComponent from './ChatComponent/ChatComponent';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/:chatFormat?/:mobile?" element={<ChatComponent />} />
      </Routes>
    </Router>
  );
};

export default App;
