import React from 'react';
import '../style/Portfolio.scss';

// YKINAS 포트폴리오 데이터 (이곳의 내용만 교체하시면 됩니다)
const PROJECTS = [
  {
    id: 1,
    category: 'IT CONSULTING',
    title: 'ENTERPRISE DIGITAL TRANSFORMATION',
    desc: '기업의 복잡한 비즈니스 프로세스를 디지털로 전환하여 운영 효율을 극대화합니다.',
    img: '/assets/images/project01.jpg', // 실제 이미지 경로로 교체
    link: '/portfolio/dt',
  },
  {
    id: 2,
    category: 'SOFTWARE DEVELOPMENT',
    title: 'HIGH-PERFORMANCE CUSTOM SOLUTIONS',
    desc: '최신 기술 스택을 활용하여 확장 가능하고 안정적인 맞춤형 소프트웨어를 구축합니다.',
    img: '/assets/images/project02.jpg',
    link: '/portfolio/software',
  },
  {
    id: 3,
    category: 'CLOUD INFRASTRUCTURE',
    title: 'SCALABLE CLOUD ARCHITECTURE',
    desc: '유연한 클라우드 인프라 설계를 통해 비즈니스의 성장 속도에 맞춘 최적의 환경을 제공합니다.',
    img: '/assets/images/project03.jpg',
    link: '/portfolio/cloud',
  },
];

function Portfolio() {
  return (
    <section className="ykinas-portfolio">
      <div className="portfolio-header">
        <span className="sub-title d-din">OUR WORKS</span>
        <h2 className="main-title">YKINAS PROJECTS</h2>
      </div>

      <div className="project-grid">
        {PROJECTS.map((project) => (
          <div className="project-card" key={project.id}>
            {/* 프로젝트 배경 이미지 */}
            <div
              className="card-bg"
              style={{ backgroundImage: `url(${project.img})` }}
            ></div>

            {/* 카드 오버레이 컨텐츠 */}
            <div className="card-content">
              <div className="text-box">
                <span className="category d-din">{project.category}</span>
                <h3 className="project-title d-din">{project.title}</h3>
                <p className="project-desc">{project.desc}</p>
                <a href={project.link} className="view-details d-din">
                  VIEW CASE STUDY <span>→</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Portfolio;
