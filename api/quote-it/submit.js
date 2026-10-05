// api/quote-it/submit.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method Not Allowed'
    });
  }

  const payload = req.body || {};

  // 기본 설정
  const mallId =
    payload.mall_id ||
    process.env.CAFE24_MALL_ID ||
    'ykinas';

  const boardNo = Number(
    payload.board_no ||
    process.env.QUOTE_IT_BOARD_NO ||
    1002
  );

  // 프론트엔드에서 완성한 값 그대로 수신
  const subject = String(payload.subject || '').trim();
  const writer = String(payload.writer || '').trim();
  const password = String(payload.password || '').trim();
  const content = String(payload.content || '');

  // 필수값 검증
  if (!writer || !content) {
    return res.status(400).json({
      message: '필수 항목이 누락되었습니다.'
    });
  }

  if (!boardNo || Number.isNaN(boardNo)) {
    return res.status(400).json({
      message: '게시판 번호가 올바르지 않습니다.'
    });
  }

  try {
    /*
     * Cafe24 Admin API Access Token 조회
     * 기존 Redis OAuth 로직을 연결
     */
    const accessToken = await getAdminTokenFromRedis(mallId);

    if (!accessToken) {
      return res.status(401).json({
        message: 'Cafe24 access token이 없습니다.'
      });
    }

    /*
     * Cafe24 Board API
     */
    const apiUrl =
      'https://' +
      mallId +
      '.cafe24api.com/api/v2/admin/boards/' +
      boardNo +
      '/articles';

    /*
     * Cafe24 Admin Board API 호출
     */
    const cafe24Res = await fetch(apiUrl, {
      method: 'POST',

      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01'
      },

      body: JSON.stringify({
        request: {
          shop_no: 1,
          board_no: boardNo,

          title: subject,
          writer: writer,

          // 프론트엔드에서 생성한 비밀번호 그대로 전달
          password: password,

          // 비밀글 강제
          secret: 'T',

          // 프론트엔드에서 완성한 동적 본문 그대로 전달
          content: content
        }
      })
    });

    const result = await cafe24Res.json();

    /*
     * Cafe24 API 오류
     */
    if (!cafe24Res.ok) {
      console.error(
        '[QUOTE-IT Cafe24 API Error]',
        JSON.stringify(result)
      );

      return res.status(cafe24Res.status).json(result);
    }

    /*
     * 성공
     */
    return res.status(200).json(result);

  } catch (error) {
    console.error(
      '[QUOTE-IT Submit Server Error]',
      error
    );

    return res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
}