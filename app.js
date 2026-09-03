const WA='6283155365009';

// Ensure GitHub Pages never keeps an older stylesheet reference after deployment.
(function ensureCurrentStyles(){
  const href='styles.css?v=20260903';
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
