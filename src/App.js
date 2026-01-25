import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'; // useParams 합치기
import { TEMPLATES } from './data/template';
import Home from './pages/Home';
import Header from './components/Header';
import Footer from './components/Footer';
import Portfolio from './pages/Portfolio';
import TemplateList from './pages/TemplateList';
// import TemplateDetail 삭제 (사용하지 않음)
import AristideV1 from './components/templates/AristideV1';
import './App.scss';

// 무거운 페이지는 lazy 로딩으로 성능 최적화
const Audit = lazy(() => import('./pages/Audit'));
const Contact = lazy(() => import('./pages/Contact'));

// 1. 컴포넌트 정의
const TemplateRenderer = () => {
  const { id } = useParams();
  const currentId = id || 'tpl-01';
  const templateData = TEMPLATES.find((t) => t.id === currentId);

  if (!templateData) {
    return (
      <div style={{ padding: '100px', color: '#fff', textAlign: 'center', background: '#000', height: '100vh' }}>
        <h2>템플릿을 찾을 수 없습니다 (ID: {id})</h2>
        <button
          onClick={() => (window.location.href = '/templates')}
          style={{ color: '#00ff00', background: 'none', border: '1px solid #00ff00', padding: '10px 20px', cursor: 'pointer', marginTop: '20px' }}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <AristideV1
      data={templateData}
      onClose={() => window.history.back()}
      onInquiry={() => (window.location.href = '/contact')}
    />
  );
};

function App() {
  return (
    <Router>
      <div className="ykinas-app">
        <Header />
        <main className="main-content">
          <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/templates" element={<TemplateList />} />
              <Route path="/templates/:id" element={<TemplateRenderer />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;