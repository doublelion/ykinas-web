// api/stockit.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. CORS 헤더를 Vercel(Node.js) 표준 방식으로 개별 세팅 (절대 .set() 사용 금지)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS Preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { mall_id, product_no, variant_code } = req.query;

    if (!mall_id || !product_no || !variant_code) {
      // .set() 없이 순수하게 status와 json만 사용
      return res.status(400).json({ error: '필수 파라미터 누락' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: storeData, error: dbError } = await supabase
      .from('cafe24_auth_tokens')
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (dbError || !storeData?.access_token) {
      return res.status(401).json({ error: '유효한 액세스 토큰 없음' });
    }

    const cafe24Url = `https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants/${variant_code}/inventory`;
    
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
    const quantity = cafe24Data.inventory?.inventory_quantity ?? 0;

    // 정상 응답
    return res.status(200).json({ quantity });

  } catch (error) {
    console.error('[Stockit API Error]', error.message);
    // 500 에러 처리 시에도 .set() 제거
    return res.status(500).json({ error: error.message });
  }
}