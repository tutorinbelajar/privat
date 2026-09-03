const WA='6283155365009';
const goAssessment=()=>window.location.href='assessment.html';
const goNeed=()=>window.location.href='assessment-need.html';
const goMethod=()=>window.location.href='assessment-method.html';
window.startNeedAssessment=goNeed;
window.startMethodAssessment=goMethod;
window.home=()=>window.location.href='index.html';
window.show=()=>{};
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const h=a.getAttribute('href');if(h==='#assessment'){e.preventDefault();goAssessment()}else if(h==='#need'){e.preventDefault();goNeed()}else if(h==='#method'){e.preventDefault();goMethod()}});