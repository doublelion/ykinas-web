import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const {
    mall_id,
    product_no,
    shop_no
  } = req.query;

  const currentShopNo = shop_no || '1';

  const referer =
    req.headers.referer ||
    req.headers.origin ||
    '';

  let requestHost = '';

  if (referer) {
    try {
      requestHost = new URL(referer).hostname;
    } catch (error) {
      requestHost = '';
    }
  }

  if (!mall_id || !product_no) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: '파라미터 누락'
    });
  }

  try {
    const [
      { data: license, error: licenseError },
      { data: tokenData, error: tokenError }
    ] = await Promise.all([
      supabase
        .from('skin_licenses')
        .select(
          'is_active, modules_config, skin_allowed_domains(domain)'
        )
        .eq('mall_id', mall_id)
        .maybeSingle(),

      supabase
        .from('cafe24_auth_tokens')
        .select('access_token')
        .eq('mall_id', mall_id)
        .maybeSingle()
    ]);

    if (licenseError) {
      console.error('[Stockit] License query error:', licenseError);

      return res.status(500).json({
        error: 'LICENSE_QUERY_ERROR'
      });
    }

    if (tokenError) {
      console.error('[Stockit] Token query error:', tokenError);

      return res.status(500).json({
        error: 'TOKEN_QUERY_ERROR'
      });
    }

    if (!license || !license.is_active) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: '라이선스 만료'
      });
    }

    /*
     * 도메인 검증
     *
     * Referer / Origin이 없는 요청은 차단합니다.
     */
    if (!requestHost) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Referer 누락 차단'
      });
    }

    const allowedDomains =
      license.skin_allowed_domains || [];

    const isDomainMatched = allowedDomains.some((item) => {
      const domain = String(item.domain || '')
        .trim()
        .toLowerCase();

      const host = requestHost.toLowerCase();

      return (
        host === domain ||
        host.endsWith('.' + domain)
      );
    });

    if (!isDomainMatched) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: '인가되지 않은 도메인'
      });
    }

    /*
     * Stockit 활성화 여부
     */
    const config = license.modules_config || {};

    if (
      !config.stockit ||
      config.stockit.enabled !== true
    ) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: '모듈 비활성화'
      });
    }

    /*
     * Cafe24 Access Token 확인
     */
    if (
      !tokenData ||
      !tokenData.access_token
    ) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '토큰 누락'
      });
    }

    /*
     * Cafe24 상품 옵션 / 재고 조회
     */
    const cafe24Url =
      'https://' +
      mall_id +
      '.cafe24api.com/api/v2/admin/products/' +
      product_no +
      '/variants' +
      '?shop_no=' +
      encodeURIComponent(currentShopNo) +
      '&embed=inventories';

    const cafe24Res = await fetch(cafe24Url, {
      method: 'GET',

      headers: {
        Authorization:
          'Bearer ' + tokenData.access_token,

        'Content-Type':
          'application/json',

        'X-Cafe24-Api-Version':
          '2025-12-01'
      }
    });

    /*
     * Cafe24 인증 만료
     */
    if (cafe24Res.status === 401) {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Cafe24 Access Token 만료'
      });
    }

    /*
     * 기타 Cafe24 API 오류
     */
    if (!cafe24Res.ok) {
      const errorText =
        await cafe24Res.text();

      console.error(
        '[Stockit] Cafe24 API Error:',
        cafe24Res.status,
        errorText
      );

      return res.status(502).json({
        error: 'CAFE24_API_ERROR',
        status: cafe24Res.status
      });
    }

    const cafe24Data =
      await cafe24Res.json();

    const variants =
      Array.isArray(cafe24Data.variants)
        ? cafe24Data.variants
        : [];

    const stockMap = {};

    variants.forEach((variant) => {
      if (!variant.variant_code) {
        return;
      }

      let inventory = {};

      if (
        Array.isArray(variant.inventories)
      ) {
        inventory =
          variant.inventories[0] || {};
      } else if (
        variant.inventories &&
        typeof variant.inventories === 'object'
      ) {
        inventory =
          variant.inventories;
      } else if (
        variant.inventory &&
        typeof variant.inventory === 'object'
      ) {
        inventory =
          variant.inventory;
      }

      let realQty = parseInt(
        inventory.available_inventory ??
        inventory.quantity ??
        variant.available_inventory ??
        variant.quantity ??
        0,
        10
      );

      if (Number.isNaN(realQty)) {
        realQty = 0;
      }

      const isDisplay =
        variant.display === undefined ||
        variant.display === 'T' ||
        variant.display === true;

      const isSelling =
        variant.selling === undefined ||
        variant.selling === 'T' ||
        variant.selling === true;

      if (!isDisplay || !isSelling) {
        realQty = 0;
      }

      const useInventory =
        inventory.use_inventory ??
        variant.use_inventory;

      /*
       * 재고관리 미사용 상품
       */
      if (
        useInventory === 'F' ||
        useInventory === false
      ) {
        realQty = 99999;
      }

      stockMap[variant.variant_code] =
        realQty;
    });

    /*
     * 중요:
     *
     * Cafe24 API가 정상적으로 성공한 경우에만
     * CDN 캐시를 허용합니다.
     *
     * 에러 응답은 캐시하지 않습니다.
     */
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=15, stale-while-revalidate=45'
    );

    return res.status(200).json({
      success: true,
      stockMap
    });

  } catch (error) {
    console.error(
      '[YKINAS Stockit API Error]',
      error
    );

    /*
     * 500 에러는 캐시하지 않도록 명시
     */
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate'
    );

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}