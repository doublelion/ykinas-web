// api/commerce.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // CORS 정책: 모든 고객사 도메인에서 스크립트 로드 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, v } = req.query;
  if (!mall_id) return res.status(400).send('console.error("[YKINAS] Missing mall_id.");');

  try {
    // 1. 단일 쿼리로 라이선스 및 모듈 설정 조회
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config')
      .eq('mall_id', mall_id)
      .single();

    if (error || !license || !license.is_active) {
      return res.status(403).send('console.warn("[YKINAS] Inactive or invalid license.");');
    }

    const config = license.modules_config || {};
    const cdnBaseUrl = "https://ykinas.com/modules";
    const version = v || 'latest';

    // 2. 클라이언트 사이드 부트스트래퍼 코드 동적 생성 (IIFE 패턴)
    const bootstrapperCode = `
      (function() {
        if (window.__YKINAS_LOADED__) return;
        window.__YKINAS_LOADED__ = true;

        const config = ${JSON.stringify(config)};
        const mallId = "${mall_id}";

        function loadModule(name, settings) {
          if (!settings || !settings.enabled) return;
          
          const script = document.createElement('script');
          script.src = \`\({cdnBaseUrl}/\${name}.js?v=\){version}\`;
          script.defer = true;
          script.dataset.mallId = mallId;
          script.dataset.config = JSON.stringify(settings);
          
          document.head.appendChild(script);
        }

        Object.keys(config).forEach(moduleName => {
          loadModule(moduleName, config[moduleName]);
        });
      })();
    `;

    // 3. Vercel Edge Cache 적용 (TTFB 최적화)
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).send(bootstrapperCode);

  } catch (err) {
    console.error('[YKINAS Error]', err);
    return res.status(500).send('console.error("[YKINAS] Internal Server Error.");');
  }
}