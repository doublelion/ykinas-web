// api/inject.js (Vercel Serverless Function - NextGen Bootstrapper & Security)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  const { mall_id } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  // 1. 요청 도메인 추출 (CORS 보안 목적)
  let requestHost = '';
  try {
    requestHost = new URL(referer).hostname;
  } catch (e) {
    return res.status(200).send('/* [YKINAS] Invalid Origin */');
  }

  if (!mall_id) {
    return res.status(200).send('console.warn("[YKINAS Bootstrapper] mall_id is required.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 2. 라이선스, 모듈 설정(JSONB), 허용 도메인 목록을 단일 쿼리로 조회
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    // 3. 도메인 일치 여부 확인
    const isDomainMatched = license?.skin_allowed_domains?.some(d => 
      requestHost === d.domain || requestHost.endsWith('.' + d.domain)
    );

    // 4. 인가 거부 로직 (활성화 여부 + 도메인 화이트리스트)
    if (error || !license || !license.is_active || !isDomainMatched) {
      return res.status(200).send(`console.warn("[YKINAS Bootstrapper] Unauthorized domain (${requestHost}) or inactive license.");`);
    }

    // 5. 검증 통과: 모듈 환경설정 추출
    const config = license.modules_config || {};
    const baseUrl = 'https://ykinas-web.vercel.app/modules'; 

    // Edge Caching 설정 (데이터베이스 부하 최소화)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    // 6. 클라이언트 사이드 동적 스크립트 인젝터 생성 (Payload)
    const loaderScript = `
      (function(global) {
        if (global.__YKINAS_NEXTGEN_BOOTSTRAPPER_LOADED__) return;
        global.__YKINAS_NEXTGEN_BOOTSTRAPPER_LOADED__ = true;

        const modulesConfig = ${JSON.stringify(config)};
        const baseUrl = '${baseUrl}';

        function injectModule(moduleName, moduleConfig) {
          const script = document.createElement('script');
          script.src = baseUrl + '/' + moduleName + '.js'; 
          script.defer = true;
          script.dataset.config = JSON.stringify(moduleConfig); 
          
          script.onerror = function() {
            console.error('[YKINAS] Failed to load module: ' + moduleName);
          };
          
          document.head.appendChild(script);
        }

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