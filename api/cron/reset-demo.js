import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // ★ 1. 보안 방어막: Vercel Cron 시스템이 보낸 요청인지 검증
  // (Vercel 대시보드 환경변수에 설정한 CRON_SECRET 값과 일치해야 통과)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized Access' });
  }

  const DEMO_MALL_ID = 'ecudemo388727';

  try {
    // 2. 캠페인 ID 조회
    const { data: campaign, error: campaignError } = await supabase
      .from('bannerit_campaigns')
      .select('id')
      .eq('mall_id', DEMO_MALL_ID)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Demo Campaign not found' });
    }

    const campaignId = campaign.id;

    // 3. 기존 고객들이 어드민에서 테스트하며 만져놓은 데이터 모두 삭제 (Clean up)
    await supabase
      .from('bannerit_items')
      .delete()
      .eq('campaign_id', campaignId);

    // 4. 완벽한 초기 세팅(Golden Sample) 데이터 3세트
    // (※ image_url은 용량 관리를 위해 사용자들이 올린 Storage 파일이 아닌 고정 URL 사용)
    const sampleItems = [
      {
        campaign_id: campaignId,
        sort_order: 0,
        image_url: 'https://ecudemo388727.cafe24.com/web/upload/bannerit_preview_02.jpg',
        title: '개발 지식 ZERO! 스마트한 팝업 관리',
        subtitle: '파일 첨부하고 링크 넣으면 끝, 3초만에 완성됩니다.',
        cta_text: '배너잇 시작하기',
        cta_link: 'https://admin.ykinas.com'
      },
      {
        campaign_id: campaignId,
        sort_order: 1,
        image_url: 'https://ecudemo388727.cafe24.com/web/upload/bannerit_detail_03_1.webp',
        title: '저장 없이 바로 보는 실시간 프리뷰 ⚡️',
        subtitle: '내용을 입력하는 즉시 쇼핑몰 화면과 동일하게 렌더링됩니다.',
        cta_text: '기능 자세히 보기',
        cta_link: '/product/list.html'
      },
      {
        campaign_id: campaignId,
        sort_order: 2,
        image_url: 'https://ecudemo388727.cafe24.com/web/upload/bannerit_detail_mo.webp',
        title: '단 1분 스크립트 주입으로 매출 극대화',
        subtitle: '모바일 환경에 완벽하게 맞춰진 팝업을 경험하세요.',
        cta_text: '평생 라이선스 구매',
        cta_link: '/product/detail.html'
      }
    ];

    // 5. 샘플 데이터 일괄 Insert
    const { error: insertError } = await supabase
      .from('bannerit_items')
      .insert(sampleItems);

    if (insertError) throw insertError;

    return res.status(200).json({ 
      success: true, 
      message: `[Cron Job] Successfully reset demo data for ${DEMO_MALL_ID}` 
    });

  } catch (error) {
    console.error('Reset Demo Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}