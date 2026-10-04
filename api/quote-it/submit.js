// api/quote-it/submit.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method Not Allowed"
    });
  }

  const writer = req.body && req.body.writer
    ? req.body.writer
    : "";

  const phone = req.body && req.body.phone
    ? req.body.phone
    : "";

  const content = req.body && req.body.content
    ? req.body.content
    : "";

  if (!writer || !phone || !content) {
    return res.status(400).json({
      message: "필수 항목이 누락되었습니다."
    });
  }

  const shopId = process.env.CAFE24_MALL_ID || "ykinas";
  const targetBoardNo = Number(
    process.env.QUOTE_IT_BOARD_NO || 1002
  );

  try {
    /*
     * 기존 Cafe24 OAuth / Token 로직 연결
     * 이미 가지고 있는 토큰 로직을 사용하면 됨.
     */
    const accessToken = await getAdminTokenFromRedis(shopId);

    if (!accessToken) {
      return res.status(401).json({
        message: "Cafe24 access token이 없습니다."
      });
    }

    /*
     * Cafe24 Admin Board API
     */
    const apiUrl =
      "https://" +
      shopId +
      ".cafe24api.com/api/v2/admin/boards/" +
      targetBoardNo +
      "/articles";

    /*
     * 게시글 데이터
     */
    const articleTitle =
      "[견적문의] " +
      writer +
      " 고객님";

    const articleContent =
      "연락처: " +
      phone +
      "\n\n문의사항:\n" +
      content;

    /*
     * Cafe24 API 호출
     */
    const cafe24Res = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Authorization":
          "Bearer " + accessToken,

        "Content-Type":
          "application/json",

        "X-Cafe24-Api-Version":
          "2025-12-01"
      },

      body: JSON.stringify({
        request: {
          board_no: targetBoardNo,
          title: articleTitle,
          content: articleContent,
          writer: writer
        }
      })
    });

    const result = await cafe24Res.json();

    return res
      .status(cafe24Res.status)
      .json(result);

  } catch (error) {
    return res.status(500).json({
      message: "서버 오류가 발생했습니다.",
      error: error.message
    });
  }
}