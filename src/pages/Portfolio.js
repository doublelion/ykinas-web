import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import '../style/Portfolio.scss';

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6;

  const categories = useMemo(() => [
    { id: 'ALL', name: 'ALL' },
    { id: 'MOBILE FRONTEND', name: 'MOBILE' },
    { id: 'PC, MOBILE FRONTEND', name: 'PC / MOBILE' },
    { id: 'CROSS PLATFORM FRONTEND', name: 'CROSS PLATFORM' }
  ], []);

  const fetchProjects = useCallback(async (isInitial = false) => {
    const from = isInitial ? 0 : projects.length;
    const to = from + ITEMS_PER_PAGE - 1;

    // Portfolio.js 내부 fetchProjects 함수 수정
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filter !== 'ALL') {
      query = query.ilike('category', `%${filter}%`);
    }

    const { data, error, count } = await query;
    if (error) return console.error(error);

    setProjects(prev => isInitial ? data : [...prev, ...data]);
    setHasMore(count > (isInitial ? data.length : projects.length + data.length));
  }, [filter, projects.length]);

  useEffect(() => {
    fetchProjects(true);
  }, [filter]); // 필터가 바뀔 때만 초기화 후 호출

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
          <article key={project.id} className="portfolio-item">
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
              <p>{project.desc}</p>
              <div className="tags">
                {Array.isArray(project.tags) ? (
                  project.tags.map((tag, idx) => <span key={idx} className="tag">{tag}</span>)
                ) : (
                  project.tags?.split(',').map((tag, idx) => <span key={idx} className="tag">{tag.trim()}</span>)
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 위치를 그리드 밖 하단 중앙으로 고정 */}
      {!hasMore && projects.length > 0 && (
        <div className="portfolio-footer">
          <p className="end-msg">모든 프로젝트를 불러왔습니다.</p>
        </div>
      )}
    </section>
  );
}

export default Portfolio;