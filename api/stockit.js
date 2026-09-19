// api/stockit.js (Vercel Serverless Function)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 공통 CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // 1. OPTIONS 요청(Preflight) 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).set(corsHeaders).end();
  }

  try {
    const { mall_id, product_no, variant_code } = req.query;

    if (!mall_id || !product_no || !variant_code) {
      return res.status(400).set(corsHeaders).json({ error: '파라미터 누락' });
    }

    // 2. 통합 토큰 조회 (Stockit과 아름관광 폼이 공유하는 토큰)
    const { data: storeData, error: dbError } = await supabase
      .from('skin_licenses') // 토큰이 저장된 실제 테이블명
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (dbError || !storeData?.access_token) {
      return res.status(401).set(corsHeaders).json({ error: '인증 토큰 없음' });
    }

    // 3. 카페24 재고 API 호출 (지정된 API 버전 사용)
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
      // 권한 누락 시 여기서 403 에러가 잡힙니다.
      return res.status(cafe24Res.status).set(corsHeaders).json({ error: errorText });
    }

    const cafe24Data = await cafe24Res.json();
    const quantity = cafe24Data.inventory?.inventory_quantity || 0;
    
    return res.status(200).set(corsHeaders).json({ quantity });

  } catch (error) {
    // 서버 내부 에러가 발생해도 CORS 헤더를 담아 프론트가 500 에러를 정확히 읽게 함
    console.error('[Stockit API Error]', error);
    return res.status(500).set(corsHeaders).json({ error: '서버 내부 오류 발생' });
  }
}