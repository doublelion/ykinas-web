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
// ==========================================
// HERO SLIDES
// 배열에 데이터만 추가하면 슬라이드 확장 가능
// ==========================================
const HERO_SLIDES = [
  {
    id: 1,
    type: 'mesh',
    eyebrow: 'HIGH-END WEB CONSTRUCTION · B2B',
    title: (
      <>
        BEYOND
        <br />
        DIGITAL<span className="dot">.</span>
      </>
    ),
    lead: (
      <>
        기업의 격<span className="hero-ko-sub">(格)</span>을 증명하는
        <br />
        하이엔드 웹사이트 구축, <span className="brand">YKINAS</span>
      </>
    ),
    sub: (
      <>
        당신의 웹사이트는 24시간 일하는 가장 유능한 하이엔드 영업 사원이어야 합니다.
        <br />
        수십억의 가치를 지닌 기업의 본질을, 템플릿에 가두지 마십시오.
      </>
    ),
  },
  {
    id: 2,
    type: 'launch',
    eyebrow: 'Brand Commerce, Engineered',
    title: (
      <>
        LAUNCH<span className="accent">.</span>
      </>
    ),
    lead: '브랜드의 시작을 설계하는 커머스 구축',
    sub: (
      <>
        단순한 웹사이트가 아닙니다. 고객의 지갑을 열게 만드는
        <span className="soft"> '잘 팔리는'</span> 커머스의 시작,
        <strong> YKINAS</strong>가 함께합니다.
      </>
    ),
  },
];


// ==========================================
// HERO 1 · Network Mesh
// ==========================================
const HeroMesh = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let animationFrame = null;

    const LINK_DISTANCE = 150;
    const MAX_NODES = 90;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        MAX_NODES,
        Math.max(
          25,
          Math.round((width * height) / 16000)
        )
      );

      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
    };

    const frame = () => {
      ctx.clearRect(0, 0, width, height);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) {
          node.vx *= -1;
        }

        if (node.y < 0 || node.y > height) {
          node.vy *= -1;
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);

          if (distance >= LINK_DISTANCE) continue;

          const alpha =
            (1 - distance / LINK_DISTANCE) * 0.45;

          ctx.strokeStyle = `rgba(53, 230, 210, ${alpha})`;
          ctx.lineWidth = 0.7;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = 'rgba(127, 244, 232, 0.75)';

      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrame = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);

    animationFrame = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero__mesh"
      aria-hidden="true"
    />
  );
};


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
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const elements = document.querySelectorAll(
      '.home-container .motion-reveal'
    );

    if (reduceMotion) {
      elements.forEach((el) => {
        el.classList.add('is-visible');
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
      }
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);


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
      {/* ==========================================
    HERO SLIDER
    - 2개 슬라이드
    - HERO_SLIDES 배열 추가만으로 확장 가능
========================================== */}
      <header className="hero-slider-section">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1000}
          autoplay={{
            delay: 6000,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          }}
          pagination={{ clickable: true }}
          loop={true}
          className="hero-swiper"
        >
          {HERO_SLIDES.map((slide) => (
            <SwiperSlide key={slide.id}>
              {slide.type === 'mesh' ? (
                <section className="hero hero--mesh">
                  <HeroMesh />

                  <div
                    className="hero__glow"
                    aria-hidden="true"
                  />

                  <div
                    className="hero__beams"
                    aria-hidden="true"
                  >
                    <span className="beam beam--1" />
                    <span className="beam beam--2" />
                    <span className="frame frame--1" />
                    <span className="frame frame--2" />
                  </div>

                  <div className="hero__inner">
                    <p className="hero__eyebrow">
                      {slide.eyebrow}
                    </p>

                    <h1 className="hero__title">
                      {slide.title}
                    </h1>

                    <p className="hero__lead">
                      {slide.lead}
                    </p>

                    <p className="hero__sub">
                      {slide.sub}
                    </p>

                    <div className="hero__cta-row">
                      <Button
                        text="1:1 프로젝트 문의 →"
                        onClick={handleInquiry}
                      />
                    </div>
                  </div>

                  <div
                    className="hero__scroll"
                    aria-hidden="true"
                  >
                    <span />
                  </div>
                </section>
              ) : (
                <section className="hero hero--launch">
                  <div
                    className="hero__bg"
                    aria-hidden="true"
                  />

                  <div
                    className="hero__beams"
                    aria-hidden="true"
                  >
                    <span className="beam beam--1" />
                    <span className="beam beam--2" />
                    <span className="frame frame--1" />
                    <span className="frame frame--2" />
                  </div>

                  <div className="hero__inner">
                    <p className="hero__eyebrow hero__eyebrow--soft">
                      {slide.eyebrow}
                    </p>

                    <h1 className="hero__title glow-text">
                      {slide.title}
                    </h1>

                    <div className="hero__copy">
                      <p className="hero__lead">
                        {slide.lead}
                      </p>

                      <p className="hero__sub">
                        {slide.sub}
                      </p>

                      <div className="hero__cta">
                        <Button
                          text="견적 상담받기 →"
                          onClick={handleInquiry}
                        />

                        <button
                          type="button"
                          className="hero__ghost-text"
                          onClick={() => {
                            document
                              .getElementById('services')
                              ?.scrollIntoView({
                                behavior: 'smooth',
                              });
                          }}
                        >
                          작업 프로세스 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
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