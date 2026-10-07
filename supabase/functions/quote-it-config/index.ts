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
    // quoteit_configs
    // ============================================================

    const { data, error } = await supabase
      .from("quoteit_configs")
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

    if (!data) {
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
    // ============================================================

    const responsePayload = {
      enabled: data.enabled !== false,

      fields: Array.isArray(data.fields)
        ? data.fields
        : [],

      displayMode:
        data.display_mode || "inline",

      targetBoardNo:
        data.target_board_no || 1002,

      targetSelector:
        data.target_selector || "",

      ui_text:
        data.ui_text &&
        typeof data.ui_text === "object"
          ? data.ui_text
          : {},

      ui_theme:
        data.ui_theme &&
        typeof data.ui_theme === "object"
          ? data.ui_theme
          : {},

      injectPosition:
        data.inject_position || "after",
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