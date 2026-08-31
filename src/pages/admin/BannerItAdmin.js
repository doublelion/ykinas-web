import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BannerItAdmin() {
  // 🚨 [보안 패치 1] URL 파라미터를 무조건 신뢰하지 않고, 세션 스토리지의 인증 기록을 최우선으로 확인합니다.
  const [currentMallId, setCurrentMallId] = useState(() => {
    return sessionStorage.getItem('BANNERIT_SECURE_SESSION') || null;
  });

  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [licensePlan, setLicensePlan] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [slides, setSlides] = useState([]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [deletedImagePaths, setDeletedImagePaths] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // 🚨 [보안 패치 2] 악의적인 URL 파라미터 강제 클린업
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('mall_id')) {
      // URL에 mall_id가 남아있다면 흔적을 지워버립니다.
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const performLogin = async (targetMallId, targetPassword = '') => {
    if (!targetMallId) return;
    if (supabaseUrl.includes('placeholder')) {
      setLoginError('시스템 환경 변수가 세팅되지 않았습니다.');
      return;
    }
    setIsChecking(true);
    setLoginError('');

    try {
      const { data: status, error } = await supabase.rpc('verify_admin_login_v2', {
        p_mall_id: targetMallId,
        p_password: targetPassword
      });
      if (error) throw error;

      if (status === 'NEED_SETUP') {
        setIsFirstSetup(true);
        setLoginInput(targetMallId); // 온보딩을 위해 세팅
        toast('신규 등록된 쇼핑몰입니다. 최초 비밀번호를 설정해주세요.', { icon: '👋' });
      } else if (status === 'SUCCESS') {
        // 🚨 [보안 패치 3] URL 리다이렉트 대신 세션 스토리지에 암호화 보관 후 상태 즉시 업데이트
        sessionStorage.setItem('BANNERIT_SECURE_SESSION', targetMallId);
        setCurrentMallId(targetMallId);
        toast.success('관리자 접속 성공!');
      } else {
        setLoginError('아이디 또는 비밀번호가 일치하지 않거나 서비스 권한이 없습니다.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('인증 서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogin = () => performLogin(loginInput.trim(), passwordInput.trim());
  const handleDemoLogin = () => performLogin('ecudemo388727', '');

  // 💡 [기능 추가] 안전한 로그아웃 처리
  const handleLogout = () => {
    sessionStorage.removeItem('BANNERIT_SECURE_SESSION');
    setCurrentMallId(null);
    setLoginInput('');
    setPasswordInput('');
    toast.success('안전하게 로그아웃 되었습니다.');
  };

  const handleSetupPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      setLoginError('비밀번호를 4자리 이상 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLoginError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setIsChecking(true);
    try {
      const { data: success, error } = await supabase.rpc('set_admin_password', {
        p_mall_id: loginInput.trim(),
        p_new_password: newPassword.trim(),
        p_current_password: null
      });
      if (error || !success) throw new Error('비밀번호 등록 실패');

      toast.success('비밀번호가 성공적으로 설정되었습니다! 🎉');
      // 바로 로그인 처리
      sessionStorage.setItem('BANNERIT_SECURE_SESSION', loginInput.trim());
      setCurrentMallId(loginInput.trim());
      setIsFirstSetup(false);
    } catch (err) {
      setLoginError('비밀번호 설정 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!currentMallId) return;
    document.title = `BannerIt 관리자 | ${currentMallId}`;

    // 데이터 페칭 로직 (생략 없이 기존 로직 그대로 유지)
    async function loadExistingBanner() {
      try {
        const { data: campaign } = await supabase
          .from('bannerit_campaigns')
          .select('id, is_active, bannerit_items(id, image_url, title, subtitle, cta_text, cta_link, sort_order)')
          .eq('mall_id', currentMallId)
          .maybeSingle();

        const { data: licenseData } = await supabase.from('skin_licenses').select('plan_type').eq('mall_id', currentMallId).maybeSingle();
        if (licenseData && licenseData.plan_type) setLicensePlan(licenseData.plan_type);

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
          } else { addEmptySlide(); }
        } else { addEmptySlide(); }
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        toast.error('기존 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    }
    loadExistingBanner();
  }, [currentMallId]);

  const addEmptySlide = () => {
    if (slides.length >= 3) { toast.error('최대 3개까지만 등록할 수 있습니다.'); return; }
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
    if (newSlides.length === 0) {
      setSlides([{ id: null, title: '', subtitle: '', cta_text: '', cta_link: '', imageUrl: '', originalImageUrl: '', file: null }]);
      setCurrentPreviewIndex(0);
      toast.success('모든 내용이 초기화 되었습니다. 저장을 누르면 완전히 삭제됩니다.');
    } else {
      setSlides(newSlides);
      if (currentPreviewIndex >= newSlides.length) setCurrentPreviewIndex(Math.max(0, newSlides.length - 1));
    }
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

      const isCompletelyEmpty = slides.length === 1 && !slides[0].imageUrl && !slides[0].title;

      if (!isCompletelyEmpty) {
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
      }

      toast.success(
        <div>
          <b>성공적으로 라이브에 저장되었습니다! 🎉</b>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#6b7280' }}>※ 약 1분 내외로 쇼핑몰에 반영됩니다.</p>
        </div>, { duration: 4000 }
      );
      // 저장 후 새로고침 대신 데이터를 다시 불러오는 것이 UX상 좋지만, 우선 기존 로직 유지
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (error) {
      toast.error(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 로그인 및 온보딩 화면 렌더링
  // ==========================================
  if (!currentMallId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <Toaster position="top-center" reverseOrder={false} />
        <div style={{ background: '#fff', padding: '3.5rem 3rem', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '440px', textAlign: 'center', maxWidth: '90%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <img src="/bannerit_logo.jpg" alt="BannerIt Logo" style={{ width: '72px', height: '72px', borderRadius: '18px', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <h1 style={{ margin: '0', fontSize: '1.75rem', fontWeight: '800', color: '#111', letterSpacing: '-0.02em' }}>BANNER-IT 관리자</h1>
          </div>
          {!isFirstSetup ? (
            <>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '1.05rem', fontWeight: '500' }}>팝업을 설정할 쇼핑몰 정보를 입력하세요.</p>
              <input type="text" placeholder="카페24 쇼핑몰 ID" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', border: `1px solid ${loginError ? '#ef4444' : '#d1d5db'}`, borderRadius: '12px', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />
              <input type="password" placeholder="관리자 비밀번호" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }} style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', border: `1px solid ${loginError ? '#ef4444' : '#d1d5db'}`, borderRadius: '12px', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />

              {loginError && <p style={{ color: '#ef4444', fontSize: '0.95rem', margin: '0 0 1rem', textAlign: 'left', paddingLeft: '4px', fontWeight: '500' }}>{loginError}</p>}

              <button onClick={handleLogin} disabled={isChecking} style={{ width: '100%', padding: '1.1rem', backgroundColor: isChecking ? '#6b7280' : '#111', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.1rem', cursor: isChecking ? 'not-allowed' : 'pointer', marginTop: loginError ? '0' : '0.5rem' }}>{isChecking ? '인증 중...' : '접속하기'}</button>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed #e5e7eb' }}>
                <button onClick={handleDemoLogin} disabled={isChecking} style={{ width: '100%', padding: '1rem', backgroundColor: '#EFF6FF', color: '#3B82F6', border: '1px solid #DBEAFE', borderRadius: '12px', fontWeight: '800', fontSize: '1.05rem', cursor: isChecking ? 'not-allowed' : 'pointer' }}>👉 1초 만에 데모 계정으로 체험하기</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: '#2563eb', fontWeight: '800', marginBottom: '0.75rem', fontSize: '1.15rem' }}>🎉 신규 쇼핑몰 환영합니다!</p>
              <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.5' }}>앞으로 안전하게 사용할<br /><b style={{ color: '#111' }}>[{loginInput}]</b> 몰의 비밀번호를 생성해주세요.</p>

              <input type="password" placeholder="새 비밀번호 (4자리 이상)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', border: `1px solid ${loginError ? '#ef4444' : '#d1d5db'}`, borderRadius: '12px', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />
              <input type="password" placeholder="비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSetupPassword(); }} style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', border: `1px solid ${loginError ? '#ef4444' : '#d1d5db'}`, borderRadius: '12px', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />

              {loginError && <p style={{ color: '#ef4444', fontSize: '0.95rem', margin: '0 0 1rem', textAlign: 'left', paddingLeft: '4px', fontWeight: '500' }}>{loginError}</p>}

              {/* 💡 [추가된 UI] 비밀번호 찾기 안내 */}
              <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => toast('보안을 위해 비밀번호 초기화는 고객센터(채널톡)로 문의해주세요.', { icon: '💬' })}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              <button onClick={handleSetupPassword} disabled={isChecking} style={{ width: '100%', padding: '1.1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1.1rem', cursor: isChecking ? 'not-allowed' : 'pointer', marginTop: loginError ? '0' : '0.5rem' }}>{isChecking ? '설정 중...' : '비밀번호 등록 및 시작하기'}</button>
              <button onClick={() => { setIsFirstSetup(false); setLoginError(''); }} style={{ background: 'none', border: 'none', color: '#9ca3af', marginTop: '1.25rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>← 다시 로그인하기</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const previewSlide = slides[currentPreviewIndex] || {};

  return (
    <div className="bannerit-wrapper">
      <style>{`
        .bannerit-wrapper { display: flex; height: 100vh; background-color: #f9fafb; flex-direction: row; }
        .bannerit-settings-pane { flex: 1; padding: 2.5rem; border-right: 1px solid #e5e7eb; background-color: #fff; overflow-y: auto; }
        .bannerit-preview-pane { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #e5e7eb; padding: 2rem; }
        
        @media (max-width: 768px) {
          .bannerit-wrapper { flex-direction: column; height: auto; min-height: 100vh; }
          .bannerit-settings-pane { padding: 1.5rem; border-right: none; }
          .bannerit-preview-pane { display: none !important; }
        }
      `}</style>

      <Toaster position="top-center" reverseOrder={false} />

      <div className="bannerit-settings-pane">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/bannerit_logo.jpg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '10px', marginRight: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#111', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
              팝업 설정
              <span style={{ fontSize: '1.1rem', color: '#6b7280', fontWeight: '500', marginLeft: '10px', marginRight: '12px' }}>({currentMallId})</span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a href={`https://${currentMallId}.cafe24.com`} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem 1rem', backgroundColor: '#EFF6FF', color: '#3B82F6', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', textDecoration: 'none', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
              🚀 실제 쇼핑몰 확인
            </a>

            {/* 💡 [로그아웃 기능 추가] */}
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
              로그아웃
            </button>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ marginRight: '0.5rem', fontSize: '1rem', fontWeight: '700', color: '#111' }}>라이브 활성화</span>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: '1.35rem', height: '1.35rem', cursor: 'pointer' }} />
            </label>
          </div>
        </div>

        {slides.map((s, idx) => (
          <div key={idx} style={{ marginBottom: '2rem', padding: '1.75rem', backgroundColor: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111' }}>슬라이드 {idx + 1}</h3>
              <button onClick={() => removeSlide(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>삭제</button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '700', color: '#374151' }}>팝업 이미지 (1MB 이하)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#fff' }}>

                {s.imageUrl ? (
                  <img src={s.imageUrl} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#9ca3af', fontWeight: 'bold' }}>IMG</div>
                )}

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '1rem', color: s.file || s.originalImageUrl ? '#111' : '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                    {s.file ? s.file.name : (s.originalImageUrl ? '✨ 기존 등록 이미지 유지 중' : '이미지를 첨부해주세요')}
                  </p>
                </div>

                <label style={{ cursor: 'pointer', backgroundColor: '#111', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', flexShrink: 0, transition: 'background-color 0.2s' }}>
                  찾기
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(idx, e)} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '700', color: '#374151' }}>메인 타이틀</label>
              <input type="text" value={s.title} onChange={(e) => updateSlide(idx, 'title', e.target.value)} placeholder="예: 배너잇으로 배너를 쉽고 빠르게 교체하세요." style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '700', color: '#374151' }}>서브 설명글</label>
              <input type="text" value={s.subtitle} onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)} placeholder="예: 5만원 이상 구매시 무료 배송!" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '700', color: '#374151' }}>버튼 텍스트</label>
              <input type="text" value={s.cta_text} onChange={(e) => updateSlide(idx, 'cta_text', e.target.value)} placeholder="예: 바로가기" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '1rem', fontWeight: '700', color: '#374151' }}>버튼 링크 (URL)</label>
              <input type="text" placeholder="/product/list.html?..." value={s.cta_link} onChange={(e) => updateSlide(idx, 'cta_link', e.target.value)} style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }} />
            </div>
          </div>
        ))}

        {slides.length < 3 && (
          <button onClick={addEmptySlide} style={{ width: '100%', padding: '1.2rem', backgroundColor: '#f3f4f6', color: '#374151', fontSize: '1.05rem', fontWeight: '700', borderRadius: '12px', cursor: 'pointer', border: '1px dashed #d1d5db', marginBottom: '2rem' }}>
            + 슬라이드 추가 ({slides.length}/3)
          </button>
        )}

        <button onClick={handleSave} disabled={isSaving} style={{ width: '100%', padding: '1.35rem', backgroundColor: isSaving ? '#6b7280' : '#111', color: '#fff', fontWeight: '800', fontSize: '1.15rem', borderRadius: '14px', cursor: isSaving ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
          {isSaving ? '저장 및 배포 중...' : '저장 및 라이브 반영'}
        </button>
      </div>

      <div className="bannerit-preview-pane">
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