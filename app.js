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
