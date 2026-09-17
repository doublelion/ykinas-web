// api/inject.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  // [Edge Case] mall_id 누락 방어
  if (!mall_id) {
    return res.status(200).send('console.warn("[YKINAS] mall_id is missing.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 라이선스 및 통합 설정(modules_config) 일괄 조회
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (error || !license || !license.is_active) {
      return res.status(200).send('console.warn("[YKINAS] Invalid or inactive license.");');
    }

    // DB에서 조회된 모듈 설정들 (ex: { stockit: { enabled: true, ... }, signit: { ... } })
    const config = license.modules_config || {};
    const baseUrl = 'https://ykinas-web.vercel.app/modules'; // 모듈들이 위치한 public/modules 폴더 경로

    // [성능 최적화] Vercel Edge Cache 적용
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    // 🚀 진정한 통합 부트스트래퍼 스크립트 (클라이언트에 반환됨)
    const loaderScript = `
      (function(global) {
        // [Idempotency] 로더 중복 실행 방어
        if (global.__YKINAS_BOOTSTRAPPER_LOADED__) return;
        global.__YKINAS_BOOTSTRAPPER_LOADED__ = true;

        const mallConfig = ${JSON.stringify(config)};
        const baseUrl = '${baseUrl}';

        // 개별 모듈 스크립트 동적 주입 함수
        function loadModule(moduleName, moduleConfig) {
          const script = document.createElement('script');
          script.src = baseUrl + '/' + moduleName + '.js'; 
          script.defer = true;
          
          // 각 모듈(stockit.js 등)이 사용할 수 있도록 설정값을 dataset에 안전하게 직렬화하여 전달
          script.dataset.config = JSON.stringify(moduleConfig);
          
          script.onerror = function() {
            console.error('[YKINAS] Failed to load module: ' + moduleName);
          };
          
          document.body.appendChild(script);
        }

        // DB에 활성화(enabled: true)된 모듈만 순회하며 병렬 로드
        Object.keys(mallConfig).forEach(function(moduleName) {
          const moduleConfig = mallConfig[moduleName];
          if (moduleConfig && moduleConfig.enabled) {
            loadModule(moduleName, moduleConfig);
          }
        });
      })(window);
    `;

    return res.status(200).send(loaderScript);

  } catch (error) {
    console.error('[YKINAS API Error]', error);
    return res.status(500).send('console.error("[YKINAS] Bootstrapper load failed.");');
  }
}