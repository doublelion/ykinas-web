import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast'; // 💡 Toast UI 적용

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BannerItAdmin() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlMallId = urlParams.get('mall_id');

  const [currentMallId, setCurrentMallId] = useState(urlMallId || null);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [licensePlan, setLicensePlan] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [slides, setSlides] = useState([]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [deletedImagePaths, setDeletedImagePaths] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const handleLogin = async () => {
    const mallId = loginInput.trim();
    if (!mallId) return;

    if (supabaseUrl.includes('placeholder')) {
      setLoginError('시스템 환경 변수가 세팅되지 않았습니다. Vercel 세팅 후 재배포가 필요합니다.');
      return;
    }

    setIsChecking(true);
    setLoginError('');

    try {
      const { data, error } = await supabase
        .from('skin_licenses')
        .select('is_active, has_bannerit_module')
        .eq('mall_id', mallId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoginError('등록되지 않은 쇼핑몰 아이디입니다.');
      } else if (!data.is_active || !data.has_bannerit_module) {
        setLoginError('배너잇 서비스 이용 권한이 만료되었거나 없습니다.');
      } else {
        window.location.href = `?mall_id=${mallId}`;
      }
    } catch (err) {
      console.error(err);
      setLoginError('인증 서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!currentMallId) return;

    document.title = `BannerIt 관리자 | ${currentMallId || 'YKINAS'}`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/bannerit_favicon.ico';

    async function loadExistingBanner() {
      try {
        const { data: campaign } = await supabase
          .from('bannerit_campaigns')
          .select('id, is_active, bannerit_items(id, image_url, title, subtitle, cta_text, cta_link, sort_order)')
          .eq('mall_id', currentMallId)
          .maybeSingle();

        const { data: licenseData } = await supabase
          .from('skin_licenses')
          .select('plan_type')
          .eq('mall_id', currentMallId)
          .maybeSingle();

        if (licenseData && licenseData.plan_type) {
          setLicensePlan(licenseData.plan_type);
        }

        if (campaign) {
          setIsActive(campaign.is_active);
          if (campaign.bannerit_items && campaign.bannerit_items.length > 0) {
            const sortedItems = campaign.bannerit_items.sort((a, b) => a.sort_order - b.sort_order);
            const loadedSlides = sortedItems.map(item => ({
              id: item.id, title: item.title || '', subtitle: item.subtitle || '',
              cta_text: item.cta_text || '', cta_link: item.cta_link || '',
              imageUrl: item.image_url || '', originalImageUrl: item.image_url || '', file: null
            }));
            setSlides(loadedSlides);
          } else {
            addEmptySlide();
          }
        } else {
          addEmptySlide();
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        toast.error('기존 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    }

    loadExistingBanner();

    return () => {
      document.title = 'YKINAS | Premium Commerce Solutions';
      if (link) link.href = '/favicon.ico';
    };
  }, [currentMallId]);

  const addEmptySlide = () => {
    if (slides.length >= 3) {
      toast.error('최대 3개까지만 등록할 수 있습니다.');
      return;
    }
    setSlides([...slides, { id: null, title: '', subtitle: '', cta_text: '', cta_link: '', imageUrl: '', originalImageUrl: '', file: null }]);
  };

  const removeSlide = (index) => {
    const target = slides[index];
    if (target.id) {
      setDeletedItemIds([...deletedItemIds, target.id]);
      if (target.originalImageUrl) {
        const oldPath = target.originalImageUrl.split('/bannerit_assets/')[1];
        if (oldPath) setDeletedImagePaths(prev => [...prev, decodeURIComponent(oldPath)]);
      }
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentPreviewIndex >= newSlides.length) setCurrentPreviewIndex(Math.max(0, newSlides.length - 1));
  };

  const updateSlide = (index, field, value) => {
    const newSlides = [...slides];
    newSlides[index][field] = value;
    setSlides(newSlides);
  };

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        // 💡 UX 개선: alert 대신 toast 사용
        toast.error('이미지 용량은 1MB를 초과할 수 없습니다.');
        e.target.value = ''; return;
      }
      const newSlides = [...slides];
      newSlides[index].file = file;
      newSlides[index].imageUrl = URL.createObjectURL(file);
      setSlides(newSlides);
    }
  };

  const handleSave = async () => {
    if (slides.length === 0) {
      toast.error('최소 1개의 슬라이드를 등록해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const { data: campaignData, error: campaignError } = await supabase
        .from('bannerit_campaigns')
        .upsert({ mall_id: currentMallId, is_active: isActive }, { onConflict: 'mall_id' }).select().single();
      if (campaignError) throw campaignError;

      if (deletedItemIds.length > 0) {
        await supabase.from('bannerit_items').delete().in('id', deletedItemIds);
        setDeletedItemIds([]);
      }
      if (deletedImagePaths.length > 0) {
        await supabase.storage.from('bannerit_assets').remove(deletedImagePaths);
        setDeletedImagePaths([]);
      }

      for (let i = 0; i < slides.length; i++) {
        let currentSlide = slides[i];
        let finalImageUrl = currentSlide.imageUrl;

        if (currentSlide.file) {
          if (currentSlide.originalImageUrl) {
            const oldPath = currentSlide.originalImageUrl.split('/bannerit_assets/')[1];
            if (oldPath) await supabase.storage.from('bannerit_assets').remove([decodeURIComponent(oldPath)]);
          }
          const fileExt = currentSlide.file.name.split('.').pop();
          const fileName = `banners/${currentMallId}_slide${i}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('bannerit_assets').upload(fileName, currentSlide.file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('bannerit_assets').getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
        }

        const itemPayload = {
          campaign_id: campaignData.id,
          image_url: finalImageUrl,
          title: currentSlide.title,
          subtitle: currentSlide.subtitle,
          cta_text: currentSlide.cta_text,
          cta_link: currentSlide.cta_link,
          sort_order: i
        };
        if (currentSlide.id) itemPayload.id = currentSlide.id;
        await supabase.from('bannerit_items').upsert(itemPayload);
      }

      // 💡 UX/백엔드 결합 방어: 성공 메시지와 함께 엣지 캐시 타임 안내
      toast.success(
        <div>
          <b>성공적으로 라이브에 저장되었습니다! 🎉</b>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            ※ 서버 CDN 최적화 정책으로 인해 실제 쇼핑몰에는 약 1분 이내에 반영됩니다.
          </p>
        </div>,
        { duration: 4000 }
      );

      // 토스트 메시지를 사장님이 충분히 읽을 수 있도록 2초 대기 후 리로드
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      toast.error(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 로그인 컴포넌트 렌더링
  if (!currentMallId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '420px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <img src="/bannerit_logo.jpg" alt="BannerIt Logo" style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
            <h1 style={{ margin: '0', fontSize: '1.5rem', fontWeight: '800', color: '#111', letterSpacing: '-0.02em' }}>BANNERIT 관리자</h1>
          </div>
          <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem' }}>팝업을 설정할 쇼핑몰 아이디를 입력하세요.</p>
          <input type="text" placeholder="카페24 쇼핑몰 ID (예: myshop123)" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }} style={{ width: '100%', padding: '1rem', border: `1px solid ${loginError ? '#ef4444' : '#d1d5db'}`, borderRadius: '10px', marginBottom: '0.5rem', boxSizing: 'border-box', outline: 'none' }} />
          {loginError && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 1rem', textAlign: 'left', paddingLeft: '4px' }}>{loginError}</p>}
          <button onClick={handleLogin} disabled={isChecking} style={{ width: '100%', padding: '1rem', backgroundColor: isChecking ? '#6b7280' : '#111', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: isChecking ? 'not-allowed' : 'pointer', marginTop: loginError ? '0' : '1rem', transition: 'background-color 0.2s' }}>
            {isChecking ? '인증 중...' : '접속하기'}
          </button>
        </div>
      </div>
    );
  }

  const previewSlide = slides[currentPreviewIndex] || {};

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 💡 최상단에 Toaster 렌더링 컨테이너 추가 */}
      <Toaster position="top-center" reverseOrder={false} />

      <div style={{ flex: '1', padding: '2.5rem', borderRight: '1px solid #e5e7eb', backgroundColor: '#fff', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/bannerit_logo.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '10px', marginRight: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
              팝업 다중 설정
              <span style={{ fontSize: '1.1rem', color: '#6b7280', fontWeight: '500', marginLeft: '8px', marginRight: '12px' }}>({currentMallId})</span>
              {licensePlan === 'LIFETIME' && (
                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.02em', border: '1px solid #fde68a' }}>LIFETIME LICENSE</span>
              )}
            </h1>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ marginRight: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#111' }}>팝업 라이브 활성화</span>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }} />
          </label>
        </div>

        {slides.map((s, idx) => (
          <div key={idx} style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: '#111' }}>슬라이드 {idx + 1}</h3>
              {slides.length > 1 && (
                <button onClick={() => removeSlide(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>삭제</button>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>팝업 이미지 (1MB 이하)</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageChange(idx, e)} style={{ display: 'block', width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>메인 타이틀</label>
              <input type="text" value={s.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)} placeholder="예: 배너잇으로 배너를 쉽고 빠르게 교체하세요." style={{ width: '100%', padding: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>서브 설명글</label>
              <input type="text" value={s.subtitle} onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)} placeholder="예: 5만원 이상 구매시 무료 배송!" style={{ width: '100%', padding: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>버튼 텍스트</label>
              <input type="text" value={s.cta_text} onChange={(e) => updateSlide(idx, 'cta_text', e.target.value)} placeholder="예: 바로가기" style={{ width: '100%', padding: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>버튼 링크 (URL)</label>
              <input type="text" placeholder="/product/list.html?..." value={s.cta_link} onChange={(e) => updateSlide(idx, 'cta_link', e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }} />
            </div>
          </div>
        ))}

        {slides.length < 3 && (
          <button onClick={addEmptySlide} style={{ width: '100%', padding: '1rem', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: '700', borderRadius: '12px', cursor: 'pointer', border: '1px dashed #d1d5db', marginBottom: '2rem', transition: 'background-color 0.2s' }}>
            + 슬라이드 추가 ({slides.length}/3)
          </button>
        )}

        <button onClick={handleSave} disabled={isSaving} style={{ width: '100%', padding: '1.25rem', backgroundColor: isSaving ? '#6b7280' : '#111', color: '#fff', fontWeight: 'bold', fontSize: '1.05rem', borderRadius: '12px', cursor: isSaving ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'background-color 0.2s' }}>
          {isSaving ? '저장 및 배포 중...' : '저장 및 라이브 반영'}
        </button>
      </div>

      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', opacity: 0.85 }}>
          <img src="/bannerit_logo.jpg" alt="Preview Logo" style={{ width: '22px', height: '22px', borderRadius: '6px', marginRight: '10px' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#374151', letterSpacing: '0.05em' }}>BANNERIT LIVE PREVIEW</span>
        </div>

        <div style={{ width: '375px', height: '667px', backgroundColor: '#fff', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px', border: '8px solid #f3f4f6' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }}></div>
          <div style={{ position: 'relative', zIndex: 2, backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            {slides.length > 0 && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', zIndex: 10 }}>
                {currentPreviewIndex + 1} | {slides.length}
              </div>
            )}
            {previewSlide.imageUrl ? (
              <img src={previewSlide.imageUrl} alt="preview" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>이미지 영역</div>
            )}
            <div style={{ padding: '24px 20px 28px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: '800', color: '#111', letterSpacing: '-0.02em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'keep-all' }}>
                {previewSlide.title || '타이틀을 입력하세요'}
              </h2>
              {previewSlide.subtitle && (
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#666', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'keep-all' }}>
                  {previewSlide.subtitle}
                </p>
              )}
              {previewSlide.cta_text && (
                <div style={{ display: 'inline-block', marginTop: '4px', padding: '12px 24px', backgroundColor: '#111', color: '#fff', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700' }}>
                  {previewSlide.cta_text}
                </div>
              )}
            </div>
            {slides.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 20px' }}>
                <button disabled={currentPreviewIndex === 0} onClick={() => setCurrentPreviewIndex(prev => prev - 1)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: currentPreviewIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentPreviewIndex === 0 ? 0.2 : 1 }}>◀</button>
                <button disabled={currentPreviewIndex === slides.length - 1} onClick={() => setCurrentPreviewIndex(prev => prev + 1)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: currentPreviewIndex === slides.length - 1 ? 'not-allowed' : 'pointer', opacity: currentPreviewIndex === slides.length - 1 ? 0.2 : 1 }}>▶</button>
              </div>
            )}
            <div style={{ display: 'flex', borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', fontSize: '0.85rem', fontWeight: '500', color: '#6b7280', borderRight: '1px solid #f3f4f6', cursor: 'pointer' }}>오늘 하루 열지 않기</div>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', fontSize: '0.85rem', fontWeight: '500', color: '#6b7280', cursor: 'pointer' }}>닫기</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}