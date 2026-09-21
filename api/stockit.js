// api/stockit.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 💡 [교정 1] 프론트엔드에서 넘겨주는 shop_no 파라미터 수신 (누락 방지)
  const { mall_id, product_no, shop_no } = req.query;
  const currentShopNo = shop_no || '1'; 
  const referer = req.headers.referer || req.headers.origin || '';

  let requestHost = '';
  if (referer) {
    try { requestHost = new URL(referer).hostname; } catch (e) { }
  }

  if (!mall_id || !product_no) return res.status(400).json({ error: 'BAD_REQUEST', message: '파라미터 누락' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: license, error: licenseError } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (licenseError || !license || !license.is_active) return res.status(403).json({ error: 'FORBIDDEN' });

    const isDomainMatched = license.skin_allowed_domains?.some(d => requestHost === d.domain || requestHost.endsWith('.' + d.domain));
    if (requestHost && !isDomainMatched) return res.status(403).json({ error: 'FORBIDDEN' });

    const config = license.modules_config || {};
    if (!config.stockit || config.stockit.enabled !== true) return res.status(403).json({ error: 'FORBIDDEN' });

    const { data: tokenData } = await supabase.from('cafe24_auth_tokens').select('access_token').eq('mall_id', mall_id).single();
    if (!tokenData) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // 💡 [교정 2] 카페24 API 호출 시 멀티쇼핑몰 번호(shop_no)를 명확히 주입
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

      // 다중 타입(Array/Object) 파싱 방어
      let invObj = {};
      if (variant.inventories && Array.isArray(variant.inventories)) invObj = variant.inventories[0] || {};
      else if (variant.inventory && typeof variant.inventory === 'object') invObj = variant.inventory;
      else if (variant.inventories && typeof variant.inventories === 'object') invObj = variant.inventories;

      // 💡 [교정 3] 카페24의 available_inventory는 이미 안전재고 연산이 끝난 '실제 판매가능 수량'입니다.
      // 따라서 qty - safety 같은 이중 차감 로직을 완전히 삭제하고 원시값을 그대로 사용합니다.
      let realQty = parseInt(invObj.available_inventory ?? invObj.quantity ?? variant.available_inventory ?? variant.quantity ?? 0, 10);

      // 진열 및 판매 상태 검증 (값이 없으면 true로 간주)
      const isDisplay = variant.display === undefined || variant.display === 'T' || variant.display === true;
      const isSelling = variant.selling === undefined || variant.selling === 'T' || variant.selling === true;

      if (!isDisplay || !isSelling) realQty = 0;

      // 💡 [교정 4] 재고관리 '사용 안함(F)' 처리
      const useInv = invObj.use_inventory ?? variant.use_inventory;
      if (useInv === 'F' || useInv === false) {
        realQty = 99999; // 무제한 판매
      }

      stockMap[variant.variant_code] = realQty;
    });

    return res.status(200).json({ success: true, stockMap });

  } catch (err) {
    console.error('[YKINAS API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}