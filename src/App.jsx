import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';

import Main from "./pages/Main";
import Play from "./pages/Play";
import Event from "./pages/Event";
import Store from "./pages/Store";

import Header from "./components/Header";
import Footer from "./components/Footer";

const App = () => {
  return (
    <>
      <AnimatePresence>
        <Router>
          <Header/>
          <Routes>
            <Route path="" element={<Main />}/>
            <Route path="/play" element={<Play />}/>
            <Route path="/event" element={<Event />}/>
            <Route path="/store" element={<Store />}/>
          </Routes>
          <Footer/>
        </Router>
      </AnimatePresence>
    </>
  );
};

export default App;