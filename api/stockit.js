// api/stockit.js (Vercel Backend - 전체 옵션 일괄 조회)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { mall_id, product_no } = req.query; // variant_code는 제거됨 (전체 조회)

    if (!mall_id || !product_no) {
      return res.status(400).json({ error: '필수 파라미터 누락' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: storeData } = await supabase.from('cafe24_auth_tokens').select('access_token').eq('mall_id', mall_id).single();

    if (!storeData?.access_token) return res.status(401).json({ error: '인증 토큰 없음' });

    // 💡 핵심: 품목 단건 조회가 아닌, 품목 리스트 전체 조회를 하면서 재고(inventories)를 embed함
    const cafe24Url = `https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants?embed=inventories`;
    
    const cafe24Res = await fetch(cafe24Url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01'
      }
    });

    if (!cafe24Res.ok) return res.status(cafe24Res.status).json({ error: 'Cafe24 API Error' });

    const cafe24Data = await cafe24Res.json();
    const variants = cafe24Data.variants || [];
    
    // 💡 프론트엔드가 쉽게 읽을 수 있도록 { "P000000N000B": 2, "P000000N000C": 1 } 형태로 가공
    const stockMap = {};
    variants.forEach(variant => {
      const currentQty = variant.quantity ?? 0;
      const safetyQty = variant.safety_inventory ?? 0;
      stockMap[variant.variant_code] = Math.max(0, currentQty - safetyQty);
    });

    return res.status(200).json({ stockMap });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}