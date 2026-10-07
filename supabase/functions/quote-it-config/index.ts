import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  // ============================================================
  // CORS
  // ============================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ============================================================
  // GET only
  // ============================================================

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
    // ============================================================
    // mall_id
    // ============================================================

    const url = new URL(req.url);
    const mallId = url.searchParams.get("mall_id")?.trim();

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

    // ============================================================
    // Supabase
    // ============================================================

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "[QUOTE-IT CONFIG] Missing Supabase environment variables",
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

    // ============================================================
    // skin_licenses
    // modules_config.quoteit = 기본 설정
    // ============================================================

    const { data: licenseData, error: licenseError } =
      await supabase
        .from("skin_licenses")
        .select(`
          modules_config
        `)
        .eq("mall_id", mallId)
        .maybeSingle();

    if (licenseError) {
      console.error(
        "[QUOTE-IT CONFIG] License database error:",
        licenseError,
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

    // ============================================================
    // quote_it_configs
    // mall별 실행 설정
    // ============================================================

    const { data: configData, error: configError } =
      await supabase
        .from("quote_it_configs")
        .select(`
          enabled,
          display_mode,
          target_board_no,
          target_selector,
          fields,
          ui_text,
          ui_theme,
          inject_position
        `)
        .eq("mall_id", mallId)
        .maybeSingle();

    if (configError) {
      console.error(
        "[QUOTE-IT CONFIG] Quote config database error:",
        configError,
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

    // ============================================================
    // modules_config.quoteit
    // ============================================================

    const modulesConfig =
      licenseData?.modules_config &&
      typeof licenseData.modules_config === "object"
        ? licenseData.modules_config
        : {};

    const quoteit =
      modulesConfig.quoteit &&
      typeof modulesConfig.quoteit === "object"
        ? modulesConfig.quoteit
        : {};

    // ============================================================
    // Configuration 존재 여부
    // ============================================================

    if (!licenseData && !configData) {
      return new Response(
        JSON.stringify({
          error: "QUOTE-IT configuration not found",
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

    // ============================================================
    // Normalize
    //
    // skin_licenses.modules_config.quoteit
    //     ↓ 기본값
    //
    // quote_it_configs
    //     ↓ mall별 override
    // ============================================================

    const responsePayload = {
  debugVersion: "quote-it-config-20261007-01",

  tier:
    quoteit.tier || "BASIC",

  enabled:
    configData?.enabled !== null &&
    configData?.enabled !== undefined
      ? configData.enabled
      : quoteit.enabled !== false,

  fields:
    Array.isArray(configData?.fields)
      ? configData.fields
      : Array.isArray(quoteit.fields)
        ? quoteit.fields
        : [],

  displayMode:
    configData?.display_mode ||
    quoteit.displayMode ||
    "inline",

  targetBoardNo:
    configData?.target_board_no ||
    quoteit.targetBoardNo ||
    1002,

  targetSelector:
    configData?.target_selector ||
    "",

  ui_text:
    configData?.ui_text &&
    typeof configData.ui_text === "object"
      ? configData.ui_text
      : quoteit.ui_text &&
          typeof quoteit.ui_text === "object"
        ? quoteit.ui_text
        : {},

  ui_theme:
    configData?.ui_theme &&
    typeof configData.ui_theme === "object"
      ? configData.ui_theme
      : quoteit.ui_theme &&
          typeof quoteit.ui_theme === "object"
        ? quoteit.ui_theme
        : {},

  injectPosition:
    configData?.inject_position ||
    "after",
};

    // ============================================================
    // Response
    // ============================================================

    return new Response(
      JSON.stringify(responsePayload),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
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