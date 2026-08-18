// 위치: src/hooks/useDemoCampaign.js
import useSWR from 'swr';

// 공통 fetcher 함수 (필요시 src/utils 등에서 임포트 가능)
const fetcher = (url) => fetch(url).then((res) => res.json());

export function useDemoCampaign(mallId) {
  const { data, mutate, isValidating } = useSWR(
    mallId ? `/api/campaigns?mall_id=${mallId}` : null, // mallId가 있을 때만 호출
    fetcher,
    {
      revalidateOnFocus: true, // 탭 활성화 시 리프레시하여 데모 리셋 변경분 감지
      dedupingInterval: 60000,
    }
  );

  return { data, mutate, isValidating };
}