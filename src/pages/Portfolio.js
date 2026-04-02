import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; 
import Button from '../components/Button';
import '../style/Portfolio.scss';

function Portfolio() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6; // 한 번에 가져올 개수

  // 데이터 페칭 함수
  const fetchProjects = useCallback(async (pageNum, currentFilter) => {
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

    if (currentFilter !== 'ALL') {
      query = query.eq('category', currentFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    setProjects((prev) => (pageNum === 0 ? data : [...prev, ...data]));
    setHasMore(count > (pageNum + 1) * ITEMS_PER_PAGE);
  }, []);

  // 필터나 페이지 변경 시 실행
  useEffect(() => {
    fetchProjects(0, filter);
    setPage(0);
  }, [filter, fetchProjects]);

  // 무한 스크롤 핸들러 (Intersection Observer 대신 심플하게 구현)
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && hasMore) {
        setPage((prev) => {
          const nextPage = prev + 1;
          fetchProjects(nextPage, filter);
          return nextPage;
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, filter, fetchProjects]);

  return (
    <section className="ykinas-portfolio">
      {/* 헤더 및 필터바 영역 (기존과 동일하되 categories는 고정 혹은 DB에서 추출) */}
      <div className="portfolio-grid">
        {projects.map((project) => (
          <article key={project.id} className="portfolio-item">
            <div className="item-image">
              <img src={project.img_url} alt={project.title} loading="lazy" />
              {/* ... 나머지 UI 동일 ... */}
            </div>
            {/* ... 상세 정보 영역 동일 ... */}
          </article>
        ))}
      </div>
      {!hasMore && <p className="end-msg">모든 프로젝트를 불러왔습니다.</p>}
    </section>
  );
}

export default Portfolio;