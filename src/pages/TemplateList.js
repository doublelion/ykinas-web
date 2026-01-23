import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TEMPLATES } from '../data/template';
import { MessageCircle, Eye } from 'lucide-react';
import '../style/TemplateList.scss';

function TemplateList() {
  const [filter, setFilter] = useState('ALL');

  const categories = useMemo(() => {
    if (!TEMPLATES) return ['ALL'];
    return ['ALL', ...new Set(TEMPLATES.map((t) => t.category))];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!TEMPLATES) return [];
    return filter === 'ALL'
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === filter);
  }, [filter]);

  return (
    <section className="ykinas-templates">
      <div className="template-header">
        <span className="sub-title">PREMIUM ASSETS</span>
        <h2 className="main-title">
          READY-TO-USE <br />
          <span className="highlight">TEMPLATES</span>
        </h2>
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
        {filteredTemplates.map((tpl) => (
          <article key={tpl.id} className="template-card">
            <div className="card-image">
              {/* 🚀 중요: tpl.img가 리스트 썸네일입니다 */}
              <img
                src={tpl.img || '/images/default-thumbnail.jpg'}
                alt={tpl.title}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x400';
                }}
              />
              <div className="overlay">
                <div className="action-buttons">
                  <Link to={`/templates/${tpl.id}`}>
                    <button className="btn-demo">
                      <Eye size={16} /> 데모 보기
                    </button>
                  </Link>
                  <Link to="/contact">
                    <button className="btn-price">
                      <MessageCircle size={16} /> 가격 상담
                    </button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="card-info">
              <div className="info-top">
                <span className="category">{tpl.category}</span>
                <span className="price">{tpl.price || '상담 후 결정'}</span>
              </div>
              <h3>{tpl.title}</h3>
              <p>{tpl.desc}</p>
              <div className="tags">
                {tpl.tags?.map((tag) => (
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

export default TemplateList;
