import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import '../style/Portfolio.scss';

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6;

  // 1. 카테고리 목록 정의 (DB에서 가져온 데이터 기반으로 동적 생성)
  const categories = useMemo(() => {
    return ['ALL', 'MOBILE', 'PC, MOBILE FRONTEND', 'CROSS PLATFORM FRONTEND'];
    // 또는 DB에서 unique한 값을 추출하도록 로직 추가 가능
  }, []);

  const fetchProjects = useCallback(async (isInitial = false) => {
    const from = isInitial ? 0 : projects.length;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filter !== 'ALL') {
      query = query.eq('category', filter);
    }

    const { data, error, count } = await query;
    if (error) return console.error(error);

    setProjects(prev => isInitial ? data : [...prev, ...data]);
    setHasMore(count > (isInitial ? data.length : projects.length + data.length));
  }, [filter, projects.length]);
  useEffect(() => {
    fetchProjects(true); // <--- 정확한 함수 이름으로 수정
  }, [fetchProjects]);


  return (
    <section className="ykinas-portfolio">
      <div className="portfolio-header">
        <span className="sub-title">OUR WORKS</span>
        <h2 className="main-title">YKINAS PROJECTS</h2>
      </div>

      {/* 필터바 복구 */}
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

      <div className="portfolio-grid">
        {projects.map((project) => (
          <article key={project.id} className="portfolio-item">
            <div className="item-image">
              {/* img -> img_url로 변경 */}
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
                {Array.isArray(project.tags)
                  ? project.tags.map((tag, idx) => <span key={idx} className="tag">{tag}</span>)
                  : project.tags?.toString().split(',').map((tag, idx) => (
                    <span key={idx} className="tag">{tag.replace(/[\[\]\" ]/g, '')}</span>
                  ))
                }
              </div>
            </div>
          </article>
        ))}
      </div>
      {!hasMore && projects.length > 0 && <p className="end-msg">모든 프로젝트를 불러왔습니다.</p>}
    </section>
  );
}

export default Portfolio;