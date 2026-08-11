// src/pages/admin/BannerItAdmin.js
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './BannerItAdmin.scss'; // 필요 시 CSS 모듈화 (또는 Tailwind/인라인 스타일 사용)

// Supabase 클라이언트 초기화 (CRA 환경변수 규칙 적용)
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default function BannerItAdmin() {
  // 상태 관리: 실제 로그인한 쇼핑몰의 ID를 매핑해야 함 (테스트용 하드코딩)
  const [currentMallId] = useState('ecudemo389879');
  const [isActive, setIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // 슬라이드 데이터 상태 (멀티 팝업 확장을 고려해 배열로 관리하는 것이 좋으나, MVP는 1개로 시작)
  const [slide, setSlide] = useState({
    title: '무료배송 서비스',
    subtitle: '5만원 이상 구매시 무료 배송',
    cta_text: '바로가기',
    cta_link: '#none',
    imageUrl: ''
  });

  // 임시 업로드 핸들러 (UI 테스트용)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 실제 Storage 업로드 전, 로컬 브라우저에서 미리보기 위한 임시 URL 생성
      const tempUrl = URL.createObjectURL(file);
      setSlide({ ...slide, imageUrl: tempUrl });
      // TODO: 백엔드 로직에 실제 Supabase Storage 업로드 연결 필요
    }
  };

  const handleSave = async () => {
    // TODO: 백엔드 DB Insert 로직 연결
    alert('DB 저장 로직이 곧 연결될 예정입니다.');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800" style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>

      {/* 좌측: 폼 컨트롤 영역 */}
      <div className="w-1/2 p-8 border-r bg-white overflow-y-auto" style={{ flex: '1', padding: '2rem', borderRight: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>팝업 설정 (BannerIt)</h1>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>팝업 활성화</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '1.25rem', height: '1.25rem' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>팝업 이미지 (1:1 비율)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>메인 타이틀</label>
          <input type="text" value={slide.title} onChange={e => setSlide({ ...slide, title: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>서브 타이틀</label>
          <input type="text" value={slide.subtitle} onChange={e => setSlide({ ...slide, subtitle: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>

        <button onClick={handleSave} style={{ width: '100%', padding: '1rem', backgroundColor: '#111', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
          저장 및 라이브 반영
        </button>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>카페24 스킨 삽입용 스크립트</p>
          <code style={{ fontSize: '0.875rem', color: '#10b981', wordBreak: 'break-all' }}>
            {`<script src="https://ykinas.com/api/bannerit?mall_id=${currentMallId}"></script>`}
          </code>
        </div>
      </div>

      {/* 우측: 실시간 프리뷰 영역 */}
      <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb', padding: '2rem' }}>

        {/* 모바일 목업 컨테이너 */}
        <div style={{ width: '375px', height: '667px', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}>

          {/* 어두운 배경 (Backdrop) 느낌 */}
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }}></div>

          {/* 실제 팝업 UI */}
          <div style={{ position: 'relative', zIndex: 2, backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', width: '100%' }}>
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="preview" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>이미지 영역</div>
            )}

            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>{slide.title || '타이틀'}</h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.95rem', color: '#666' }}>{slide.subtitle}</p>
              {slide.cta_text && (
                <div style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#111', color: '#fff', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600' }}>{slide.cta_text}</div>
              )}
            </div>

            <div style={{ display: 'flex', borderTop: '1px solid #eee', backgroundColor: '#fafafa' }}>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', fontSize: '0.85rem', color: '#555', borderRight: '1px solid #eee' }}>오늘 하루 열지 않기</div>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', fontSize: '0.85rem', color: '#555' }}>닫기</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}