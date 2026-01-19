import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Loader2, Search, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import '../style/Audit.scss';

function Audit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [contact, setContact] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    '구글 라이트하우스 엔진 연결 중...',
    '사이트 아키텍처 스캔 중...',
    '성능 및 SEO 지표 분석 중...',
    '최적화 솔루션 도출 중...',
  ];
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString(),
      });
      alert(
        '와이키나스 전문가에게 분석 요청이 전송되었습니다. 24시간 내에 연락드릴게요!',
      );
      setContact(''); // 입력창 초기화
    } catch (error) {
      alert('전송 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const runAudit = async (e) => {
    e.preventDefault();
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${targetUrl}&category=PERFORMANCE&category=SEO&key=AIzaSyAMPB3s1dlEMWdPnF2IP8VxF1C16Gid55Q`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setResult(data.lighthouseResult.categories);
    } catch (error) {
      alert('진단 실패: URL을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="audit-container">
      {/* 고퀄리티 로딩 딤(Dim) 처리 */}
      {loading && (
        <div className="audit-dim">
          <div className="scanner-box">
            <div className="radar">
              <div className="radar-beam"></div>
              <div className="radar-dot"></div>
            </div>
            <h2 className="loading-text">{steps[loadingStep]}</h2>
            <p>최대 30초가 소요될 수 있습니다.</p>
            <div className="progress-bar-container">
              <div
                className="progress-fill"
                style={{ width: `${(loadingStep + 1) * 25}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="audit-wrapper">
        <header className="audit-header">
          <span className="badge">AI-BASED ANALYSIS</span>
          <h1>
            고치지 않아도 되는 <br />{' '}
            <span className="highlight">웹사이트를 만듭니다</span>
          </h1>
          <p>전환율을 가로막는 병목 구간을 데이터로 증명합니다.</p>
        </header>

        <form onSubmit={runAudit} className="modern-search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="분석할 URL을 입력하세요 (예: ykinas.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            분석 시작
          </button>
        </form>

        {result && (
          <div className="audit-results slide-up">
            <div className="result-grid">
              <div
                className={`score-card ${result.performance.score < 0.5 ? 'low' : ''}`}
              >
                <Zap size={40} className="icon" />
                <h3>성능(Performance)</h3>
                <div className="score-val">
                  {(result.performance.score * 100).toFixed(0)}
                </div>
              </div>
              <div className="score-card">
                <ShieldCheck size={40} className="icon" />
                <h3>최적화(SEO)</h3>
                <div className="score-val">
                  {(result.seo.score * 100).toFixed(0)}
                </div>
              </div>
            </div>

            <div className="consulting-cta">
              <div className="cta-content">
                <h2>"점수보다 중요한 건 전환의 흐름입니다."</h2>
                <p>
                  전문가가 직접 구조를 분석한 1:1 리포트를 무료로 보내드립니다.
                </p>
              </div>
              <form
                name="audit-consulting"
                method="POST"
                data-netlify="true"
                className="cta-form"
                onSubmit={handleFormSubmit} // 이 부분 추가
              >
                {/* 넷리파이 필수 히든 필드 */}
                <input
                  type="hidden"
                  name="form-name"
                  value="audit-consulting"
                />

                {/* 분석 데이터 자동 전송용 히든 필드 */}
                <input type="hidden" name="target-url" value={url} />
                <input
                  type="hidden"
                  name="perf-score"
                  value={(result?.performance?.score * 100).toFixed(0)}
                />
                <input
                  type="hidden"
                  name="seo-score"
                  value={(result?.seo?.score * 100).toFixed(0)}
                />

                <input
                  type="text"
                  name="contact-info" // index.html과 일치
                  placeholder="연락처 또는 이메일"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
                <button type="submit">
                  무료 제안서 받기 <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Audit;
