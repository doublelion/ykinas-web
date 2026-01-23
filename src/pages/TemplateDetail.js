import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../data/template';
import AristideV1 from '../components/templates/AristideV1';

function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const templateData = TEMPLATES.find((t) => t.id === id);

  // 데이터가 로딩 중이거나 없을 때 흰 화면 대신 처리
  if (!templateData) {
    return (
      <div
        style={{
          background: '#050505',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <p>템플릿을 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/templates')}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <AristideV1
      data={templateData}
      onClose={() => navigate('/templates')}
      onInquiry={() => navigate('/contact')}
    />
  );
}

export default TemplateDetail;
