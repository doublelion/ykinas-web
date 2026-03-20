import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TEMPLATES } from '../data/template';
import Tpl01 from './templates/Tpl01';

const TPL_COMPONENTS = {
  'tpl-01': Tpl01,
  'tpl-02': Tpl02, // 추가 시 여기에 한 줄만 더하면 끝납니다.
};

function TemplateRenderer() {
  const { id } = useParams();
  const templateData = TEMPLATES.find(t => t.id === id);
  const SelectedTpl = TPL_COMPONENTS[id];

  // 외부 링크인 경우 바로 이동 처리 (UX 고려)
  useEffect(() => {
    if (templateData?.isExternal && templateData.link) {
      window.location.href = templateData.link;
    }
  }, [templateData]);

  if (templateData?.isExternal) return <div style={{ padding: '100px', textAlign: 'center' }}>리다이렉트 중입니다...</div>;
  if (!SelectedTpl) return <div style={{ padding: '100px', textAlign: 'center' }}><h2>존재하지 않는 템플릿입니다.</h2><p>ID: {id}</p></div>;

  return <SelectedTpl data={templateData} />;
}

export default TemplateRenderer;