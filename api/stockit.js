// api/inject.js (Vercel Serverless Function - 동적 스크립트 주입기)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 스크립트 호출 자체는 열어두되, 내용을 통제
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  const { mall_id } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  let requestDomain = '';
  try {
    requestDomain = new URL(referer).hostname; // 예: "ecudemo388727.cafe24.com"
  } catch (e) {
    return res.status(200).send(`console.warn('[YKINAS] 비정상적인 접근입니다.');`);
  }

  if (!mall_id) {
    return res.status(200).send(`console.error('[YKINAS] mall_id가 누락되었습니다.');`);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. 라이선스 및 도메인 교차 검증 (보안 핵심)
  const { data: licenseData, error } = await supabase
    .from('skin_licenses')
    .select(`
      is_active,
      has_stockit_module,
      skin_allowed_domains ( domain )
    `)
    .eq('mall_id', mall_id)
    .single();

  // 2. 권한이 없거나, 승인된 도메인 목록에 요청 도메인이 없는 경우 차단
  const isDomainAllowed = licenseData?.skin_allowed_domains.some(d => d.domain === requestDomain || requestDomain.includes(d.domain));
  const hasAccess = licenseData?.is_active && licenseData?.has_stockit_module && isDomainAllowed;

  // ✅ 올바른 방식 (데이터 API 방식)
  if (!hasAccess) {
    // 상태 코드 403(Forbidden)과 함께 순수 JSON 객체 반환
    return res.status(403).json({
      error: 'Unauthorized',
      message: '권한이 없거나 등록되지 않은 도메인입니다.'
    });
  }

  // 3. 검증 통과 시에만 실제 Stockit 모듈 코드(Payload)를 읽어서 반환
  try {
    const filePath = path.join(process.cwd(), 'public', 'modules', 'stockit.js');
    const moduleCode = fs.readFileSync(filePath, 'utf8');
    return res.status(200).send(moduleCode);
  } catch (err) {
    return res.status(500).send(`console.error('[YKINAS] 내부 서버 오류');`);
  }
}