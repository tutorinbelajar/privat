(() => {
  const WA = '6283155365009';
  const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');

  function addStyles(){
    if(document.getElementById('assessment-result-actions-style')) return;
    const s=document.createElement('style');
    s.id='assessment-result-actions-style';
    s.textContent=`.assessment-result-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:18px;border-top:1px solid var(--line,#dce9e2)}.assessment-result-actions button{appearance:none;border:0;border-radius:12px;padding:11px 16px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;transition:transform .15s ease,opacity .15s ease}.assessment-result-actions button:hover{transform:translateY(-1px);opacity:.94}.assessment-download{background:#005b38;color:#fff}.assessment-wa{background:#e5f4ec;color:#005b38;border:1px solid #c9e6d7!important}@media(max-width:600px){.assessment-result-actions{flex-direction:column}.assessment-result-actions button{width:100%}}`;
    document.head.appendChild(s);
  }

  function resultData(){
    const result=document.getElementById('ai-method-result');
    if(!result) return null;
    const title=result.querySelector('h1')?.textContent?.trim() || 'Hasil Pemetaan Cara Belajar';
    const text=result.innerText?.trim() || '';
    return {result,title,text};
  }

  function downloadResult(){
    const data=resultData(); if(!data) return;
    const date=new Intl.DateTimeFormat('id-ID',{dateStyle:'long'}).format(new Date());
    const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.title)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#17342a;line-height:1.7}h1{font-size:25px;line-height:1.3}h2,h3{margin-top:24px}p{margin:8px 0}ul{padding-left:22px}li{margin:7px 0}.meta{color:#61736c;font-size:13px;border-bottom:1px solid #dce9e2;padding-bottom:14px}.brand{font-weight:800;color:#005b38;font-size:20px;margin-bottom:20px}.note{margin-top:30px;padding:14px;background:#f4faf7;border-radius:12px;font-size:12px}</style></head><body><div class="brand">Tutorin</div><div class="meta">Hasil asesmen • ${esc(date)}</div><h1>${esc(data.title)}</h1><div>${data.result.innerHTML}</div><div class="note">Hasil ini menggambarkan pola kebutuhan belajar anak berdasarkan jawaban asesmen saat ini, bukan label permanen.</div></body></html>`;
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='hasil-asesmen-tutorin.html'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function consult(){
    const data=resultData(); if(!data) return;
    const method=data.title.replace(/^Cara belajar yang paling cocok:\s*/i,'').trim();
    const summary=data.result.querySelector('.result-lead')?.innerText?.trim() || '';
    const message=`Halo Tutorin, saya baru selesai asesmen cara belajar anak.\n\nHasil: ${method}\n${summary ? `Ringkasan: ${summary}\n` : ''}\nSaya ingin konsultasi mengenai pendekatan belajar dan tutor yang cocok untuk anak saya.`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  }

  function mount(){
    addStyles();
    const result=document.getElementById('ai-method-result');
    if(!result || result.querySelector('.assessment-result-actions')) return;
    const actions=document.createElement('div');
    actions.className='assessment-result-actions';
    actions.innerHTML='<button type="button" class="assessment-download">↓ Download hasil asesmen</button><button type="button" class="assessment-wa">Konsultasi via WhatsApp →</button>';
    actions.querySelector('.assessment-download').addEventListener('click',downloadResult);
    actions.querySelector('.assessment-wa').addEventListener('click',consult);
    result.appendChild(actions);
  }

  const observer=new MutationObserver(mount);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{mount(); observer.observe(document.body,{childList:true,subtree:true});},{once:true});
  else {mount(); observer.observe(document.body,{childList:true,subtree:true});}
})();