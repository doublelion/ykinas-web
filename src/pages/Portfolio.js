import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import '../style/Portfolio.scss';

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6;

  // [1] 카테고리 정의 수정
  const categories = useMemo(() => [
    { id: 'ALL', name: 'ALL' },
    { id: 'COMMERCE', name: 'E-COMMERCE' }, // 카페24, 쇼핑몰, 결제 시스템 특화
    { id: 'CORPORATE', name: 'CORPORATE' }, // 기업 홈페이지, 브랜드 사이트, 랜딩페이지
    { id: 'SOLUTION', name: 'WEB SOLUTION' } // 예약 시스템, 맞춤형 기능, 관리자 툴
  ], []);

  // [1] 데이터 가져오기 핵심 함수
  const fetchProjects = useCallback(async (isInitial = false) => {
    // 필터 변경 시 0부터 시작, 추가 로딩 시 현재 길이부터 시작
    const start = isInitial ? 0 : projects.length;
    const end = start + ITEMS_PER_PAGE - 1;

    let query = supabase.from('projects').select('*', { count: 'exact' });

    if (filter !== 'ALL') {
      query = query.ilike('category', `%${filter.trim()}%`);
    }

    const { data, error, count } = await query
      .order('sort_order', { ascending: true }) // 이 줄로 교체
      .range(start, end);

    setProjects(prev => isInitial ? data : [...prev, ...data]);
    setHasMore(count > (isInitial ? data.length : projects.length + data.length));
  }, [filter]); // projects.length 의존성 제거 (무한루프 방지)

  // [2] 필터 변경 감지 및 초기화
  useEffect(() => {
    fetchProjects(true);
  }, [filter, fetchProjects]);

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