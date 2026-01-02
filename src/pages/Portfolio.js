import React, { useState, useRef, useMemo } from 'react'; // useMemo 추가
import { PROJECTS } from '../data/project';
import Button from '../components/Button';
import '../style/Portfolio.scss';

function Portfolio() {
  const [filter, setFilter] = useState('ALL');
  const scrollRef = useRef(null);

  // [보완] 카테고리 목록을 메모이제이션하여 불필요한 연산 방지
  const categories = useMemo(() => {
    return ['ALL', ...new Set(PROJECTS.map((p) => p.category))];
  }, []);

  // [보완] 필터링 로직 메모이제이션
  const filteredProjects = useMemo(() => {
    return filter === 'ALL' 
      ? PROJECTS 
      : PROJECTS.filter((p) => p.category === filter);
  }, [filter]);

  const handleFilterClick = (e, cat) => {
    setFilter(cat);

    // [보완] 클릭된 버튼 가로 중앙 이동
    if (e.currentTarget) {
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest', // 세로 방향 이동 최소화
        inline: 'center',  // 가로 방향 중앙 정렬
      });
    }
  };

  return (
    <section className="ykinas-portfolio">
      <div className="portfolio-header">
        <span className="sub-title">OUR WORKS</span>
        <h2 className="main-title">YKINAS PROJECTS</h2>
      </div>

      <div className="filter-bar" ref={scrollRef}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={filter === cat ? 'active' : ''}
            onClick={(e) => handleFilterClick(e, cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="portfolio-grid">
        {filteredProjects.map((project) => (
          <article key={project.id} className="portfolio-item">
            <div className="item-image">
              {/* [팁] loading="lazy"를 추가하여 초기 로딩 성능 최적화 */}
              <img src={project.img} alt={project.title} loading="lazy" />
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
                {project.tags?.map((tag, idx) => (
                  <span key={`${project.id}-${tag}-${idx}`} className="tag">
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