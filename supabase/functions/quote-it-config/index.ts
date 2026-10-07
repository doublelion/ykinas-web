import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type QuoteItConfig = {
  tier?: string;
  fields?: unknown[];
  ui_text?: Record<string, unknown>;
  ui_theme?: Record<string, unknown>;
  [key: string]: unknown;
};

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // GET만 허용
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const url = new URL(req.url);

    const mallId = url.searchParams
      .get("mall_id")
      ?.trim();

    // mall_id 필수
    if (!mallId) {
      return new Response(
        JSON.stringify({
          error: "mall_id is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
     * Supabase 환경변수
     *
     * SERVICE_ROLE_KEY는 서버에서만 사용한다.
     * 브라우저로 절대 전달되지 않는다.
     */
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "[QUOTE-IT CONFIG] Supabase environment variables missing",
      );

      return new Response(
        JSON.stringify({
          error: "Server configuration error",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
     * Supabase Admin Client
     */
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    /*
     * 해당 Cafe24 Mall의 라이선스 설정 조회
     */
    const { data, error } = await supabase
      .from("quoteit_configs") // 새로 만드신 전용 테이블 이름[cite: 2]
      .select("tier, fields, target_board_no, target_selector, display_mode, enabled")
      .eq("mall_id", mallId)
      .maybeSingle();

    if (data) {
      const responsePayload = {
        enabled: data.enabled !== false,
        tier: data.tier || "BASIC",
        displayMode: data.display_mode || "inline",
        targetBoardNo: data.target_board_no || 1002,
        targetSelector: data.target_selector || ".hero", // DB의 .hero 전달[cite: 2]
        fields: data.fields || [],
      };
      return new Response(JSON.stringify(responsePayload), { /* headers */ });
    }

    if (error) {
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    /*
     * 2. JSONB 구조에서 QUOTE-IT 설정 추출
     */
    const modulesConfig =
      data.modules_config && typeof data.modules_config === "object"
        ? (data.modules_config as Record<string, unknown>)
        : {};

    const quoteItConfig =
      modulesConfig.quoteit && typeof modulesConfig.quoteit === "object"
        ? (modulesConfig.quoteit as Record<string, any>)
        : {};

    /*
     * 3. [핵심] API 응답 페이로드 규격화 (Normalization)
     * DB에 값이 빠져있더라도 프론트엔드가 예측할 수 있도록 명시적으로 구조를 매핑합니다.
     */
    const responsePayload = {
      enabled: quoteItConfig.enabled !== false, // DB에 없으면 기본적으로 활성화(true)
      tier: quoteItConfig.tier || "BASIC",
      displayMode: quoteItConfig.displayMode || quoteItConfig.display_mode || "popup",
      targetBoardNo: quoteItConfig.targetBoardNo || quoteItConfig.target_board_no || 1002,
      
      // 💡 해결 포인트: targetSelector 명시적 바인딩 (카멜/스네이크 케이스 동시 대응)
      targetSelector: quoteItConfig.targetSelector || quoteItConfig.target_selector || "",
      
      fields: quoteItConfig.fields || [],
      ui_text: quoteItConfig.ui_text || {},
      ui_theme: quoteItConfig.ui_theme || {},
    };

    /*
     * 4. QUOTE-IT 설정 프론트엔드로 반환
     */
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });

  } catch (error) {
    console.error(
      "[QUOTE-IT CONFIG] Unexpected error:",
      error,
    );

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});