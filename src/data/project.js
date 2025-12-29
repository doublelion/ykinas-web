import imgTheHealth from '../assets/images/project_the_health.webp';
import imgLotterentacar from '../assets/images/project_lotte_rentacar.webp';
import imgSigngate from '../assets/images/project_kica.webp';

export const PROJECTS = [
  {
    id: 1,
    category: 'MOBILE FRONTEND',
    title: '삼성생명 더헬스(THE Health)',
    desc: '사용자 친화적인 UI/UX로 건강 관리 앱의 접근성과 편의성을 극대화한 프론트엔드 개발 프로젝트입니다.',
    img: imgTheHealth,
    link: 'https://apps.apple.com/kr/app/%EB%8D%94%ED%97%AC%EC%8A%A4/id1609392226',
    tags: ['#Javascript', '#HealthCare']
  },
  {
    id: 2,
    category: 'PC, MOBILE FRONTEND',
    title: '롯데렌터카(Lotte Renta-car)',
    desc: '사용자 친화적인 UI/UX를 통해 단기/장기 예약 및 차량 정비 서비스의 접근성을 극대화한 대한민국 1위 모빌리티 플랫폼 프로젝트입니다.',
    img: imgLotterentacar,
    link: 'https://www.lotterentacar.net/',
    tags: ['#javascript', '#Mobility']
  },
  {
    id: 3,
    category: 'CROSS PLATFORM FRONTEND',
    title: '한국정보인증(KICA Signgate)',
    desc: '복잡한 공동인증 및 전자증명서 발급 절차를 직관적인 UX로 최적화하여 보안성과 편의성을 확보한 디지털 인증 통합 플랫폼입니다.',
    img: imgSigngate,
    link: 'https://www.signgate.com/',
    tags: ['#Security', '#Fintech']
  }
];