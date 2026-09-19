// api/stockit.js
import { createClient } from '@supabase/supabase-js';

// 공통 CORS 헤더 (에러 발생 시에도 반드시 응답에 포함되어야 함)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).set(corsHeaders).end();

  try {
    const { mall_id, product_no, variant_code } = req.query;
    if (!mall_id || !product_no || !variant_code) {
      return res.status(400).set(corsHeaders).json({ error: '파라미터 누락' });
    }

    // Vercel 프로젝트 환경 변수(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 등록되어 있어야 합니다.
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 💡 콜백에서 토큰을 저장한 테이블과 동일하게 맞춤
    const { data: storeData, error: dbError } = await supabase
      .from('cafe24_auth_tokens')
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (dbError || !storeData?.access_token) {
      return res.status(401).set(corsHeaders).json({ error: '인증 토큰 없음' });
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
      return res.status(cafe24Res.status).set(corsHeaders).json({ error: errorText });
    }

    const cafe24Data = await cafe24Res.json();
    const quantity = cafe24Data.inventory?.inventory_quantity || 0;
    return res.status(200).set(corsHeaders).json({ quantity });

  } catch (error) {
    console.error('[YKINAS API Error]', error);
    // 서버 내부 에러 발생 시에도 CORS 헤더를 강제 주입하여 프론트가 500 에러를 읽게 처리
    return res.status(500).set(corsHeaders).json({ error: '서버 내부 오류' });
  }
}