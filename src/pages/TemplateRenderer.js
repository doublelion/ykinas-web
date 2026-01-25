import React from 'react';
import { useParams } from 'react-router-dom';
// 앞으로 만들 템플릿 컴포넌트들을 여기서 임포트합니다.
import Tpl01 from './templates/Tpl01';

function TemplateRenderer() {
  const { id } = useParams(); // URL의 :id 값을 가져옴 (예: tpl-01)

  // ID에 따라 어떤 템플릿을 보여줄지 결정
  switch (id) {
    case 'tpl-01':
      return <Tpl01 />;
    // 나중에 tpl-02, tpl-03가 생기면 여기에 추가만 하면 됩니다.
    // case 'tpl-02':
    //   return <Tpl02 />;
    default:
      return (
        <div style={{ padding: '100px', textAlign: 'center' }}>
          <h2>존재하지 않는 템플릿입니다.</h2>
          <p>ID: {id}</p>
        </div>
      );
  }
}

export default TemplateRenderer;
