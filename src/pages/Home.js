import React, { useState, useEffect } from 'react'; // useState, useEffect 추가
import { supabase } from '../supabaseClient'; // supabase 추가
import { Monitor, ShoppingCart, Settings, ArrowRight, Sparkles } from 'lucide-react';
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


// 하이엔드 3박자(코딩-디자인-기획)
// 하이엔드 톤앤매너 & 3박자(디자인-솔루션-기획) 최종 선별 이미지 데이터
const HERO_SLIDES = [
  {
    id: 1,
    title: "Next Generation",
    highlight: "Web Solution",
    desc: "와이키나스는 홈페이지 제작부터 쇼핑몰 구축까지, 귀사의 비즈니스를 디지털로 전환하는 최적의 파트너입니다.",
    features: ["최신 프레임워크 기반 개발", "고성능 API 인터페이스", "철저한 보안 및 최적화"],
    // [1번 교체] 디자인과 코딩이 조화를 이루는 프리미엄 다크 테마 웹사이트 작업 환경
    bgImage: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&q=80&w=2070"
  },
  {
    id: 2,
    title: "Tech & Design",
    highlight: "Architecture",
    desc: "사용자 중심의 설계와 고성능 최적화로 비즈니스 성장을 견인하는 완벽한 플랫폼을 구축합니다.",
    features: [
      "UI/UX 인터랙티브 디자인",
      "고급 퍼블리싱 기술 적용",
      "일관된 브랜드 아이덴티티",
      "사용자 여정 최적화 설계"
    ],
    // [2번 유지] 하이엔드 디자인 인터페이스 컨셉
    bgImage: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=2064"
  },
  {
    id: 3,
    title: "Scalable",
    highlight: "Planning",
    desc: "비즈니스의 본질을 꿰뚫는 기획과 확장이 용이한 시스템 설계로 미래 성장을 지원합니다.",
    features: [
      "전략적 비즈니스 기획",
      "데이터 기반 아키텍처",
      "지속 가능한 시스템 설계",
      "글로벌 표준 기술 준수"
    ],
    // [3번 교체] 데이터 기반의 전략 기획과 분석을 수행하는 다크 테마 컨설팅 환경
    bgImage: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=2070"
  }
];

function Home() {
  const navigate = useNavigate();
  // 1. 상태 관리 추가 (기존 previewProjects 변수 대체)
  const [previewProjects, setPreviewProjects] = useState([]);

  // 2. 최신 프로젝트 2개만 가져오는 로직 추가
  useEffect(() => {
    const fetchLatestProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('sort_order', { ascending: true }) // 이 줄로 교체
        .range(0, 1); // 최신순으로 2개만 가져옴

      if (!error && data) {
        setPreviewProjects(data);
      }
    };
    fetchLatestProjects();
  }, []);

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
          <ShoppingCart className="service-icon" size={40} style={{ stroke: 'var(--icon-color)' }} />
          <h3>쇼핑몰 구축</h3>
          <p>결제·상품·주문 관리까지 고려한<br />안정적인 이커머스 환경을 구축합니다.</p>
        </div>
        <div className="service-card">
          <Settings className="service-icon" size={40} style={{ stroke: 'var(--icon-color)' }} />
          <h3>유지보수 &amp; 관리</h3>
          <p>오류 수정, 콘텐츠 변경, 기능 개선 등<br />지속적인 웹사이트 관리를 지원합니다.</p>
        </div>
      </section>

      {/* 포트폴리오 섹션 */}
      <section className="home-portfolio ykinas-portfolio">
        <div className="section-header">
          <span>PORTFOLIO</span>
          <h2>Latest Projects</h2>
        </div>

        <div className="portfolio-grid portfolio-preview-list">
          {previewProjects.map((project) => (
            <article
              key={project.id}
              className="portfolio-item preview-card"
              onClick={() => navigate('/portfolio')}
            >
              <div className="item-image">
                {/* project.img를 project.img_url로 변경 */}
                <img src={project.img_url} alt={project.title} loading="lazy" />
                <div className="overlay">
                  <Button text="자세히 보기" onClick={() => navigate('/portfolio')} />
                </div>
                <div className="card-hover-icon">
                  <ArrowRight size={32} color="#00f2ff" />
                </div>
              </div>

              <div className="item-info">
                <span className="category">{project.category}</span>
                <h3>{project.title}</h3>
                <p>{project.desc}</p>
                <div className="tags">
                  {/* tags가 배열인지 확인하는 안전장치 추가 */}
                  {Array.isArray(project.tags) ? (
                    project.tags.map((tag, idx) => (
                      <span key={`${project.id}-${idx}`} className="tag">{tag}</span>
                    ))
                  ) : (
                    project.tags?.split(',').map((tag, idx) => (
                      <span key={`${project.id}-${idx}`} className="tag">{tag.replace(/[\[\]\" ]/g, '')}</span>
                    ))
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="view-more-center">
          <Button text="전체 포트폴리오 보기" onClick={() => navigate('/portfolio')} />
        </div>
      </section>

      {/*<Map />*/}
    </div>
  );
}

export default Home;