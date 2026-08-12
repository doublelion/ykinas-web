import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Outlet } from 'react-router-dom';
import { TEMPLATES } from './data/template';
import Home from './pages/Home';
import Header from './components/Header';
import Footer from './components/Footer';
import Portfolio from './pages/Portfolio';
import TemplateList from './pages/TemplateList';
import AristideV1 from './components/templates/AristideV1';
import './App.scss';

// ★ 무거운 페이지 및 어드민 컴포넌트 Lazy 로딩 (중복 import 제거 완료)
const Audit = lazy(() => import('./pages/Audit'));
const Contact = lazy(() => import('./pages/Contact'));
const BannerItAdmin = lazy(() => import('./pages/admin/BannerItAdmin')); 

// 1. 와이키나스 공통 레이아웃 (Header, Footer 노출)
const PublicLayout = () => (
  <div className="ykinas-app">
    <Header />
    <main className="main-content">
      <Outlet />
    </main>
    <Footer />
  </div>
);

// 2. 템플릿 렌더러 컴포넌트
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
      <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
        <Routes>

          {/* 퍼블릭 페이지 라우트 그룹 (Header, Footer 포함) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/templates" element={<TemplateList />} />
            <Route path="/templates/:id" element={<TemplateRenderer />} />
          </Route>

          {/* ★ 배너잇 어드민 전용 라우트 (Header, Footer 없음) */}
          {/* admin.ykinas.com/bannerit 서브도메인 접속 대응 */}
          <Route path="/bannerit" element={<BannerItAdmin />} />
          {/* 기존 내부 관리자 주소 하위 호환 유지 */}
          <Route path="/admin/bannerit" element={<BannerItAdmin />} />

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;