// api/stockit.js (Vercel Serverless Function)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS 및 헤더 설정 (JSON 표준 반환)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, product_no } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  if (!mall_id || !product_no) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '파라미터 누락' });
  }

  let requestHost = '';
  try {
    if (referer) requestHost = new URL(referer).hostname;
  } catch (e) {
    return res.status(403).json({ error: 'FORBIDDEN', message: '잘못된 접근 출처' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 💡 [핵심] JSONB 모듈 설정(modules_config)과 허용 도메인을 함께 조회
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    // 1차 방어: 라이선스 활성 여부
    if (error || !license || !license.is_active) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '유효하지 않은 라이선스입니다.' });
    }

    // 2차 방어: 도메인 화이트리스트 검증
    const isDomainMatched = license.skin_allowed_domains?.some(d => 
      requestHost === d.domain || requestHost.endsWith('.' + d.domain)
    );
    if (requestHost && !isDomainMatched) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '등록되지 않은 도메인입니다.' });
    }

    // 💡 3차 방어: 차세대 모듈 JSONB 설정 검사 (has_stockit_module 대체)
    const config = license.modules_config || {};
    if (!config.stockit || config.stockit.enabled !== true) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Stockit 모듈이 비활성화 상태입니다.' });
    }

    // ====================================================================
    // ✅ 인가 통과! 이 아래부터는 기존 카페24 토큰 갱신 및 재고 조회 로직 유지
    // ====================================================================
    
    // const tokenData = await ... (기존 카페24 API 호출 로직)
    // return res.status(200).json({ success: true, stockMap: { ... } });

  } catch (err) {
    console.error('[YKINAS API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: '서버 내부 오류' });
  }
}