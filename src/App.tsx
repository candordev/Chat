import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatComponent from './ChatComponent';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/:chatFormat?/:chatType?" element={<ChatComponent />} />
      </Routes>
    </Router>
  );
};

export default App;
