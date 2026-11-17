import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import ProductDetailModal from './ProductDetailModal'; // 새로 추가할 모달 컴포넌트
import '../style/Portfolio.scss';

// [최적화] React.memo를 사용하여 불필요한 재렌더링 방지
const PortfolioItem = memo(({ project, expandedId, setExpandedId, openModal }) => {
  const isExpanded = expandedId === project.id;
  const descriptionRef = useRef(null);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      setShowBtn(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
    }
  }, [project.desc]);

  return (
    <article className="portfolio-item">
      <div className="item-image" onClick={() => openModal(project)} style={{ cursor: 'pointer' }}>
        {project.badge && <span className="badge-premium">{project.badge}</span>}
        <img src={project.img_url} alt={project.title} loading="lazy" />
        <div className="overlay">
          <span className="btn-fake"><Button text="프로젝트 보기" /></span>
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
});

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // [기능 추가] 모달 상태 관리
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ITEMS_PER_PAGE = 6;

  const categories = useMemo(() => [
    { id: 'ALL', name: 'ALL' },
    { id: 'COMMERCE', name: 'E-COMMERCE' },
    { id: 'CORPORATE', name: 'CORPORATE' },
    { id: 'APP', name: 'APP' }
  ], []);

  const fetchProjects = useCallback(async (isInitial = false) => {
    try {
      const start = isInitial ? 0 : projects.length;
      const end = start + ITEMS_PER_PAGE - 1;

      let query = supabase.from('projects').select('*', { count: 'exact' });
      if (filter !== 'ALL') query = query.ilike('category', `%${filter.trim()}%`);

      const { data, count, error } = await query
        .order('sort_order', { ascending: true })
        .range(start, end);

      if (error) throw error; // [최적화] 예외 처리 추가

      setProjects(prev => isInitial ? data : [...prev, ...data]);
      setHasMore(count > (isInitial ? (data?.length || 0) : projects.length + (data?.length || 0)));
    } catch (err) {
      console.error('Supabase 데이터 로드 실패:', err.message);
    }
  }, [filter, projects.length]);

  useEffect(() => {
    fetchProjects(true);
  }, [filter, fetchProjects]);

  const handleOpenModal = useCallback((project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  }, []);

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
            openModal={handleOpenModal}
          />
        ))}
      </div>

      {hasMore && (
        <div className="portfolio-footer">
          <button className="btn-loadmore" onClick={() => fetchProjects(false)}>LOAD MORE</button>
        </div>
      )}

      {/* 모달 렌더링 */}
      {isModalOpen && selectedProject && (
        <ProductDetailModal
          project={selectedProject}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </section>
  );
}

export default Portfolio;