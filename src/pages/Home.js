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

import '../style/Home.scss';


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