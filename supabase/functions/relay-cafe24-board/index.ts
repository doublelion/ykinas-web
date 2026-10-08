import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CAFE24_API_VERSION = "2025-12-01";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

type LegacyRequest = {
  writer?: string;
  title?: string;
  content?: string;
  client_ip?: string;
  password?: string;
  secret?: string;
  [key: string]: unknown;
};

type RelayPayload = {
  mall_id?: string;
  board_no?: number | string;
  subject?: string;
  writer?: string;
  content?: string;
  password?: string;
  secret?: string;
  client_ip?: string;
  requests?: LegacyRequest[];
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders,
    },
  );
}

function getClientIp(req: Request): string {
  const forwarded =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "";

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return "127.0.0.1";
}

function redactRequestBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return body;
  }

  const cloned = JSON.parse(JSON.stringify(body));

  const requests = cloned?.requests;

  if (Array.isArray(requests)) {
    for (const request of requests) {
      if (request && typeof request === "object") {
        if ("password" in request) {
          request.password = "***";
        }

        if ("captcha" in request) {
          request.captcha = "***";
        }
      }
    }
  }

  return cloned;
}

async function getCafe24Token(mallId: string) {
  const { data, error } = await supabase
    .from("cafe24_auth_tokens")
    .select("*")
    .eq("mall_id", mallId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Token lookup failed: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `Cafe24 token not found for mall_id: ${mallId}`,
    );
  }

  return data;
}

async function refreshCafe24Token(
  mallId: string,
  refreshToken: string,
) {
  const clientId = Deno.env.get("CAFE24_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("CAFE24_CLIENT_SECRET") || "";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Cafe24 OAuth client credentials are missing.",
    );
  }

  const basicAuth = btoa(
    `${clientId}:${clientSecret}`,
  );

  const response = await fetch(
    "https://oauth.cafe24.com/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Cafe24 token refresh failed: ${JSON.stringify(result)}`,
    );
  }

  const accessToken = result.access_token;
  const newRefreshToken =
    result.refresh_token || refreshToken;

  if (!accessToken) {
    throw new Error(
      "Cafe24 token refresh returned no access_token.",
    );
  }

  const expiresAt = new Date(
    Date.now() +
      Number(result.expires_in || 7200) * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("cafe24_auth_tokens")
    .update({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("mall_id", mallId);

  if (error) {
    throw new Error(
      `Token update failed: ${error.message}`,
    );
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt,
  };
}

async function ensureAccessToken(
  mallId: string,
  tokenData: Record<string, unknown>,
) {
  const accessToken =
    String(tokenData.access_token || "");

  const refreshToken =
    String(tokenData.refresh_token || "");

  const expiresAt =
    tokenData.expires_at
      ? new Date(String(tokenData.expires_at)).getTime()
      : 0;

  const needsRefresh =
    !accessToken ||
    !expiresAt ||
    expiresAt - Date.now() < 10 * 60 * 1000;

  if (!needsRefresh) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error(
      `Cafe24 access token expired and refresh token is missing for ${mallId}.`,
    );
  }

  const refreshed =
    await refreshCafe24Token(
      mallId,
      refreshToken,
    );

  return refreshed.accessToken;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method Not Allowed",
      },
      405,
    );
  }

  try {
    const payload =
      (await req.json()) as RelayPayload;

    console.log(
      "[RELAY] Incoming payload:",
      JSON.stringify({
        mall_id: payload.mall_id,
        board_no: payload.board_no,
        subject: payload.subject,
        writer: payload.writer,
        has_content: !!payload.content,
        has_requests:
          Array.isArray(payload.requests) &&
          payload.requests.length > 0,
        has_password: !!payload.password,
        secret: payload.secret,
      }),
    );

    const mallId =
      String(payload.mall_id || "").trim();

    const boardNo =
      Number(payload.board_no);

    if (!mallId) {
      return jsonResponse(
        {
          success: false,
          error: "mall_id is required",
        },
        400,
      );
    }

    if (!Number.isInteger(boardNo)) {
      return jsonResponse(
        {
          success: false,
          error: "board_no is required",
        },
        400,
      );
    }

    const tokenData =
      await getCafe24Token(mallId);

    const accessToken =
      await ensureAccessToken(
        mallId,
        tokenData,
      );

    const clientIp =
      payload.client_ip ||
      getClientIp(req);

    let requests: LegacyRequest[];

    /*
     * 기존 아름관광 등 legacy requests 방식
     * 이 부분은 기존 구조 유지
     */
    if (
      Array.isArray(payload.requests) &&
      payload.requests.length > 0
    ) {
      requests =
        payload.requests.map((item) => {
          const request: LegacyRequest = {
            ...item,
            writer:
              item.writer || "고객",
            title:
              item.title || "",
            content:
              item.content || "",
            client_ip:
              item.client_ip || clientIp,
          };

          if (item.password) {
            request.password =
              String(item.password);
          }

          if (item.secret === "T") {
            request.secret = "T";
          }

          return request;
        });
    } else {
      /*
       * QUOTE-IT 단일 등록
       *
       * Cafe24 API 형식:
       * {
       *   shop_no: 1,
       *   requests: [
       *     {
       *       writer,
       *       title,
       *       content,
       *       client_ip,
       *       password,
       *       secret
       *     }
       *   ]
       * }
       */

      const articleRequest: LegacyRequest = {
        title: payload.subject || "",
        content: payload.content || "",
        writer: payload.writer || "고객",
        client_ip: clientIp,
      };

      /*
       * 기존 비밀번호 로직 유지
       */
      if (payload.password) {
        articleRequest.password =
          String(payload.password);
      }

      /*
       * 비밀글
       *
       * secret = T 인 경우에만 전달
       * F / undefined 는 공개글
       */
      if (payload.secret === "T") {
        articleRequest.secret = "T";
      }

      requests = [
        articleRequest,
      ];
    }

    const requestBody = {
      shop_no: 1,
      requests,
    };

    const apiUrl =
      `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo}/articles`;

    console.log(
      "[RELAY] Cafe24 URL:",
      apiUrl,
    );

    console.log(
      "[RELAY] Cafe24 Request Body:",
      JSON.stringify(
        redactRequestBody(requestBody),
      ),
    );

    const cafe24Response =
      await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
          "X-Cafe24-Api-Version":
            CAFE24_API_VERSION,
        },
        body: JSON.stringify(
          requestBody,
        ),
      });

    const responseText =
      await cafe24Response.text();

    console.log(
      "[RELAY] Cafe24 Status:",
      cafe24Response.status,
    );

    console.log(
      "[RELAY] Cafe24 Response:",
      responseText,
    );

    let responseData: unknown;

    try {
      responseData =
        JSON.parse(responseText);
    } catch {
      responseData = {
        raw: responseText,
      };
    }

    if (!cafe24Response.ok) {
      return jsonResponse(
        {
          success: false,
          cafe24_status:
            cafe24Response.status,
          error: responseData,
        },
        cafe24Response.status,
      );
    }

    return jsonResponse({
      success: true,
      cafe24_status:
        cafe24Response.status,
      data: responseData,
    });
  } catch (error) {
    console.error(
      "[RELAY] Error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});