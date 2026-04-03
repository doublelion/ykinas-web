import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import '../style/Portfolio.scss';

// 개별 아이템의 텍스트 길이를 체크하기 위한 서브 컴포넌트
const PortfolioItem = ({ project, expandedId, setExpandedId }) => {
  const isExpanded = expandedId === project.id;
  const descriptionRef = useRef(null);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      // 실제 텍스트 높이가 컨테이너 높이보다 크면 버튼 노출
      setShowBtn(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
    }
  }, [project.desc]);

  return (
    <article className="portfolio-item">
      <div className="item-image">
        <img src={project.img_url} alt={project.title} loading="lazy" />
        <div className="overlay">
          <a href={project.link_url} target="_blank" rel="noreferrer">
            <Button text="자세히 보기" />
          </a>
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
            <button className="btn-inline-more" onClick={() => setExpandedId(isExpanded ? null : project.id)}>
              {isExpanded ? ' [접기]' : '... 더보기'}
            </button>
          )}
        </div>

        <div className="tags">
          {Array.isArray(project.tags) ? (
            project.tags.map((tag, idx) => <span key={idx} className="tag">{tag}</span>)
          ) : (
            project.tags?.split(',').map((tag, idx) => <span key={idx} className="tag">{tag.trim()}</span>)
          )}
        </div>
      </div>
    </article>
  );
};

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const ITEMS_PER_PAGE = 6;

  const categories = useMemo(() => [
    { id: 'ALL', name: 'ALL' },
    { id: 'COMMERCE', name: 'E-COMMERCE' },
    { id: 'CORPORATE', name: 'CORPORATE' },
    { id: 'SOLUTION', name: 'WEB SOLUTION' }
  ], []);

  const fetchProjects = useCallback(async (isInitial = false) => {
    const start = isInitial ? 0 : projects.length;
    const end = start + ITEMS_PER_PAGE - 1;

    let query = supabase.from('projects').select('*', { count: 'exact' });
    if (filter !== 'ALL') query = query.ilike('category', `%${filter.trim()}%`);

    const { data, count } = await query
      .order('sort_order', { ascending: true })
      .range(start, end);

    setProjects(prev => isInitial ? data : [...prev, ...data]);
    setHasMore(count > (isInitial ? (data?.length || 0) : projects.length + (data?.length || 0)));
  }, [filter, projects.length]);

  useEffect(() => {
    fetchProjects(true);
  }, [filter]);

  return (
    <section className="ykinas-portfolio">
      <div className="portfolio-header">
        <span className="sub-title">OUR WORKS</span>
        <h2 className="main-title">YKINAS PROJECTS</h2>
      </div>

      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={filter === cat.id ? 'active' : ''}
            onClick={() => setFilter(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="portfolio-grid">
        {projects.map((project) => (
          <PortfolioItem
            key={project.id}
            project={project}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />
        ))}
      </div>

      {hasMore && (
        <div className="portfolio-footer">
          <button className="btn-loadmore" onClick={() => fetchProjects()}>LOAD MORE</button>
        </div>
      )}
      {!hasMore && projects.length > 0 && (
        <div className="portfolio-footer">
          <p className="end-msg">모든 프로젝트를 불러왔습니다.</p>
        </div>
      )}
    </section>
  );
}

export default Portfolio;