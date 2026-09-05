const WA='6283155365009';

// Bust the stylesheet cache after UI releases so GitHub Pages/mobile browsers get the latest CSS.
(function ensureCurrentStyles(){
  const href='styles.css?v=20260904';
  const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>l.href.includes('/styles.css'));
  if(existing && existing.getAttribute('href')!==href) existing.setAttribute('href',href);
  if(!existing){ const link=document.createElement('link'); link.rel='stylesheet'; link.href=href; document.head.appendChild(link); }
})();

const goAssessment=()=>window.location.href='assessment.html';
const goNeed=()=>window.location.href='assessment-need.html';
const goMethod=()=>window.location.href='assessment-method.html';
window.startNeedAssessment=goNeed;
window.startMethodAssessment=goMethod;
window.home=()=>window.location.href='index.html';
window.show=()=>{};

// Keep the main navigation focused: remove any legacy Tutorín AI link and rename Asesmen.
(function cleanMainNav(){
  const apply=()=>{
    document.querySelectorAll('.site-header nav a').forEach(link=>{
      const text=link.textContent.trim().toLowerCase();
      const href=(link.getAttribute('href')||'').toLowerCase();
      if(text.includes('tutorín ai') || text.includes('tutorin ai') || href.includes('tutorin-ai')) link.remove();
      else if(text==='asesmen' || text==='asesmen belajar') link.textContent='Analisa Belajar';
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();

// Mobile-friendly hamburger navigation. Desktop navigation stays unchanged.
(function setupMobileNav(){
  const apply=()=>{
    const header=document.querySelector('.site-header');
    const nav=header?.querySelector('nav');
    const inner=header?.querySelector('.header-inner');
    if(!header || !nav || !inner || inner.querySelector('.mobile-menu-toggle')) return;

    const style=document.createElement('style');
    style.textContent=`
      .mobile-menu-toggle{display:none;border:1px solid var(--line);background:#fff;color:var(--ink);width:44px;height:44px;border-radius:13px;align-items:center;justify-content:center;cursor:pointer;padding:0;position:relative;z-index:61}
      .mobile-menu-toggle span,.mobile-menu-toggle span:before,.mobile-menu-toggle span:after{display:block;width:19px;height:2px;background:currentColor;border-radius:4px;transition:transform .2s,opacity .2s}
      .mobile-menu-toggle span:before,.mobile-menu-toggle span:after{content:'';position:absolute}
      .mobile-menu-toggle span:before{transform:translateY(-6px)}
      .mobile-menu-toggle span:after{transform:translateY(6px)}
      .mobile-menu-toggle[aria-expanded="true"] span{background:transparent}
      .mobile-menu-toggle[aria-expanded="true"] span:before{transform:rotate(45deg)}
      .mobile-menu-toggle[aria-expanded="true"] span:after{transform:rotate(-45deg)}
      @media(max-width:720px){
        .header-inner{min-height:64px;position:relative}
        .mobile-menu-toggle{display:inline-flex;flex:none}
        .site-header nav{display:none;position:absolute;left:20px;right:20px;top:calc(100% + 8px);padding:10px;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 18px 40px rgba(0,70,42,.14);flex-direction:column;align-items:stretch;gap:3px}
        .site-header nav.mobile-open{display:flex}
        .site-header nav a{display:flex;align-items:center;min-height:46px;padding:10px 13px;font-size:14px;border-radius:12px}
        .site-header nav a:hover{background:var(--soft)}
        .site-header nav .nav-cta{justify-content:center;margin-top:4px;padding:12px 16px}
      }
    `;
    document.head.appendChild(style);

    const button=document.createElement('button');
    button.type='button';
    button.className='mobile-menu-toggle';
    button.setAttribute('aria-label','Buka menu navigasi');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span></span>';
    inner.appendChild(button);

    const close=()=>{
      nav.classList.remove('mobile-open');
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-label','Buka menu navigasi');
    };
    button.addEventListener('click',()=>{
      const open=nav.classList.toggle('mobile-open');
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Tutup menu navigasi':'Buka menu navigasi');
    });
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
    document.addEventListener('click',event=>{
      if(!header.contains(event.target)) close();
    });
    window.addEventListener('resize',()=>{if(window.innerWidth>720) close();});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();

// Add useful reference links to the homepage feature cards.
(function addFeatureReferenceLinks(){
  const apply=()=>{
    const panels=[...document.querySelectorAll('.features-grid .feature-panel')];
    if(!panels.length) return;

    const tutorPanel=panels.find(panel=>panel.querySelector('h3')?.textContent.trim().toLowerCase()==='tutor dipilih untuk kebutuhan anak');
    if(tutorPanel && !tutorPanel.querySelector('[data-feature-link="tutor-profile"]')){
      const link=document.createElement('a');
      link.className='arrow-link';
      link.dataset.featureLink='tutor-profile';
      link.href='https://docs.google.com/presentation/d/1V1NWDzgHvar4TKYSr8c1tVIL2-_Lk__1YVX3p4EgCzs/edit?usp=sharing';
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='Lihat profil pengajar Tutorin →';
      tutorPanel.appendChild(link);
    }

    const progressPanel=panels.find(panel=>panel.querySelector('h3')?.textContent.trim().toLowerCase()==='orang tua tetap tahu progres');
    if(progressPanel && !progressPanel.querySelector('[data-feature-link="learning-report"]')){
      const link=document.createElement('a');
      link.className='arrow-link';
      link.dataset.featureLink='learning-report';
      link.href='https://docs.google.com/presentation/d/1bEfFeAz_jaUy7g1zDavu5NYER0H_OgFDcTq7RfHPjNM/edit?usp=sharing';
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='Lihat contoh laporan belajar murid →';
      progressPanel.appendChild(link);
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();

// The final homepage CTA should offer one clear action: WhatsApp consultation.
(function simplifyFinalCta(){
  const apply=()=>{
    const heading=[...document.querySelectorAll('h1,h2,h3')].find(el=>el.textContent.trim().toLowerCase()==='belum yakin harus mulai dari mana?');
    if(!heading) return;
    const section=heading.closest('section') || heading.parentElement;
    if(!section) return;
    [...section.querySelectorAll('a,button')].forEach(el=>{
      if(el.textContent.trim().toLowerCase().startsWith('cek kebutuhan anak')) el.remove();
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
