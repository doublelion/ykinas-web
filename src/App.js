import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Header from './components/Header';
import Footer from './components/Footer';
import Portfolio from './pages/Portfolio';
import Contact from './pages/Contact';
import Audit from './pages/Audit';
import './App.scss';

function App() {
  return (
    <Router>
      <div className="ykinas-app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/audit" element={<Audit />} /> {/* 신규 경로 */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;