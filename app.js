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
