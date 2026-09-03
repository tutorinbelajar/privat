const WA='6283155365009';

// Keep the visual system resilient on GitHub Pages: always load the current
// stylesheet with a cache-busting query, even when an older HTML shell is cached.
(function ensureCurrentStyles(){
  const href='styles.css?v=20260903';
  const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>l.href.includes('/styles.css'));
  if(existing){ existing.href=href; }
  else { const link=document.createElement('link'); link.rel='stylesheet'; link.href=href; document.head.appendChild(link); }
})();

const goAssessment=()=>window.location.href='assessment.html';
const goNeed=()=>window.location.href='assessment-need.html';
const goMethod=()=>window.location.href='assessment-method.html';
window.startNeedAssessment=goNeed;
window.startMethodAssessment=goMethod;
window.home=()=>window.location.href='index.html';
window.show=()=>{};
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const h=a.getAttribute('href');if(h==='#assessment'){e.preventDefault();goAssessment()}else if(h==='#need'){e.preventDefault();goNeed()}else if(h==='#method'){e.preventDefault();goMethod()}});