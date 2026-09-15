// 경로: YKINAS-WEB/supabase/functions/relay-cafe24-board/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 타입 정의
interface QuoteRequest {
  mall_id: string;
  board_no: number | string;
  subject: string;
  writer: string;
  content: string;
}

serve(async (req: Request) => {
  // CORS Preflight 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: QuoteRequest = await req.json();

    // 1. 필수 파라미터 방어 로직
    if (!payload.mall_id || !payload.subject || !payload.content) {
      throw new Error("필수 파라미터가 누락되었습니다.");
    }

    // 2. Supabase Admin 클라이언트 초기화 (RLS 우회 및 토큰 조회용)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. 분리된 cafe24_auth_tokens 테이블에서 해당 쇼핑몰의 Access Token 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from("cafe24_auth_tokens")
      .select("access_token")
      .eq("mall_id", payload.mall_id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error(`Token Error for ${payload.mall_id}:`, tokenError);
      throw new Error(`[${payload.mall_id}] 유효한 API 토큰을 찾을 수 없거나 권한이 없습니다.`);
    }

    // 4. Cafe24 Admin API Server-to-Server 호출 (Cloudflare WAF 우회)
    const cafe24Response = await fetch(
      `https://\({payload.mall_id}.cafe24api.com/api/v2/admin/boards/\){payload.board_no}/articles`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
          "X-Cafe24-Api-Version": "2025-12-01", // 최신 규격 필수 고정
        },
        body: JSON.stringify({
          shop_no: 1,
          request: {
            title: payload.subject,
            content: payload.content,
            writer: payload.writer || "비회원",
            is_secret: "T", // 보안을 위한 비밀글 설정
          },
        }),
      }
    );

    // 5. Cafe24 API 응답 에러 핸들링
    if (!cafe24Response.ok) {
      const errorText = await cafe24Response.text();
      console.error("Cafe24 API Reject:", errorText);
      throw new Error(`Cafe24 Server Error [${cafe24Response.status}]`);
    }

    // 성공 응답 반환
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});