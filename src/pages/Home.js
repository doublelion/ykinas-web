import React, { useState, useEffect, useRef } from 'react';

import { supabase } from '../supabaseClient';

import {
  Monitor,
  ShoppingCart,
  Settings,
  ArrowRight,
  Sparkles
} from 'lucide-react';

import Button from '../components/Button';

import { useNavigate } from 'react-router-dom';

import {
  Swiper,
  SwiperSlide
} from 'swiper/react';

import {
  Autoplay,
  Pagination,
  EffectFade
} from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import '../style/Home.scss';


const painPoints = [
  '남들과 똑같은 템플릿형 쇼핑몰로는 브랜드 가치를 보여주기 어렵습니다.',
  '트래픽이 몰리거나 특가 세일을 열 때, 서버가 버틸지 늘 걱정됩니다.',
  '제작 업체와 소통이 안 돼서 일정만 한없이 지연되고 있습니다.',
  '만들고 끝이 아니라, SEO(검색엔진최적화)까지 고려한 세팅이 필요합니다.',
];

const strengths = [
  {
    no: '01',
    title: '브랜드 맞춤형 UI/UX 설계',
    body: '공장형으로 찍어내는 홈페이지가 아닙니다. 브랜드의 아이덴티티와 타겟 고객의 동선을 분석해 이탈률은 낮추고 구매 전환율은 높이는 맞춤형 디자인을 설계합니다.',
    metric: '+38%',
    metricLabel: '평균 구매 전환율 상승',
  },
  {
    no: '02',
    title: '안정적인 커머스 · 타임세일/재고 최적화',
    body: '대규모 트래픽에도 끊김 없는 안정적인 서버 구축. 복잡한 타임세일 로직과 실시간 재고 연동 시스템 등 비즈니스에 꼭 필요한 커스텀 기능을 완벽하게 구현합니다.',
    metric: '99.9%',
    metricLabel: '피크 트래픽 서버 안정성',
  },
  {
    no: '03',
    title: '반응형 웹 & 모바일 최적화',
    body: 'PC·태블릿·모바일 어떤 환경에서 접속해도 깨짐 없는 완벽한 비율의 해상도와 최상의 로딩 속도를 자랑합니다. 모바일 커머스 시대에 최적화된 경험을 제공합니다.',
    metric: '0.9s',
    metricLabel: '모바일 평균 로딩 속도',
  },
];

const processSteps = [
  {
    no: '1',
    title: '상담 / 문의',
    body: '현재 비즈니스 상황과 원하시는 방향성을 심도 있게 파악하고, 최적의 개발 방향을 컨설팅해 드립니다.'
  },
  {
    no: '2',
    title: '결제 진행',
    body: '투명하고 합리적인 견적을 안내해 드리며, 크몽의 안전 결제 시스템을 통해 계약을 진행합니다.'
  },
  {
    no: '3',
    title: '일정 안내',
    body: '전체 프로젝트 타임라인과 마일스톤을 공유해, 작업 진행 상황을 투명하게 확인하실 수 있습니다.'
  },
  {
    no: '4',
    title: '홈페이지 초안 제작',
    body: '협의된 기획안을 바탕으로 트렌디한 디자인과 탄탄한 퍼블리싱이 적용된 1차 결과물을 제작합니다.'
  },
  {
    no: '5',
    title: '검토 / 수정',
    body: '초안을 함께 꼼꼼히 검토하고, 피드백을 적극 반영해 퀄리티를 극대화하는 디테일 수정을 거칩니다.'
  },
  {
    no: '6',
    title: 'SEO 최적화 · 인수인계',
    body: '구글·네이버 검색 노출을 위한 SEO 세팅을 완료하고, 직접 관리하기 편하도록 관리자 페이지를 인계합니다.'
  },
];

const faqs = [
  {
    q: '도메인과 호스팅도 알아서 해주시나요?',
    a: '네. 처음 홈페이지를 만드시는 분들도 어려움이 없도록 도메인 연결부터 호스팅 세팅까지 원스톱으로 도와드립니다. 이후 관리 방법까지 함께 안내해 드립니다.',
  },
  {
    q: '제작 기간은 얼마나 걸리나요?',
    a: '요구되는 기능과 페이지 수에 따라 상이하지만, 일반적인 커머스 사이트의 경우 평균 3~4주 정도 소요됩니다. 정확한 일정은 상담 시 프로젝트 범위에 맞춰 안내해 드립니다.',
  },
];
// ==========================================
// 포트폴리오 프리뷰 카드
// ==========================================

const PreviewItem = ({ project, navigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const descriptionRef = useRef(null);

  const [showBtn, setShowBtn] = useState(false);


  useEffect(() => {
    if (!descriptionRef.current) return;

    const element = descriptionRef.current;

    setShowBtn(
      element.scrollHeight > element.clientHeight
    );
  }, [project.desc]);


  return (
    <article className="portfolio-item preview-card">

      <div
        className="item-image"
        onClick={() => navigate('/portfolio')}
      >
        <img
          src={project.img_url}
          alt={project.title}
          loading="lazy"
        />

        <div className="overlay">
          <Button
            text="자세히 보기"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/portfolio');
            }}
          />
        </div>

        <div className="card-hover-icon">
          <ArrowRight
            size={32}
            color="#00f2ff"
          />
        </div>
      </div>


      <div className="item-info">

        <span className="category">
          {project.category}
        </span>

        <h3>
          {project.title}
        </h3>


        <div
          className={`desc-wrap ${isExpanded ? 'expanded' : ''
            }`}
        >
          <p
            className="desc-text"
            ref={descriptionRef}
          >
            {project.desc}
          </p>

          {(showBtn || isExpanded) && (
            <button
              type="button"
              className="btn-inline-more"
              onClick={() =>
                setIsExpanded(!isExpanded)
              }
            >
              {isExpanded
                ? '[접기]'
                : '... 더보기'}
            </button>
          )}
        </div>


        <div className="tags">

          {Array.isArray(project.tags) ? (

            project.tags.map((tag, idx) => (
              <span
                key={`${project.id}-${idx}`}
                className="tag"
              >
                {tag}
              </span>
            ))

          ) : (

            project.tags
              ?.split(',')
              .map((tag, idx) => (
                <span
                  key={`${project.id}-${idx}`}
                  className="tag"
                >
                  {tag.replace(
                    /[\[\]" ]/g,
                    ''
                  )}
                </span>
              ))

          )}

        </div>

      </div>

    </article>
  );
};


// ==========================================
// Main Home
// ==========================================

function Home() {

  const navigate = useNavigate();

  const canvasRef = useRef(null);


  const [previewProjects, setPreviewProjects] =
    useState([]);

  const [latestTemplate, setLatestTemplate] =
    useState(null);


  // ==========================================
  // Canvas Mesh Animation
  // ==========================================

  useEffect(() => {

    const canvas = canvasRef.current;

    if (!canvas) return;


    const reduceMotionQuery =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      );


    // 접근성 설정에 따라 애니메이션 비활성화
    if (reduceMotionQuery.matches) {
      return;
    }


    const ctx = canvas.getContext('2d');

    if (!ctx) return;


    let width = 0;
    let height = 0;
    let dpr = 1;

    let nodes = [];

    let animationFrameId = null;


    const LINK_DISTANCE = 150;
    const MAX_NODES = 90;


    // ========================================
    // Canvas Resize
    // ========================================

    const resize = () => {

      const rect =
        canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;


      dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );


      canvas.width =
        Math.round(width * dpr);

      canvas.height =
        Math.round(height * dpr);


      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );


      // 화면 크기에 따른 노드 개수
      const nodeCount = Math.min(
        MAX_NODES,
        Math.max(
          25,
          Math.round(
            (width * height) / 16000
          )
        )
      );


      nodes = Array.from(
        { length: nodeCount },
        () => ({
          x: Math.random() * width,
          y: Math.random() * height,

          vx:
            (Math.random() - 0.5) *
            0.35,

          vy:
            (Math.random() - 0.5) *
            0.35
        })
      );
    };


    // ========================================
    // Node Update
    // ========================================

    const updateNodes = () => {

      for (const node of nodes) {

        node.x += node.vx;
        node.y += node.vy;


        if (
          node.x <= 0 ||
          node.x >= width
        ) {
          node.vx *= -1;

          node.x = Math.max(
            0,
            Math.min(width, node.x)
          );
        }


        if (
          node.y <= 0 ||
          node.y >= height
        ) {
          node.vy *= -1;

          node.y = Math.max(
            0,
            Math.min(height, node.y)
          );
        }
      }
    };


    // ========================================
    // 연결선 렌더링
    // ========================================

    const drawConnections = () => {

      const linkDistanceSquared =
        LINK_DISTANCE *
        LINK_DISTANCE;


      ctx.lineWidth = 0.7;


      for (
        let i = 0;
        i < nodes.length;
        i++
      ) {

        const a = nodes[i];


        for (
          let j = i + 1;
          j < nodes.length;
          j++
        ) {

          const b = nodes[j];


          const dx =
            a.x - b.x;

          const dy =
            a.y - b.y;


          const distanceSquared =
            dx * dx + dy * dy;


          // 불필요한 sqrt 계산 방지
          if (
            distanceSquared >=
            linkDistanceSquared
          ) {
            continue;
          }


          const distance =
            Math.sqrt(
              distanceSquared
            );


          const alpha =
            (1 -
              distance /
              LINK_DISTANCE) *
            0.45;


          ctx.strokeStyle =
            `rgba(168, 85, 247, ${alpha})`;


          ctx.beginPath();

          ctx.moveTo(
            a.x,
            a.y
          );

          ctx.lineTo(
            b.x,
            b.y
          );

          ctx.stroke();
        }
      }
    };


    // ========================================
    // Node 렌더링
    // ========================================

    const drawNodes = () => {

      ctx.fillStyle =
        'rgba(201, 107, 255, 0.75)';


      for (const node of nodes) {

        ctx.beginPath();

        ctx.arc(
          node.x,
          node.y,
          1.6,
          0,
          Math.PI * 2
        );

        ctx.fill();
      }
    };


    // ========================================
    // Animation Loop
    // ========================================

    const frame = () => {

      ctx.clearRect(
        0,
        0,
        width,
        height
      );


      updateNodes();

      drawConnections();

      drawNodes();


      animationFrameId =
        window.requestAnimationFrame(
          frame
        );
    };


    // 초기화
    resize();

    window.addEventListener(
      'resize',
      resize
    );


    animationFrameId =
      window.requestAnimationFrame(
        frame
      );


    // ========================================
    // Cleanup
    // ========================================

    return () => {

      window.removeEventListener(
        'resize',
        resize
      );


      if (
        animationFrameId !== null
      ) {
        window.cancelAnimationFrame(
          animationFrameId
        );
      }
    };

  }, []);


  // ==========================================
  // Supabase Data
  // ==========================================

  useEffect(() => {

    // ----------------------------------------
    // 최신 포트폴리오 2개
    // ----------------------------------------

    const fetchLatestProjects =
      async () => {

        const {
          data,
          error
        } = await supabase
          .from('projects')
          .select('*')
          .order(
            'sort_order',
            {
              ascending: true
            }
          )
          .range(0, 1);


        if (!error && data) {
          setPreviewProjects(data);
        }
      };


    // ----------------------------------------
    // 최신 템플릿 1개
    // CORPORATE 제외
    // ----------------------------------------

    const fetchLatestTemplate =
      async () => {

        const {
          data,
          error
        } = await supabase
          .from('templates')
          .select('*')
          .neq(
            'category',
            'CORPORATE'
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(1)
          .single();


        if (!error && data) {
          setLatestTemplate(data);
        }
      };


    fetchLatestProjects();

    fetchLatestTemplate();

  }, []);


  // ==========================================
  // 문의하기
  // ==========================================

  const handleInquiry = () => {
    navigate('/contact');
  };


  // ==========================================
  // Render
  // ==========================================

  return (

    <div className="home-container">


      {/* =================================================
          HIGH-END CANVAS HERO
      ================================================= */}

      <header className="hero-mesh-section">

        <canvas
          ref={canvasRef}
          className="mesh-canvas"
          aria-hidden="true"
        />


        {/* Canvas 위 오버레이 */}

        <div className="hero-glow" />


        {/* Hero Content */}

        <div className="hero-content">

          <span className="sub-tag">
            HIGH-END WEB CONSTRUCTION B2B
          </span>


          <h1>
            DIGITAL.
          </h1>


          <p className="desc">
            기업의 격(格)을 증명하는
            <br />
            하이엔드 웹사이트 구축, YKINAS
          </p>


          <p className="sub-desc">
            당신의 웹사이트는 24시간 일하는
            <br className="mobile-only" />
            가장 유능한 영업 사원이어야 합니다.
          </p>


          <Button
            text="프로젝트 문의하기"
            onClick={handleInquiry}
          />

        </div>

      </header>


      {/* =================================================
          템플릿 하이라이트
      ================================================= */}

      <section className="home-template-highlight">

        <div className="container">

          <div className="section-header">

            <span>
              PREMIUM SOLUTION
            </span>

            <h2>
              Template Line-up
            </h2>

          </div>


          {latestTemplate ? (

            <div className="highlight-flex">


              <div className="highlight-content">

                <span className="cat-tag">
                  {latestTemplate.category}
                </span>


                <h3>
                  {latestTemplate.title}
                </h3>


                <p className="highlight-desc">
                  {latestTemplate.description}
                </p>


                <ul className="feature-list">

                  <li>
                    <Sparkles size={18} />
                    하이엔드 최적화 UI/UX 디자인
                  </li>

                  <li>
                    <Sparkles size={18} />
                    {latestTemplate.price_info ||
                      '상담 후 결정'}
                  </li>

                  <li>
                    <Sparkles size={18} />
                    SEO 엔진 최적화 및 모바일 대응
                  </li>

                </ul>


                <Button
                  text="템플릿 자세히 보기"
                  onClick={() =>
                    navigate('/templates')
                  }
                />

              </div>


              <div
                className="highlight-image"
                onClick={() =>
                  navigate('/templates')
                }
              >

                <img
                  alt={latestTemplate.title}
                  src={
                    latestTemplate.thumbnail_url
                  }
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800';
                  }}
                />

              </div>

            </div>

          ) : (

            <div className="loading-shimmer">
              템플릿을 불러오는 중입니다...
            </div>

          )}

        </div>

      </section>


      {/* =================================================
          서비스
      ================================================= */}

      <section
        id="services"
        className="service-grid"
      >

        <div className="service-card">

          <Monitor
            className="service-icon"
            size={40}
            style={{
              stroke:
                'var(--icon-color)'
            }}
          />

          <h3>
            홈페이지 제작
          </h3>

          <p>
            브랜드 아이덴티티를 반영한
            <br />
            완성도 높은 디지털 결과물을 제작합니다.
          </p>

        </div>


        <div className="service-card">

          <ShoppingCart
            className="service-icon"
            size={40}
            style={{
              stroke:
                'var(--icon-color)'
            }}
          />

          <h3>
            쇼핑몰 구축
          </h3>

          <p>
            결제·상품·주문 관리까지 고려한
            <br />
            안정적인 이커머스 환경을 구축합니다.
          </p>

        </div>


        <div className="service-card">

          <Settings
            className="service-icon"
            size={40}
            style={{
              stroke:
                'var(--icon-color)'
            }}
          />

          <h3>
            유지보수 &amp; 관리
          </h3>

          <p>
            오류 수정, 콘텐츠 변경, 기능 개선 등
            <br />
            지속적인 웹사이트 관리를 지원합니다.
          </p>

        </div>

      </section>


      {/* =================================================
          포트폴리오
      ================================================= */}

      <section
        className="home-portfolio ykinas-portfolio"
      >

        <div className="section-header">

          <span>
            PORTFOLIO
          </span>

          <h2>
            Latest Projects
          </h2>

        </div>


        <div className="portfolio-grid portfolio-preview-list">

          {previewProjects.map(
            (project) => (

              <PreviewItem
                key={project.id}
                project={project}
                navigate={navigate}
              />

            )
          )}

        </div>


        <div className="view-more-center">

          <Button
            text="전체 포트폴리오 보기"
            onClick={() =>
              navigate('/portfolio')
            }
          />

        </div>

      </section>

    </div>
  );
}


export default Home;