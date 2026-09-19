// api/stockit.js (Vercel Backend 최종본)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { mall_id, product_no, variant_code } = req.query;

    if (!mall_id || !product_no || !variant_code) {
      return res.status(400).json({ error: '필수 파라미터 누락' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: storeData, error: dbError } = await supabase
      .from('cafe24_auth_tokens')
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (dbError || !storeData?.access_token) {
      return res.status(401).json({ error: '유효한 액세스 토큰 없음' });
    }

    // 공식 문서 기준 정확한 엔드포인트: /inventories
    const cafe24Url = `https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants/${variant_code}/inventories`;
    
    const cafe24Res = await fetch(cafe24Url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01' 
      }
    });

    if (!cafe24Res.ok) {
      const errorText = await cafe24Res.text();
      return res.status(cafe24Res.status).json({ error: `Cafe24 API Error: ${errorText}` });
    }

    const cafe24Data = await cafe24Res.json();
    
    // 💡 공식 문서 스펙 완벽 반영: inventory(단수)와 inventories(복수) 래퍼 객체 모두 방어
    const targetObj = cafe24Data.inventory || cafe24Data.inventories || {};
    
    // 💡 현재고(inventory_quantity)와 안전재고(safety_inventory) 추출
    const currentQty = targetObj.inventory_quantity ?? 0;
    const safetyQty = targetObj.safety_inventory ?? 0;
    
    // 💡 [비즈니스 로직] 실 판매 가능 수량 계산 (안전재고 차감, 음수 방지)
    const availableQuantity = Math.max(0, currentQty - safetyQty);

    // 프론트엔드로는 계산이 끝난 '최종 가용 수량'만 내려줌
    return res.status(200).json({ quantity: availableQuantity });

  } catch (error) {
    console.error('[Stockit API Error]', error.message);
    return res.status(500).json({ error: error.message });
  }
}