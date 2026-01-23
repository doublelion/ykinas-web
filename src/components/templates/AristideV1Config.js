// 고객이 이 파일만 수정하면 모든 내용이 바뀝니다.
export const ARISTIDE_CONFIG = {
  branding: {
    title: 'ARISTIDE.INSPIRED',
    subtitle: 'Portfolio 2026',
    pointColor: '#4aba48',
  },
  settings: {
    // 설명 부분 폰트 사이즈 (기존보다 키움)
    descFontSizePc: '1.4rem',
    descFontSizeMobile: '2rem', // 모바일은 더 크게
    lineHeight: '1.7',
  },
  // 템플릿에 들어갈 실제 프로젝트 데이터
  projects: [
    {
      id: 1,
      title: 'SILENCE',
      category: 'Photography',
      year: '2024',
      image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85',
      description:
        '공간의 정적과 빛의 흐름을 포착하여 시각적 고요함을 선사합니다.',
    },
    {
      id: 2,
      title: 'STRUCTURE',
      category: 'Architecture',
      year: '2024',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
      description:
        '도시의 골조와 기하학적 반복이 만들어내는 리듬을 기록합니다.',
    },
    {
      id: 3,
      title: 'ELEMENT',
      category: 'Art Direction',
      year: '2023',
      image: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4',
      description:
        '브랜드의 핵심 요소를 해체하고 재구성하여 새로운 내러티브를 제안합니다.',
    },
    {
      id: 4,
      title: 'ORGANIC',
      category: 'Digital Art',
      year: '2024',
      image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853',
      description:
        '기술과 자연의 경계에서 탄생한 유기적인 형태의 디지털 조각들을 아카이빙합니다.',
    },
    {
      id: 5,
      title: 'BEYOND',
      category: 'Exhibition',
      year: '2025',
      image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa',
      description:
        '물리적 공간을 넘어선 디지털 경험의 확장성을 실험한 전시 프로젝트입니다.',
    },
  ],
};
