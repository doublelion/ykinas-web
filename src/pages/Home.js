import React from 'react';
import { Monitor, ShoppingCart, Settings, ArrowRight, Sparkles } from 'lucide-react';
import Map from '../components/Map';
import Button from '../components/Button';
import { PROJECTS } from '../data/project';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';

// Swiper 스타일 임포트
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import '../style/Home.scss';

// 하이엔드 톤앤매너 고해상도 이미지 (웹 디자인, IT 솔루션 컨셉)
const HERO_SLIDES = [
  {
    id: 1,
    title: "Next Generation",
    highlight: "Web Solution",
    desc: "와이키나스는 홈페이지 제작부터 쇼핑몰 구축까지, 귀사의 비즈니스를 디지털로 전환하는 최적의 파트너입니다.",
    features: [],
    bgImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=2070" // 다크 코딩 화면
  },
  {
    id: 2,
    title: "Tech & Design",
    highlight: "Architecture",
    desc: "사용자 중심의 설계와 압도적인 성능 최적화를 통해 흔들림 없는 디지털 자산을 구축합니다.",
    features: [
      "웹 퍼블리싱 & UI/UX 구현",
      "디지털 자산 아키텍처 설계",
      "웹 성능 최적화",
      "인터랙티브 웹 개발"
    ],
    bgImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=2072" // 다크 노트북 작업 환경
  },
  {
    id: 3,
    title: "Scalable",
    highlight: "Solutions",
    desc: "모든 기기에 대응하는 유연함과 시스템 간 유기적인 연동으로 비즈니스의 확장을 지원합니다.",
    features: [
      "반응형 & 적응형 웹 구축",
      "쇼핑몰 및 기업형 사이트 제작",
      "프론트엔드 & API 연동",
      "웹 표준 및 접근성 준수"
    ],
    bgImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=2070" // 다크 모니터 서버 환경
  }
];

function Home() {
  const navigate = useNavigate();
  const previewProjects = PROJECTS.slice(-2).reverse();

  const handleInquiry = () => {
    navigate('/contact');
  };

  return (
    <div className="home-container">
      {/* 리뉴얼된 히어로 스와이퍼 섹션 */}
      <header className="hero-slider-section">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          effect="fade"
          speed={1000}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop={true}
          className="hero-swiper"
        >
          {HERO_SLIDES.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div className="slide-bg" style={{ backgroundImage: `url(${slide.bgImage})` }}>
                <div className="overlay"></div>
              </div>
              <div className="slide-content">
                <h2>
                  {slide.title} <br /> <span className="highlight">{slide.highlight}</span>
                </h2>
                <p className="hero-desc">{slide.desc}</p>

                {/* 기술 및 솔루션 리스트 렌더링 */}
                {slide.features.length > 0 && (
                  <ul className="hero-features">
                    {slide.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                )}

                <div className="hero-btns">
                  <Button text="프로젝트 문의하기" onClick={handleInquiry} />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </header>

      {/* 템플릿 하이라이트 섹션 */}
      <section className="home-template-highlight">
        <div className="container">
          <div className="section-header">
            <span>PREMIUM SOLUTION</span>
            <h2>Template Line-up</h2>
          </div>
          <div className="highlight-flex">
            <div className="highlight-content">
              <h3>ARISTIDE.INSPIRED</h3>
              <p className="highlight-desc">
                단순한 템플릿을 넘어 브랜드의 가치를 증명합니다. <br />
                최신 최적화 기술이 집약된 와이키나스의 첫 번째 솔루션.
              </p>
              <ul className="feature-list">
                <li><Sparkles size={18} /> 4K 비주얼 및 하이엔드 디자인</li>
                <li><Sparkles size={18} /> Lighthouse 성능 지수 최적화</li>
                <li><Sparkles size={18} /> SEO 엔진 최적화 및 모바일 대응</li>
              </ul>
              <Button text="상세 정보 보기" onClick={() => navigate('/templates')} />
            </div>
            <div className="highlight-image" onClick={() => navigate('/templates')}>
              <img
                alt="Aristide Template"
                src="/templates/tpl-01/src/images/silence.webp"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 섹션 */}
      <section id="services" className="service-grid">
        <div className="service-card">
          <Monitor className="service-icon" size={40} style={{ stroke: 'var(--icon-color)' }} />
          <h3>홈페이지 제작</h3>
          <p>브랜드 아이덴티티를 반영한<br />완성도 높은 디지털 결과물을 제작합니다.</p>
        </div>
        <div className="service-card">
          <ShoppingCart color="#00f2ff" size={40} />
          <h3>쇼핑몰 구축</h3>
          <p>결제·상품·주문 관리까지 고려한<br />안정적인 이커머스 환경을 구축합니다.</p>
        </div>
        <div className="service-card">
          <Settings color="#00f2ff" size={40} />
          <h3>유지보수 &amp; 관리</h3>
          <p>오류 수정, 콘텐츠 변경, 기능 개선 등<br />지속적인 웹사이트 관리를 지원합니다.</p>
        </div>
      </section>

      {/* 포트폴리오 섹션 */}
      <section className="home-portfolio">
        <div className="section-header">
          <span>PORTFOLIO</span>
          <h2>Latest Projects</h2>
        </div>
        <div className="portfolio-preview-list">
          {previewProjects.map((project) => (
            <div key={project.id} className="preview-card" onClick={() => navigate('/portfolio')}>
              <div className="card-image">
                <img src={project.img} alt={project.title} />
              </div>
              <div className="card-info">
                <span className="category">{project.category}</span>
                <h3>{project.title}</h3>
                <p>{project.desc}</p>
                <div className="tags">
                  {project.tags?.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
              <div className="card-hover-icon">
                <ArrowRight size={32} color="#00f2ff" />
              </div>
            </div>
          ))}
        </div>
        <div className="view-more-center">
          <Button text="전체 포트폴리오 보기" onClick={() => navigate('/portfolio')} />
        </div>
      </section>

      <Map />
    </div>
  );
}

export default Home;