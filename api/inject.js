// api/inject.js (Vercel Serverless Function)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  if (!mall_id) {
    return res.status(200).send('console.warn("[YKINAS Bootstrapper] mall_id is required.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 차세대 모듈 설정(modules_config)만 단일 조회
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (error || !license || !license.is_active) {
      return res.status(200).send('console.warn("[YKINAS Bootstrapper] License is invalid or inactive.");');
    }

    // signit, bannerit과 무관한 순수 신규 모듈 설정 트리 (ex: { stockit: {...}, reviewit: {...} })
    const config = license.modules_config || {};
    const baseUrl = 'https://ykinas-web.vercel.app/modules'; 

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    // 클라이언트 사이드 동적 스크립트 인젝터
    const loaderScript = `
      (function(global) {
        if (global.__YKINAS_NEXTGEN_BOOTSTRAPPER_LOADED__) return;
        global.__YKINAS_NEXTGEN_BOOTSTRAPPER_LOADED__ = true;

        const modulesConfig = ${JSON.stringify(config)};
        const baseUrl = '${baseUrl}';

        function injectModule(moduleName, moduleConfig) {
          const script = document.createElement('script');
          script.src = baseUrl + '/' + moduleName + '.js'; // ex: public/modules/stockit.js
          script.defer = true;
          script.dataset.config = JSON.stringify(moduleConfig); // 안전한 설정값 직렬화 전달
          
          script.onerror = function() {
            console.error('[YKINAS] Failed to load module: ' + moduleName);
          };
          
          document.head.appendChild(script);
        }

        // DB에 활성화된 신규 모듈만 선별하여 병렬 주입
        Object.keys(modulesConfig).forEach(function(moduleName) {
          const moduleConfig = modulesConfig[moduleName];
          if (moduleConfig && moduleConfig.enabled) {
            injectModule(moduleName, moduleConfig);
          }
        });
      })(window);
    `;

    return res.status(200).send(loaderScript);

  } catch (error) {
    console.error('[YKINAS API Error]', error);
    return res.status(500).send('console.error("[YKINAS Bootstrapper] Server error.");');
  }
}