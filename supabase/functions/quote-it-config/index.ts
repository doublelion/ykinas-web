// supabase/functions/quote-it-config/index.ts (수정본)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const mallId = url.searchParams.get("mall_id")?.trim();

    if (!mallId) throw new Error("mall_id is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. 권한 체크: skin_licenses (오직 활성화 여부만 확인)
    const { data: licenseData } = await supabase
      .from("skin_licenses")
      .select("modules_config")
      .eq("mall_id", mallId)
      .maybeSingle();

    const isQuoteItLicensed = licenseData?.modules_config?.quoteit?.enabled === true;

    // 라이선스가 없거나 비활성화 상태면 즉시 종료
    if (!isQuoteItLicensed) {
      return new Response(JSON.stringify({ enabled: false, reason: "License expired or disabled" }), { 
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. UX/UI 설정 페칭: 오직 quote_it_configs 테이블만 참조 (Single Source of Truth)
    const { data: configData, error: configError } = await supabase
      .from("quote_it_configs")
      .select("*") // 모든 설정(tier, fields, ui_text, ui_theme 등)을 가져옴
      .eq("mall_id", mallId)
      .maybeSingle();

    if (configError) throw configError;

    // 3. Payload 가공 (configData가 없으면 기본값 Fallback)
    const responsePayload = {
      debugVersion: "QUOTE-IT-20261007-V2-SSOT", // 통합 완료 버전 태그
      enabled: configData?.enabled ?? true,
      tier: configData?.tier || "CUSTOM", 
      displayMode: configData?.display_mode || "popup",
      targetBoardNo: configData?.target_board_no || null,
      targetSelector: configData?.target_selector || "",
      injectPosition: configData?.inject_position || "afterend",
      
      // 누락되었던 UX/UI 설정 주입 (기본값 세팅)
      ui_text: configData?.ui_text || { title: "B2B 맞춤 견적", eyebrow: "기업 전용" },
      ui_theme: configData?.ui_theme || { primaryColor: "#ff5500" },
      
      // 동적 필드 배열 주입
      fields: configData?.fields || [
        { name: "company", type: "text", label: "기업/단체명", required: true },
        { name: "writer", type: "text", label: "담당자 성함", required: true },
        { name: "phone", type: "tel", label: "연락처", required: true }
      ]
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});