import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BannerItAdmin() {
  const [currentMallId] = useState('ecudemo388727');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [existingItemId, setExistingItemId] = useState(null);

  const [slide, setSlide] = useState({
    title: '무료배송 서비스',
    subtitle: '5만원 이상 구매시 무료 배송',
    cta_text: '바로가기',
    cta_link: '#none',
    imageUrl: ''
  });

  // 1. 초기 진입 시 기존 DB에 저장된 배너 데이터 로드
  useEffect(() => {
    async function loadExistingBanner() {
      try {
        const { data: campaign } = await supabase
          .from('bannerit_campaigns')
          .select('id, is_active, bannerit_items(id, image_url, title, subtitle, cta_text, cta_link)')
          .eq('mall_id', currentMallId)
          .maybeSingle();

        if (campaign) {
          setIsActive(campaign.is_active);
          const item = campaign.bannerit_items?.[0];
          if (item) {
            setExistingItemId(item.id);
            setSlide({
              title: item.title || '',
              subtitle: item.subtitle || '',
              cta_text: item.cta_text || '',
              cta_link: item.cta_link || '#none',
              imageUrl: item.image_url || ''
            });
          }
        }
      } catch (err) {
        console.error('기존 데이터 로드 실패:', err);
      }
    }
    loadExistingBanner();
  }, [currentMallId]);

  // 2. 이미지 파일 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setSlide((prev) => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
    }
  };

  // 3. 저장 및 라이브 반영
  const handleSave = async () => {
    try {
      setIsSaving(true);
      let finalImageUrl = slide.imageUrl;

      // 이미지 파일이 새롭게 선택된 경우 스토리지 업로드
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentMallId}_${Date.now()}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bannerit_assets')
          .upload(filePath, imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('bannerit_assets')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      // 캠페인 Upsert (mall_id 기준)
      const { data: campaignData, error: campaignError } = await supabase
        .from('bannerit_campaigns')
        .upsert({ mall_id: currentMallId, is_active: isActive }, { onConflict: 'mall_id' })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 아이템 Upsert 페이로드 구성을 위한 기존 데이터 체크
      const itemPayload = {
        campaign_id: campaignData.id,
        image_url: finalImageUrl, // 절대 빈 값이 들어가지 않도록 지정
        title: slide.title,
        subtitle: slide.subtitle,
        cta_text: slide.cta_text,
        cta_link: slide.cta_link,
        sort_order: 0
      };

      // 기존 아이템 PK가 있다면 UPDATE, 없으면 INSERT
      if (existingItemId) {
        itemPayload.id = existingItemId;
      }

      const { data: savedItem, error: itemError } = await supabase
        .from('bannerit_items')
        .upsert(itemPayload)
        .select()
        .single();

      if (itemError) throw itemError;

      if (savedItem) {
        setExistingItemId(savedItem.id);
        setSlide((prev) => ({ ...prev, imageUrl: savedItem.image_url }));
      }

      setImageFile(null); // 파일 인풋 초기화
      alert('배너잇 팝업 설정이 성공적으로 저장 및 라이브 반영되었습니다!');
    } catch (error) {
      console.error('Save Error:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 폼 컨트롤 패널 */}
      <div style={{ flex: '1', padding: '2rem', borderRight: '1px solid #e5e7eb', backgroundColor: '#fff', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111' }}>팝업 설정 (BannerIt)</h1>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ marginRight: '0.5rem', fontSize: '0.875rem', color: '#111' }}>팝업 활성화</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '1.25rem', height: '1.25rem' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>팝업 이미지 (1:1 비율)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>메인 타이틀</label>
          <input type="text" value={slide.title} onChange={(e) => setSlide({ ...slide, title: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>서브 타이틀</label>
          <input type="text" value={slide.subtitle} onChange={(e) => setSlide({ ...slide, subtitle: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{ width: '100%', padding: '1rem', backgroundColor: isSaving ? '#6b7280' : '#111', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: 'none' }}
        >
          {isSaving ? '저장 및 배포 중...' : '저장 및 라이브 반영'}
        </button>
      </div>

      {/* 모바일 프리뷰 */}
      <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb', padding: '2rem' }}>
        <div style={{ width: '375px', height: '667px', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }}></div>
          <div style={{ position: 'relative', zIndex: 2, backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', width: '100%' }}>
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="preview" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>이미지 영역</div>
            )}

            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>{slide.title || '타이틀'}</h2>
              <p style={{ margin: '0 0 16px', fontSize: '0.95rem', color: '#666' }}>{slide.subtitle}</p>
              {slide.cta_text && (
                <div style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#111', color: '#fff', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600' }}>{slide.cta_text}</div>
              )}
            </div>

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