// api/stockit.js
import { createClient } from '@supabase/supabase-js';

// 콜드 스타트 시 커넥션 재사용을 위한 클라이언트 전역 선언 (서버리스 최적화)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // 💡 [비용 최적화 1] Edge CDN 캐싱 적용 (SWR 전략)
  // s-maxage=15: Vercel Edge 노드에서 15초간 완벽히 캐싱하여 DB/API 호출을 0으로 만듦 (트래픽 스파이크 방어)
  // stale-while-revalidate=45: 캐시 만료 후 45초 안에는 일단 구형 데이터를 응답하고, 백그라운드에서 비동기로 갱신
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=45'); 

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 프론트엔드 파라미터 수신 및 멀티쇼핑몰 번호 기본값 세팅
  const { mall_id, product_no, shop_no } = req.query;
  const currentShopNo = shop_no || '1'; 
  const referer = req.headers.referer || req.headers.origin || '';

  let requestHost = '';
  if (referer) {
    try { requestHost = new URL(referer).hostname; } catch (e) { }
  }

  if (!mall_id || !product_no) return res.status(400).json({ error: 'BAD_REQUEST', message: '파라미터 누락' });

  try {
    // 💡 [비용 최적화 2] Supabase DB 쿼리 병렬 처리 (Promise.all)
    // 라이선스 검증과 토큰 조회를 동시에 실행하여 서버리스 함수 실행 시간(과금 기준)을 절반으로 단축
    const [
      { data: license, error: licenseError },
      { data: tokenData }
    ] = await Promise.all([
      supabase
        .from('skin_licenses')
        .select('is_active, modules_config, skin_allowed_domains(domain)')
        .eq('mall_id', mall_id)
        .maybeSingle(),
      supabase
        .from('cafe24_auth_tokens')
        .select('access_token')
        .eq('mall_id', mall_id)
        .maybeSingle()
    ]);

    // 라이선스 및 도메인 검증
    if (licenseError || !license || !license.is_active) return res.status(403).json({ error: 'FORBIDDEN' });

    const isDomainMatched = license.skin_allowed_domains?.some(d => requestHost === d.domain || requestHost.endsWith('.' + d.domain));
    if (requestHost && !isDomainMatched) return res.status(403).json({ error: 'FORBIDDEN' });

    const config = license.modules_config || {};
    if (!config.stockit || config.stockit.enabled !== true) return res.status(403).json({ error: 'FORBIDDEN' });

    if (!tokenData || !tokenData.access_token) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // Cafe24 API 호출 (멀티쇼핑몰 번호 주입 및 최신 버전 명시)
    const cafe24Res = await fetch(`https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants?shop_no=${currentShopNo}&embed=inventories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01' 
      }
    });

    if (!cafe24Res.ok) throw new Error(`Cafe24 API Error: ${cafe24Res.status}`);

    const cafe24Data = await cafe24Res.json();
    const variants = cafe24Data.variants || [];

    const stockMap = {};
    variants.forEach(variant => {
      if (!variant.variant_code) return;

      let invObj = {};
      if (variant.inventories && Array.isArray(variant.inventories)) invObj = variant.inventories[0] || {};
      else if (variant.inventory && typeof variant.inventory === 'object') invObj = variant.inventory;
      else if (variant.inventories && typeof variant.inventories === 'object') invObj = variant.inventories;

      // 카페24 available_inventory 원시값 그대로 사용
      let realQty = parseInt(invObj.available_inventory ?? invObj.quantity ?? variant.available_inventory ?? variant.quantity ?? 0, 10);

      // 진열 및 판매 상태 검증
      const isDisplay = variant.display === undefined || variant.display === 'T' || variant.display === true;
      const isSelling = variant.selling === undefined || variant.selling === 'T' || variant.selling === true;

      if (!isDisplay || !isSelling) realQty = 0;

      // 재고관리 '사용 안함(F)' 처리
      const useInv = invObj.use_inventory ?? variant.use_inventory;
      if (useInv === 'F' || useInv === false) {
        realQty = 99999; 
      }

      stockMap[variant.variant_code] = realQty;
    });

    return res.status(200).json({ success: true, stockMap });

  } catch (err) {
    console.error('[Nexus API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}