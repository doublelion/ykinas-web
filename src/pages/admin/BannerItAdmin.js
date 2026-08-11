import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, // CRA 환경 변수 네이밍 주의
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default function BannerItAdmin() {
  const [isActive, setIsActive] = useState(true);

  // 어드민 UI 로직 구성...
  
  return (
    <div className="admin-container">
      <h1>BannerIt 관리자 대시보드</h1>
      {/* 폼 및 프리뷰 영역 */}
    </div>
  );
}