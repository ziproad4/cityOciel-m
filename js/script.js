/**
 * 두산위브 더센트럴 도화 - 통합 스크립트
 * 1. 네비게이션 활성화
 * 2. 메인페이지 평면도 탭
 * 3. 모바일 드로어(메뉴) 제어
 * 4. 방문예약 폼 (Flatpickr) 및 전송 로직
 * 5. 서브페이지 안내 탭 (화면 튐 방지 적용)
 * 6. 섹션 스무스 스크롤 (헤더 오프셋 반영)
 */

// 3. 모바일 메뉴(Drawer) 제어
(function(){
  const btn = document.querySelector('.menu-btn');
  const drawer = document.getElementById('site-drawer');
  if(!btn || !drawer) return;

  const open = () => {
    drawer.classList.add('is-open');
    document.body.classList.add('drawer-open');
    btn.setAttribute('aria-expanded','true');
    const first = drawer.querySelector('.drawer-link');
    first && first.focus();
  };
  const close = () => {
    drawer.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    btn.setAttribute('aria-expanded','false');
    btn.focus();
  };

  btn.addEventListener('click', open);
  drawer.addEventListener('click', (e)=>{
    if(e.target.matches('[data-drawer-close], .drawer-backdrop')) close();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });
})();

// 폼
// ---------------------------
// const MODE        = "full";
const SITE_NAME   = "시티오씨엘";
const API_BASE    = "https://solapi-backend.onrender.com";
const ADMIN_PHONE = "01075602322";

document.addEventListener('DOMContentLoaded', function () {
  flatpickr('#visit-date', { locale: 'ko', dateFormat:'Y-m-d', defaultDate:new Date(), disableMobile:true });

  const timeWrap   = document.querySelector('.time-wrap');
  const dispInput  = document.getElementById('visit-time-display');
  const hiddenTime = document.getElementById('visit-time');
  const dd         = document.getElementById('time-dropdown');

  const hideDD = ()=>{ dd.classList.remove('open'); dispInput.setAttribute('aria-expanded','false'); };

  dispInput.addEventListener('click', e=>{ e.stopPropagation(); dd.classList.toggle('open'); });
  dd.addEventListener('click', e=>{
    const btn=e.target.closest('.slot'); if(!btn) return;
    dd.querySelectorAll('.slot').forEach(s=>s.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected','true');
    dispInput.value  = btn.textContent.trim();
    hiddenTime.value = btn.dataset.value;
    hideDD();
  });
  document.addEventListener('click', e=>{ if(timeWrap && !timeWrap.contains(e.target)) hideDD(); });

  const form      = document.getElementById('reservation');
  const submitBtn = document.getElementById('submitBtn');
  const checkbox  = document.querySelector('.form-contents-privacy-checkbox');
  const dateInput = document.getElementById('visit-date');

  const normalizePhone = v => (v||'').replace(/[^\d]/g,'');
  const sleep = ms => new Promise(r=>setTimeout(r,ms));

  if(checkbox && submitBtn){
    checkbox.addEventListener('change', ()=> { submitBtn.disabled = !checkbox.checked; });
  }

  if(form){
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if(!checkbox || !checkbox.checked){ alert('개인정보 수집 및 이용에 동의해야 합니다.'); return; }

      const name    = form.elements.name.value.trim();
      const phone   = normalizePhone(form.elements.phone.value);
      const vd      = dateInput.value.trim();
      const vt      = hiddenTime.value.trim();
      const vtLabel = (dispInput.value||'').trim();

      if(!name){ alert('성함을 입력해 주세요.'); return; }
      if(!(phone.length===10 || phone.length===11)){ alert('연락처를 정확히 입력해 주세요.'); return; }
      if(!vd){ alert('방문일을 선택해 주세요.'); return; }
      if(!vt){ alert('방문 시간을 선택해 주세요.'); return; }

      const payload = { site:SITE_NAME, vd, vtLabel, name, phone, adminPhone:ADMIN_PHONE, memo:'' };

      submitBtn.disabled = true;
      const prev = submitBtn.textContent;
      submitBtn.textContent = '전송 중…';

      try {
        const res = await fetch(`${API_BASE}/sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const txt = await res.text();
        let data = null;
        try { data = JSON.parse(txt); } catch {}

        if (!res.ok) throw new Error(`HTTP ${res.status} / ${txt.slice(0,200)}`);
        if (data && data.ok === false) throw new Error(data.error || JSON.stringify(data).slice(0,200));
        if (!data) console.warn('서버 원문 응답(비JSON):', txt);

        await sleep(200);
        alert(`${name}님, 방문예약 요청이 전송되었습니다!`);
        form.reset();
        hiddenTime.value='';
        dispInput.value='';
      } catch(err){
        alert(`전송 실패: ${String(err.message)}`);
        console.error(err);
      } finally {
        submitBtn.textContent = prev;
        submitBtn.disabled = !checkbox.checked;
      }
    });
  }

  fetch(`${API_BASE}/version`)
    .then(r=>r.json())
    .then(v=>console.log('FROM(ENV_SENDER)=', v.from_admin))
    .catch(()=>{});
});

// 5. 서브 페이지 안내 탭 스위칭 (화면 튐 해결 버전)
document.addEventListener('DOMContentLoaded', () => {
  const tabs   = document.querySelectorAll('.subtab');
  const panels = document.querySelectorAll('.subtab-panel');
  if (!tabs.length || !panels.length) return;

  const activate = (name) => {
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
    panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
  };

  // 초기 탭 설정
  const initial = location.hash ? location.hash.replace('#','') : tabs[0].dataset.tab;
  activate(initial);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      
      // 탭 변경 시 스크롤 위치 보존 (중요: -1px 이동 코드를 삭제함)
      const currentScrollY = window.scrollY;
      
      activate(name);
      history.replaceState(null, '', `#${name}`);
      
      // 즉시 스크롤 위치를 다시 잡아서 튐 현상 방지
      window.scrollTo(0, currentScrollY);
    });
  });
});

// 6. 섹션 스무스 스크롤 (index.html 전용)
(function () {
  const TARGET_ID = 'section11';

  const getHeaderH = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
    return parseInt(v || '96', 10) + 8; // 헤더 높이 + 여유공간 8px
  };

  const smoothToTarget = () => {
    const el = document.getElementById(TARGET_ID);
    if (!el) return;

    const offset = getHeaderH();
    requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
      
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto'; // 순간이동 방지 및 제어
      
      history.replaceState(null, '', '#' + TARGET_ID);
      
      requestAnimationFrame(() => {
        root.style.scrollBehavior = prev || '';
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  };

  const shouldScroll = () => location.hash === '#' + TARGET_ID;

  window.addEventListener('DOMContentLoaded', () => { if (shouldScroll()) smoothToTarget(); });
  window.addEventListener('load', () => { if (shouldScroll()) smoothToTarget(); });
  window.addEventListener('pageshow', (e) => { if (shouldScroll()) smoothToTarget(); });
})();

// 팝업창 ------------------------------------------------------------------
/* 3. 팝업 자바스크립트 로직 */
  (function() {
      const STORAGE_KEY = 'main_popup_hide_until';
      const overlay = document.getElementById('mainPopupOverlay');
      const btnHide = document.getElementById('btnTodayHide');
      const btnClose = document.getElementById('btnPopupClose');

      // 팝업 닫기
      function closePopup() {
          overlay.style.display = 'none';
          document.body.classList.remove('popup-open');
      }

      // 초기 실행: 노출 여부 확인
      function initPopup() {
          const hideUntil = localStorage.getItem(STORAGE_KEY);
          const now = Date.now();

          // 저장된 시간이 없거나, 설정 시간이 지났을 때만 보여줌
          if (!hideUntil || now > parseInt(hideUntil)) {
              overlay.style.display = 'flex';
              document.body.classList.add('popup-open');
          }
      }

      // 오늘 하루 보지 않기 클릭
      btnHide.addEventListener('click', function() {
          const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24시간 후 타임스탬프
          localStorage.setItem(STORAGE_KEY, expiry);
          closePopup();
      });

      // 닫기 클릭
      btnClose.addEventListener('click', closePopup);

      // 페이지 로드 후 실행
      document.addEventListener('DOMContentLoaded', initPopup);
  })();
// -------------------------------------------------------------------------