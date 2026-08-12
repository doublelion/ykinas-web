import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BannerItAdmin() {
  // ★ 향후 SaaS 확장을 위해 URL 파라미터나 로컬스토리지에서 mall_id를 동적으로 받도록 세팅 (현재는 폴백으로 테스트몰 유지)
  const urlParams = new URLSearchParams(window.location.search);
  const [currentMallId] = useState(urlParams.get('mall_id') || 'ecudemo388727');

  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [slides, setSlides] = useState([]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [deletedImagePaths, setDeletedImagePaths] = useState([]); // ★ 스토리지에서 삭제할 이미지 경로 추적

  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // 1. 기존 데이터 Fetching
  useEffect(() => {
    async function loadExistingBanner() {
      try {
        const { data: campaign } = await supabase
          .from('bannerit_campaigns')
          .select('id, is_active, bannerit_items(id, image_url, title, subtitle, cta_text, cta_link, sort_order)')
          .eq('mall_id', currentMallId)
          .maybeSingle();

        if (campaign) {
          setIsActive(campaign.is_active);
          if (campaign.bannerit_items && campaign.bannerit_items.length > 0) {
            const sortedItems = campaign.bannerit_items.sort((a, b) => a.sort_order - b.sort_order);
            const loadedSlides = sortedItems.map(item => ({
              id: item.id,
              title: item.title || '',
              subtitle: item.subtitle || '',
              cta_text: item.cta_text || '',
              cta_link: item.cta_link || '',
              imageUrl: item.image_url || '',
              originalImageUrl: item.image_url || '', // ★ 스토리지 교체를 위해 원본 주소 기억
              file: null
            }));
            setSlides(loadedSlides);
          } else {
            addEmptySlide();
          }
        } else {
          addEmptySlide();
        }
      } catch (err) {
        console.error('기존 데이터 로드 실패:', err);
      }
    }
    loadExistingBanner();
  }, [currentMallId]);

  const addEmptySlide = () => {
    if (slides.length >= 3) return alert('슬라이드는 최대 3개까지만 등록할 수 있습니다.');
    setSlides([...slides, { id: null, title: '', subtitle: '', cta_text: '', cta_link: '', imageUrl: '', originalImageUrl: '', file: null }]);
  };

  const removeSlide = (index) => {
    const target = slides[index];
    if (target.id) {
      setDeletedItemIds([...deletedItemIds, target.id]);
      // ★ 슬라이드 삭제 시 해당 슬라이드의 이미지도 스토리지 삭제 목록에 추가
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
        alert('이미지 용량은 1MB를 초과할 수 없습니다. 압축 후 다시 시도해주세요.');
        e.target.value = '';
        return;
      }
      const newSlides = [...slides];
      newSlides[index].file = file;
      newSlides[index].imageUrl = URL.createObjectURL(file);
      setSlides(newSlides);
    }
  };

  // 2. 가비지 컬렉션(GC) 로직이 포함된 최종 저장 트랜잭션
  const handleSave = async () => {
    if (slides.length === 0) return alert('최소 1개의 슬라이드를 등록해주세요.');

    try {
      setIsSaving(true);

      const { data: campaignData, error: campaignError } = await supabase
        .from('bannerit_campaigns')
        .upsert({ mall_id: currentMallId, is_active: isActive }, { onConflict: 'mall_id' })
        .select()
        .single();
      if (campaignError) throw campaignError;

      // [1] DB 아이템 삭제 처리
      if (deletedItemIds.length > 0) {
        await supabase.from('bannerit_items').delete().in('id', deletedItemIds);
        setDeletedItemIds([]);
      }

      // [2] 스토리지 가비지 컬렉션 (삭제된 슬라이드의 이미지 지우기)
      if (deletedImagePaths.length > 0) {
        await supabase.storage.from('bannerit_assets').remove(deletedImagePaths);
        setDeletedImagePaths([]);
      }

      for (let i = 0; i < slides.length; i++) {
        let currentSlide = slides[i];
        let finalImageUrl = currentSlide.imageUrl;

        // 신규 파일이 업로드 된 경우
        if (currentSlide.file) {
          // ★ 기존에 등록된 이미지가 있었다면 스토리지에서 완벽히 삭제 (이미지 교체 시나리오)
          if (currentSlide.originalImageUrl) {
            const oldPath = currentSlide.originalImageUrl.split('/bannerit_assets/')[1];
            if (oldPath) {
              await supabase.storage.from('bannerit_assets').remove([decodeURIComponent(oldPath)]);
            }
          }

          const fileExt = currentSlide.file.name.split('.').pop();
          const fileName = `banners/${currentMallId}_slide${i}_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('bannerit_assets')
            .upload(fileName, currentSlide.file, { upsert: true });

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

      alert('다중 슬라이드 팝업 설정이 성공적으로 저장 및 라이브 반영되었습니다!');
      window.location.reload();
    } catch (error) {
      console.error('Save Error:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const previewSlide = slides[currentPreviewIndex] || {};

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 폼 컨트롤 및 프리뷰 UI 렌더링 코드 (이전 단계와 100% 동일하므로 생략 없이 기존 코드 유지) */}
      <div style={{ flex: '1', padding: '2rem', borderRight: '1px solid #e5e7eb', backgroundColor: '#fff', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111' }}>팝업 다중 설정 (BannerIt)</h1>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ marginRight: '0.5rem', fontSize: '0.875rem', color: '#111' }}>팝업 활성화</span>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
          </label>
        </div>

        {slides.map((s, idx) => (
          <div key={idx} style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold' }}>슬라이드 {idx + 1}</h3>
              {slides.length > 1 && (
                <button onClick={() => removeSlide(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>삭제</button>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#111' }}>팝업 이미지 (1MB 이하)</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageChange(idx, e)} style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#111' }}>메인 타이틀</label>
              <input type="text" value={s.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#111' }}>버튼 텍스트</label>
              <input type="text" value={s.cta_text} onChange={(e) => updateSlide(idx, 'cta_text', e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#111' }}>버튼 링크 (URL)</label>
              <input type="text" placeholder="https://..." value={s.cta_link} onChange={(e) => updateSlide(idx, 'cta_link', e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
            </div>
          </div>
        ))}

        {slides.length < 3 && (
          <button onClick={addEmptySlide} style={{ width: '100%', padding: '1rem', backgroundColor: '#f3f4f6', color: '#111', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: '1px dashed #d1d5db', marginBottom: '2rem' }}>
            + 슬라이드 추가 ({slides.length}/3)
          </button>
        )}

        <button onClick={handleSave} disabled={isSaving} style={{ width: '100%', padding: '1rem', backgroundColor: isSaving ? '#6b7280' : '#111', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
          {isSaving ? '저장 및 배포 중...' : '저장 및 라이브 반영'}
        </button>
      </div>

      <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb', padding: '2rem' }}>
        <div style={{ width: '375px', height: '667px', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }}></div>
          <div style={{ position: 'relative', zIndex: 2, backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', width: '100%' }}>

            {slides.length > 0 && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10 }}>
                {currentPreviewIndex + 1} | {slides.length}
              </div>
            )}

            {previewSlide.imageUrl ? (
              <img src={previewSlide.imageUrl} alt="preview" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>이미지 영역</div>
            )}

            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>{previewSlide.title || '타이틀을 입력하세요'}</h2>
              {previewSlide.cta_text && (
                <div style={{ display: 'inline-block', marginTop: '10px', padding: '12px 24px', backgroundColor: '#111', color: '#fff', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600' }}>{previewSlide.cta_text}</div>
              )}
            </div>

            {slides.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 16px' }}>
                <button disabled={currentPreviewIndex === 0} onClick={() => setCurrentPreviewIndex(prev => prev - 1)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: currentPreviewIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentPreviewIndex === 0 ? 0.3 : 1 }}>◀</button>
                <button disabled={currentPreviewIndex === slides.length - 1} onClick={() => setCurrentPreviewIndex(prev => prev + 1)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: currentPreviewIndex === slides.length - 1 ? 'not-allowed' : 'pointer', opacity: currentPreviewIndex === slides.length - 1 ? 0.3 : 1 }}>▶</button>
              </div>
            )}

            <div style={{ display: 'flex', borderTop: '1px solid #eee', backgroundColor: '#fafafa' }}>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', fontSize: '0.85rem', color: '#555', borderRight: '1px solid #eee' }}>오늘 하루 열지 않기</div>
              <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', fontSize: '0.85rem', color: '#555' }}>닫기</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}