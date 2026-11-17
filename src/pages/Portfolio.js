import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import ProductDetailModal from '../components/ProductDetailModal';
import '../style/Portfolio.scss';

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
      <div className="item-image" style={{ cursor: 'pointer' }}>
        {project.badge && <span className="badge-premium">{project.badge}</span>}
        <img src={project.img_url} alt={project.title} loading="lazy" />
        <div
          className="overlay"
          onClick={() => project.title === '뷰티테라피(BeautyTherapy)' ? openModal(project) : window.open(project.link_url, '_blank')}
        >
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
        {project.title === '뷰티테라피(BeautyTherapy)' && (
          <button
            className="btn-more"
            style={{ textDecoration: 'none', marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => openModal(project)}
          >
            상세페이지 보기 <span style={{ fontSize: '1.4rem' }}>➔</span>
          </button>
        )}
      </div>
    </article>
  );
});

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // [개선] 현재 페이지 상태 추가
  const [page, setPage] = useState(0);

  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ITEMS_PER_PAGE = 6;

  const categories = useMemo(() => [
    { id: 'ALL', name: 'ALL' },
    { id: 'COMMERCE', name: 'E-COMMERCE' },
    { id: 'CORPORATE', name: 'CORPORATE' },
    { id: 'APP', name: 'APP' },
    { id: 'DETAIL', name: 'DETAIL PAGE' }
  ], []);

  // [개선] projects.length 대신 currentPage 매개변수 사용 및 의존성 배열 정리
  const fetchProjects = useCallback(async (currentPage, isInitial = false) => {
    try {
      const start = currentPage * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      let query = supabase.from('projects').select('*', { count: 'exact' });
      if (filter !== 'ALL') query = query.ilike('category', `%${filter.trim()}%`);

      const { data, count, error } = await query
        .order('sort_order', { ascending: true })
        .range(start, end);

      if (error) throw error;

      setProjects(prev => isInitial ? data : [...prev, ...data]);
      setHasMore(count > start + (data?.length || 0));
    } catch (err) {
      console.error('Supabase 데이터 로드 실패:', err.message);
    }
  }, [filter]); // 필터가 바뀔 때만 함수 재생성

  // [개선] 초기 데이터 로드 및 필터 변경 시 실행
  useEffect(() => {
    setPage(0); // 필터가 바뀌면 페이지 초기화
    fetchProjects(0, true);
  }, [filter, fetchProjects]);

  // [개선] 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProjects(nextPage, false);
  };

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
          {/* [개선] Load More 클릭 시 handleLoadMore 호출 */}
          <button className="btn-loadmore" onClick={handleLoadMore}>LOAD MORE</button>
        </div>
      )}

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