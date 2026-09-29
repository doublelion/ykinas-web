import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Monitor, ShoppingCart, Settings, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';

// Swiper 스타일 임포트
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import '../style/Home.scss';

// 하이엔드 톤앤매너 & 3박자(디자인-솔루션-기획) 최종 선별 이미지 데이터
const HERO_SLIDES = [
  {
    id: 1,
    title: "Next Generation",
    highlight: "Web Solution",
    desc: "와이키나스는 홈페이지 제작부터 쇼핑몰 구축까지, 귀사의 비즈니스를 디지털로 전환하는 최적의 파트너입니다.",
    features: ["최신 프레임워크 기반 개발", "고성능 API 인터페이스", "철저한 보안 및 최적화"],
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
    bgImage: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=2070"
  }
];

// ==========================================
// [개별 컴포넌트 분리] 포트폴리오 프리뷰 카드
// ==========================================
const PreviewItem = ({ project, navigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const descriptionRef = useRef(null);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      // 실제 텍스트 높이가 컨테이너(2줄 제한) 높이보다 크면 더보기 버튼 노출
      setShowBtn(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
    }
  }, [project.desc]);

  return (
    <article className="portfolio-item preview-card">
      <div className="item-image" onClick={() => navigate('/portfolio')}>
        <img src={project.img_url} alt={project.title} loading="lazy" />
        <div className="overlay">
          <Button text="자세히 보기" onClick={(e) => {
            e.stopPropagation(); // 중복 클릭 방지
            navigate('/portfolio');
          }} />
        </div>
        <div className="card-hover-icon">
          <ArrowRight size={32} color="#00f2ff" />
        </div>
      </div>

      <div className="item-info">
        <span className="category">{project.category}</span>
        <h3>{project.title}</h3>

        <div className={`desc-wrap ${isExpanded ? 'expanded' : ''}`}>
          <p className="desc-text" ref={descriptionRef}>
            {project.desc}
          </p>
          {(showBtn || isExpanded) && (
            <button className="btn-inline-more" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? ' [접기]' : '... 더보기'}
            </button>
          )}
        </div>

        <div className="tags">
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
  );
};

// ==========================================
// 메인 홈 컴포넌트
// ==========================================
function Home() {
  const navigate = useNavigate();
  const [previewProjects, setPreviewProjects] = useState([]);
  const [latestTemplate, setLatestTemplate] = useState(null);

  useEffect(() => {
    // 최신 포트폴리오 2개 페칭
    const fetchLatestProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('sort_order', { ascending: true })
        .range(0, 1);

      if (!error && data) setPreviewProjects(data);
    };

    // 최신 템플릿 1개 페칭 (CORPORATE 제외)
    const fetchLatestTemplate = async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .neq('category', 'CORPORATE')
        .order('created_at', { ascending: false }) // 최신 등록순
        .limit(1)
        .single(); // 1개만 가져오기

      if (!error && data) setLatestTemplate(data);
    };

    fetchLatestProjects();
    fetchLatestTemplate();
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

          {latestTemplate ? (
            <div className="highlight-flex">
              <div className="highlight-content">
                <span className="cat-tag">{latestTemplate.category}</span>
                <h3>{latestTemplate.title}</h3>
                <p className="highlight-desc">
                  {latestTemplate.description}
                </p>
                <ul className="feature-list">
                  <li><Sparkles size={18} /> 하이엔드 최적화 UI/UX 디자인</li>
                  <li><Sparkles size={18} /> {latestTemplate.price_info || '상담 후 결정'}</li>
                  <li><Sparkles size={18} /> SEO 엔진 최적화 및 모바일 대응</li>
                </ul>
                <Button text="템플릿 자세히 보기" onClick={() => navigate('/templates')} />
              </div>
              <div className="highlight-image" onClick={() => navigate('/templates')}>
                <img
                  alt={latestTemplate.title}
                  src={latestTemplate.thumbnail_url}
                  onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'}
                />
              </div>
            </div>
          ) : (
            <div className="loading-shimmer">템플릿을 불러오는 중입니다...</div>
          )}
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
            <PreviewItem key={project.id} project={project} navigate={navigate} />
          ))}
        </div>

        <div className="view-more-center">
          <Button text="전체 포트폴리오 보기" onClick={() => navigate('/portfolio')} />
        </div>
      </section>

    </div>
  );
}

export default Home;