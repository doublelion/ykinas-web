import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useParams } from 'react-router-dom'; // 15번 라인 useParams 해결
import { TEMPLATES } from './data/template'; // 데이터 경로
import Home from './pages/Home';
import Header from './components/Header';
import Footer from './components/Footer';
import Portfolio from './pages/Portfolio';
import Contact from './pages/Contact';
import Audit from './pages/Audit';
import TemplateList from './pages/TemplateList'; // 목록 페이지 (카드들 나오는 곳)
import TemplateDetail from './pages/TemplateDetail'; // 상세 페이지 (멋진 애니메이션)
import AristideV1 from './components/templates/AristideV1'; // 26번 라인 AristideV1 해결 (경로 확인 필수)
import './App.scss';

// 1. 컴포넌트 정의
const TemplateRenderer = () => {
  // TemplateRenderer 내부 수정
  const { id } = useParams();
  // id가 없으면(메인 접속 시) 기본값으로 'tpl-01'을 사용하게 설정
  const currentId = id || 'tpl-01';
  const templateData = TEMPLATES.find((t) => t.id === currentId);

  if (!templateData) {
    return (
      <div
        style={{
          padding: '100px',
          color: '#fff',
          textAlign: 'center',
          background: '#000',
          height: '100vh',
        }}
      >
        <h2>템플릿을 찾을 수 없습니다 (ID: {id})</h2>
        <button
          onClick={() => (window.location.href = '/templates')}
          style={{
            color: '#00ff00',
            background: 'none',
            border: '1px solid #00ff00',
            padding: '10px 20px',
            cursor: 'pointer',
            marginTop: '20px',
          }}
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
      {' '}
      {/* 주소가 localhost:3000/#/templates/tpl-01 형태로 바뀝니다 */}
      <div className="ykinas-app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/templates" element={<TemplateList />} />
            <Route path="/templates/:id" element={<TemplateRenderer />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
