import React from 'react';
import {
  Monitor,
  ShoppingCart,
  Settings,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Button from '../components/Button'; // 경로 확인 필요
import { PROJECTS } from '../data/project'; // 데이터 임포트
import { useNavigate } from 'react-router-dom';
import '../style/Home.scss';

function Home() {
  const navigate = useNavigate();

  // 최신 프로젝트 2개만 추출 (id 역순 혹은 최하단 2개)
  const previewProjects = PROJECTS.slice(-2).reverse();

  // 여기를 수정하면 납품용이 된다 //
  const handleInquiry = () => {
    navigate('/contact'); // 페이지 깜빡임 없이 이동
  };

  return (
    <div className="home-container">
      {/* 히어로 섹션 */}
      <header className="hero">
        <h2>
          Next Generation <br /> <span className="highlight">IT Solution</span>
        </h2>
        <p className="hero-desc">
          와이키나스는 홈페이지 제작부터 쇼핑몰 구축까지, 귀사의 비즈니스를
          디지털로 전환하는 최적의 파트너입니다.
        </p>
        <Button text="프로젝트 문의하기" onClick={handleInquiry} />
      </header>

      <section className="home-template-highlight">
        <div className="container">
          {/* 포트폴리오와 똑같은 헤더 구조 */}
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
                <li>
                  <Sparkles size={18} /> 4K 비주얼 및 하이엔드 디자인
                </li>
                <li>
                  <Sparkles size={18} /> Lighthouse 성능 지수 최적화
                </li>
                <li>
                  <Sparkles size={18} /> SEO 엔진 최적화 및 모바일 대응
                </li>
              </ul>
              <Button
                text="상세 정보 보기"
                onClick={() => navigate('/templates')}
              />
            </div>

            <div
              className="highlight-image"
              onClick={() => navigate('/templates')}
            >
              <img
                alt="Aristide Template"
                src="/templates/tpl-01/src/images/silence.webp"
                width="800"
                height="600"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 섹션 */}
      <section id="services" className="service-grid">
        <div className="service-card">
          <Monitor color="#00f2ff" size={40} />
          <h3>홈페이지 제작</h3>
          <p>
            브랜드 아이덴티티를 반영한
            <br />
            완성도 높은 디지털 결과물을 제작합니다.
          </p>
        </div>

        <div className="service-card">
          <ShoppingCart color="#00f2ff" size={40} />
          <h3>쇼핑몰 구축</h3>
          <p>
            결제·상품·주문 관리까지 고려한
            <br />
            안정적인 이커머스 환경을 구축합니다.
          </p>
        </div>

        <div className="service-card">
          <Settings color="#00f2ff" size={40} />
          <h3>유지보수 &amp; 관리</h3>
          <p>
            오류 수정, 콘텐츠 변경, 기능 개선 등<br />
            지속적인 웹사이트 관리를 지원합니다.
          </p>
        </div>
      </section>

      {/* 포트폴리오 섹션 - 데이터 연동 버전 */}
      <section className="home-portfolio">
        <div className="section-header">
          <span>PORTFOLIO</span>
          <h2>Latest Projects</h2>
        </div>

        <div className="portfolio-preview-list">
          {previewProjects.map((project) => (
            <div
              key={project.id}
              className="preview-card"
              onClick={() => navigate('/portfolio')}
            >
              {/* 이미지 배경 추가로 시각적 풍성함 부여 */}
              <div className="card-image">
                <img src={project.img} alt={project.title} />
              </div>
              <div className="card-info">
                <span className="category">{project.category}</span>
                <h3>{project.title}</h3>
                <p>{project.desc}</p>
                <div className="tags">
                  {project.tags?.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="card-hover-icon">
                <ArrowRight size={32} color="#00f2ff" />
              </div>
            </div>
          ))}
        </div>

        <div className="view-more-center">
          <Button
            text="전체 포트폴리오 보기"
            onClick={() => navigate('/portfolio')}
          />
        </div>
      </section>

      
    </div>
  );
}

export default Home;
