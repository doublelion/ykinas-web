import React, { useState } from 'react';
import { PROJECTS } from '../data/project'; // 공통 데이터 임포트
import Button from '../components/Button';
import '../style/Portfolio.scss';

function Portfolio() {
  // 필터 상태 관리 (기본값: 'ALL')
  const [filter, setFilter] = useState('ALL');

  // 카테고리 목록 추출 (중복 제거)
  const categories = ['ALL', ...new Set(PROJECTS.map((p) => p.category))];

  // 필터링된 프로젝트 리스트
  const filteredProjects =
    filter === 'ALL' ? PROJECTS : PROJECTS.filter((p) => p.category === filter);
  return (
    <section className="ykinas-portfolio">
      <div className="portfolio-header">
        <span className="sub-title d-din">OUR WORKS</span>
        <h2 className="main-title">YKINAS PROJECTS</h2>
      </div>

      {/* 필터 버튼 섹션 */}
      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={filter === cat ? 'active' : ''}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 프로젝트 그리드 리스트 */}
      <div className="portfolio-grid">
        {filteredProjects.map((project) => (
          <article key={project.id} className="portfolio-item">
            <div className="item-image">
              <img src={project.img} alt={project.title} />
              <div className="overlay">
                <a href={project.link} target="_blank" rel="noreferrer">
                  <Button text="자세히 보기" />
                </a>
              </div>
            </div>
            <div className="item-info">
              <span className="category">{project.category}</span>
              <h3>{project.title}</h3>
              <p>{project.desc}</p>
              <div className="tags">
                {project.tags?.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Portfolio;
