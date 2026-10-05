import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
      .from("skin_licenses")
      .select("modules_config")
      .eq("mall_id", mallId)
      .maybeSingle();

    // DB 오류
    if (error) {
      console.error(
        "[QUOTE-IT CONFIG] Database error:",
        error,
      );

      return new Response(
        JSON.stringify({
          error: "Database error",
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

    // 라이선스 없음
    if (!data) {
      return new Response(
        JSON.stringify({
          error: "License not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
     * modules_config 안전하게 확인
     */
    const modulesConfig =
      data.modules_config &&
      typeof data.modules_config === "object"
        ? data.modules_config as Record<string, unknown>
        : {};

    /*
     * modules_config.quoteit 추출
     */
    const quoteItConfig =
      modulesConfig.quoteit &&
      typeof modulesConfig.quoteit === "object"
        ? modulesConfig.quoteit as QuoteItConfig
        : {};

    /*
     * QUOTE-IT 설정만 프론트엔드로 반환
     */
    return new Response(
      JSON.stringify(quoteItConfig),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",

          // 60초 캐시
          "Cache-Control":
            "public, max-age=60, s-maxage=60",
        },
      },
    );

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