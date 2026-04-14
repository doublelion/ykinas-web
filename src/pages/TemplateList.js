import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MessageCircle, Eye } from 'lucide-react';
import '../style/TemplateList.scss';

const TemplateItem = ({ tpl, expandedId, setExpandedId }) => {
  const isExpanded = expandedId === tpl.id;
  const descriptionRef = useRef(null);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      // 실제 높이가 2줄 높이(약 48px)보다 크면 더보기 노출
      setShowBtn(descriptionRef.current.scrollHeight > 50);
    }
  }, [tpl.description]);

  return (
    <article className="template-card">
      <div className="card-image">
        <img
          src={tpl.thumbnail_url}
          alt={tpl.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600';
          }}
        />
        <div className="overlay">
          <div className="action-buttons">
            {tpl.is_external ? (
              <a href={tpl.external_link} target="_blank" rel="noopener noreferrer">
                <button className="btn-demo"><Eye size={16} /> 샘플 사이트</button>
              </a>
            ) : (
              <Link to={`/templates/${tpl.id}`}>
                <button className="btn-demo"><Eye size={16} /> 데모 보기</button>
              </Link>
            )}
            <Link to="/contact">
              <button className="btn-price"><MessageCircle size={16} /> 견적 상담</button>
            </Link>
          </div>
        </div>
      </div>

      <div className="card-info">
        <div className="info-top">
          <span className="category">{tpl.category}</span>
          <span className="price">{tpl.price_info || '상담 후 결정'}</span>
        </div>
        <h3>{tpl.title}</h3>

        {/* 🚀 포트폴리오 스타일 구조로 변경 */}
        <div className={`desc-wrap ${isExpanded ? 'expanded' : ''}`}>
          <p className="desc-text" ref={descriptionRef}>
            {tpl.description}
          </p>
          {(showBtn || isExpanded) && (
            <button 
              className="btn-inline-more" 
              onClick={(e) => {
                e.preventDefault();
                setExpandedId(isExpanded ? null : tpl.id);
              }}
            >
              {isExpanded ? ' [접기]' : '... 더보기'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

function TemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false); // 초기값을 false로 잡고 필요할 때 켭니다.
  const [filter, setFilter] = useState('ALL');
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const ITEMS_PER_PAGE = 6;

  const categories = ['ALL', 'COMMERCE', 'PORTFOLIO'];

  // 🚀 수정된 페칭 로직
  const fetchTemplates = useCallback(async (isInitial = false) => {
    if (loading) return; // 중복 호출 방지
    setLoading(true);

    // 🔥 핵심: templates.length 대신 함수형 업데이트 내부의 값을 활용하거나 
    // 호출 시점의 정확한 offset 계산이 필요합니다.
    setTemplates(prev => {
      const start = isInitial ? 0 : prev.length;
      const end = start + ITEMS_PER_PAGE - 1;

      // 비동기 함수를 내부에서 호출하기 위해 즉시 실행 함수 처리하거나 밖에서 계산합니다.
      (async () => {
        let query = supabase.from('templates').select('*', { count: 'exact' });
        query = query.neq('category', 'CORPORATE');
        if (filter !== 'ALL') query = query.ilike('category', `%${filter.trim()}%`);

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(start, end);

        if (!error && data) {
          setTemplates(prevList => isInitial ? data : [...prevList, ...data]);
          setHasMore(count > (isInitial ? data.length : prev.length + data.length));
        }
        setLoading(false);
      })();

      return prev; // 일단 현재 상태 유지 (비동기 완료 후 업데이트됨)
    });
  }, [filter]); // 의존성에서 templates.length 제거 (무한루프 방지)

  // 🚀 실제 호출용 useEffect (위의 복잡한 로직을 단순화한 버전)
  const loadData = useCallback(async (isInitial = false) => {
    setLoading(true);
    const currentLength = isInitial ? 0 : templates.length;
    const start = currentLength;
    const end = start + ITEMS_PER_PAGE - 1;

    let query = supabase.from('templates').select('*', { count: 'exact' });
    query = query.neq('category', 'CORPORATE');
    if (filter !== 'ALL') query = query.ilike('category', `%${filter.trim()}%`);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (!error && data) {
      setTemplates(prev => isInitial ? data : [...prev, ...data]);
      setHasMore(count > (isInitial ? data.length : templates.length + data.length));
    }
    setLoading(false);
  }, [filter, templates.length]); // templates.length가 변할 때마다 함수 갱신

  useEffect(() => {
    loadData(true); // 필터 변경 시 초기화
  }, [filter]);

  return (
    <section className="ykinas-templates">
      <div className="template-header">
        <span className="sub-title">PREMIUM ASSETS</span>
        <h2 className="main-title">READY-TO-USE <br /><span className="highlight">TEMPLATES</span></h2>
      </div>

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

      <div className="template-grid">
        {templates.map((tpl) => (
          <TemplateItem
            key={tpl.id}
            tpl={tpl}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />
        ))}
      </div>

      {/* 3. 로딩 및 하단 버튼 로직 */}
      {loading && <div className="loading-msg">데이터를 불러오는 중...</div>}

      {hasMore && !loading && (
        <div className="portfolio-footer">
          <button className="btn-loadmore" onClick={() => fetchTemplates()}>LOAD MORE</button>
        </div>
      )}

      {!hasMore && templates.length > 0 && (
        <div className="portfolio-footer">
          <p className="end-msg">모든 템플릿을 불러왔습니다.</p>
        </div>
      )}
    </section>
  );
}

export default TemplateList;