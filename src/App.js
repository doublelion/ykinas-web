import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Outlet, Navigate } from 'react-router-dom';
import { TEMPLATES } from './data/template';
import Home from './pages/Home';
import Header from './components/Header';
import Footer from './components/Footer';
import Portfolio from './pages/Portfolio';
import TemplateList from './pages/TemplateList';
import AristideV1 from './components/templates/AristideV1';
import './App.scss';

// 무거운 페이지는 lazy 로딩으로 성능 최적화
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

// 2. 컴포넌트 정의
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
  // ★ 접속한 도메인이 서브도메인(admin.ykinas.com)인지 판별하는 핵심 방어 로직
  const isAdminDomain = window.location.hostname.startsWith('admin');

  return (
    <Router>
      <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
        <Routes>

          {isAdminDomain ? (
            /* ==========================================
               [A] B2B 어드민 도메인 (admin.ykinas.com) 전용 라우팅
               ========================================== */
            <>
              {/* 도메인 루트(/) 접속 시 바로 배너잇 어드민 호출 */}
              <Route path="/" element={<BannerItAdmin />} />
              {/* admin.ykinas.com/bannerit 등 다른 경로로 들어와도 메인으로 리다이렉트 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            /* ==========================================
               [B] 일반 퍼블릭 도메인 (ykinas.com, localhost 등) 라우팅
               ========================================== */
            <>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/templates" element={<TemplateList />} />
                <Route path="/templates/:id" element={<TemplateRenderer />} />
              </Route>

              {/* 개발/테스트를 위한 기존 주소 하위 호환 유지 */}
              <Route path="/admin/bannerit" element={<BannerItAdmin />} />
              <Route path="/bannerit" element={<BannerItAdmin />} />
            </>
          )}

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;