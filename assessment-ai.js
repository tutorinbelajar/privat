(() => {
  const ENDPOINT = '/api/assessment';
  const TIMEOUT_MS = 30000;
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const listHtml = (items) => Array.isArray(items) && items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
  const methodPage = () => location.pathname.split('/').pop() === 'assessment-method.html';

  const runAI = async (assessmentType, analysis) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assessmentType, analysis }), signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.analysis) throw new Error(data?.error || `HTTP ${response.status}`);
      return data.analysis;
    } finally { clearTimeout(timer); }
  };

  const addStyles = () => {
    if (document.getElementById('tutorin-ai-style')) return;
    const style = document.createElement('style');
    style.id = 'tutorin-ai-style';
    style.textContent = `.ai-panel{margin-top:18px;padding:20px;border:1px solid var(--line,#dce9e2);border-radius:18px;background:linear-gradient(180deg,#fbfefc,#f4faf7)}.ai-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:#e5f4ec;color:var(--green-2,#005b38);font-size:11px;font-weight:800;letter-spacing:.04em}.ai-panel h2{margin:10px 0 8px;font-size:20px}.ai-panel h3{margin:18px 0 7px;font-size:14px}.ai-panel p{line-height:1.7;margin:0}.ai-panel ul{margin:7px 0 0;padding-left:20px}.ai-panel li{margin:6px 0;line-height:1.6}.ai-loading{color:#5d6f67;font-size:13px;margin-top:10px}.ai-panel .session-ai{display:grid;gap:10px;margin-top:10px}.ai-panel .session-ai-row{padding:14px;border:1px solid var(--line,#dce9e2);border-radius:14px;background:#fff}.ai-panel .session-ai-row strong{display:block;margin-bottom:4px}.ai-panel .session-ai-row .mins{font-size:11px;font-weight:800;color:var(--green-2,#005b38);margin-bottom:6px}.ai-panel .session-ai-row p{font-size:12px;margin:4px 0}.ai-error{color:#5d6f67;font-size:13px;margin-top:10px}`;
    document.head.appendChild(style);
  };

  const getNeedAnalysis = () => {
    if (!Array.isArray(window.a) && typeof a === 'undefined') return null;
    const answers = a.map((v,index) => ({ question: qs[index]?.[0], answer: qs[index]?.[2]?.[Number(v)] ?? null, value: Number(v) }));
    const D={academic:0,transfer:0,performance:0,independence:0,habit:0,difficulty:0,resilience:0,focus:0,homeSupport:0,target:0,intervention:0};
    a.forEach((v,j)=>{const weights=qs[j][3];Object.keys(weights).forEach(k=>D[k]+=weights[k]*Number(v));});
    const needIndex=D.academic+D.transfer+D.performance+D.independence+D.habit+D.difficulty+D.focus+D.homeSupport+D.target+D.intervention;
    const total=needIndex+(D.target>=6?2:0)+(D.homeSupport>=5?2:0)+(D.intervention>=6?2:0);
    const level=total<28?'LEVEL 1':total<45?'LEVEL 2':total<62?'LEVEL 3':'LEVEL 4';
    return {answers,scores:D,needIndex,total,level,headline:document.querySelector('#result h1')?.textContent||''};
  };

  const getMethodAnalysis = () => {
    if (!Array.isArray(window.a) && typeof a === 'undefined') return null;
    const scores={}; Object.keys(profiles).forEach(key=>scores[key]=0);
    const answers=a.map((v,index)=>({question:qs[index]?.[0],answer:qs[index]?.[2]?.[Number(v)]??null,value:Number(v),mappedProfile:qs[index]?.[3]?.[Number(v)]??null}));
    a.forEach((v,j)=>{const key=qs[j][3][Number(v)];if(key)scores[key]=(scores[key]||0)+1;});
    const ranked=Object.entries(scores).sort((x,y)=>y[1]-x[1]);
    const primary=ranked[0]?.[0], secondary=ranked[1]?.[0];
    return {answers,scores,primary:primary?{key:primary,name:profiles[primary]?.name}:null,secondary:secondary?{key:secondary,name:profiles[secondary]?.name}:null,patternContext:{profileDescriptions:Object.fromEntries(Object.keys(profiles).map(k=>[k,{name:profiles[k].name,desc:profiles[k].desc,role:profiles[k].role}]))}};
  };

  const hideStaticMethodResult = (result) => {
    if (!methodPage() || !result) return;
    result.querySelector('.result-score')?.remove();
    [...result.children].forEach(el => { if (el.id !== 'ai-method-result' && !el.classList.contains('ai-loading-host')) el.dataset.aiStatic='1'; });
  };

  const renderMethodResult = (analysis) => {
    const result=document.getElementById('result'); if(!result||!analysis) return;
    result.innerHTML=`<section id="ai-method-result" class="panel">
      <span class="k">HASIL PEMETAAN CARA BELAJAR</span>
      <h1>Cara belajar yang paling cocok: ${escapeHtml(analysis.primary_method_name || analysis.primary_method || '')}</h1>
      <p class="result-lead">${escapeHtml(analysis.summary)}</p>
      ${analysis.secondary_method_name ? `<p><strong>Pendekatan pendamping:</strong> ${escapeHtml(analysis.secondary_method_name)}</p>` : ''}
      ${analysis.confidence_note ? `<p class="disclaimer">${escapeHtml(analysis.confidence_note)}</p>` : ''}
      <div class="panel"><h3>Mengapa pendekatan ini paling cocok?</h3>${listHtml(analysis.why_this_method)}</div>
      <div class="panel"><h3>Tutor yang cocok</h3>${listHtml(analysis.tutor_fit)}</div>
      <div class="parent-script"><strong>Contoh saat berkonsultasi dengan tutor</strong><p>${escapeHtml(analysis.consultation_example)}</p></div>
      <div class="panel"><h3>Prinsip mengajar</h3>${listHtml(analysis.teaching_principles)}</div>
      <div class="panel"><h3>Contoh sesi privat 90 menit</h3><div class="session-ai">${(analysis.session_90_minute||[]).map(row=>`<div class="session-ai-row"><strong>${escapeHtml(row.phase)}</strong><div class="mins">${escapeHtml(row.minutes)} menit</div><p><strong>Tujuan:</strong> ${escapeHtml(row.purpose)}</p><p><strong>Aktivitas:</strong> ${escapeHtml(row.activity)}</p></div>`).join('')}</div></div>
      <div class="panel"><h3>Langkah berikutnya</h3>${listHtml(analysis.next_steps)}</div>
    </section>`;
  };

  const normalizeMethod = (ai, payload) => {
    const names={}; Object.keys(profiles).forEach(k=>names[k]=profiles[k].name);
    return {...ai,primary_method_name:names[ai.primary_method]||payload.primary?.name||'',secondary_method_name:ai.secondary_method?names[ai.secondary_method]:'',};
  };

  const renderNeedAI = (analysis) => {
    const result=document.getElementById('result'); if(!result||result.dataset.aiRendered==='1') return;
    result.dataset.aiRendered='1'; const panel=document.createElement('section'); panel.className='ai-panel';
    panel.innerHTML=`<span class="ai-badge">PENDALAMAN AI TUTORIN</span><h2>Kaitan jawaban yang paling terlihat</h2><p>${escapeHtml(analysis.summary)}</p><h3>Pola yang saling menguatkan</h3>${listHtml(analysis.cross_patterns)}<h3>Hal yang perlu diperhatikan</h3>${listHtml(analysis.refinements)}<h3>Implikasi untuk tutor</h3>${listHtml(analysis.tutor_guidance)}<h3>Langkah praktis</h3>${listHtml(analysis.next_steps)}`;
    result.appendChild(panel);
  };

  const requestForPage = async (force=false) => {
    const result=document.getElementById('result'); if(!result||result.classList.contains('hide')||(!force&&result.dataset.aiRequested==='1')) return;
    const path=location.pathname.split('/').pop(); const type=path==='assessment-need.html'?'need':path==='assessment-method.html'?'method':null; if(!type)return;
    result.dataset.aiRequested='1'; addStyles();
    if(methodPage()) { hideStaticMethodResult(result); result.innerHTML='<section class="panel ai-loading-host"><span class="ai-badge">HASIL PEMETAAN CARA BELAJAR</span><p class="ai-loading">Sedang membaca 12 jawaban dan keterkaitannya untuk menyusun rekomendasi yang lebih personal…</p></section>'; }
    else { const loading=document.createElement('section'); loading.className='ai-panel'; loading.innerHTML='<span class="ai-badge">PENDALAMAN AI TUTORIN</span><p class="ai-loading">Sedang membaca keterkaitan antarjawaban, bukan hanya satu pola…</p>'; result.appendChild(loading); }
    const payload=type==='need'?getNeedAnalysis():getMethodAnalysis(); if(!payload)return;
    try { const ai=await runAI(type,payload); if(methodPage()) renderMethodResult(normalizeMethod(ai,payload)); else { result.querySelector('.ai-panel')?.remove(); renderNeedAI(ai); } }
    catch(error) {
      console.warn('Tutorin AI analysis unavailable:',error?.message||error);
      if(methodPage()) { result.innerHTML=''; const fallback=document.createElement('div'); fallback.className='ai-panel'; fallback.innerHTML='<span class="ai-badge">HASIL ASESMEN</span><p class="ai-error">Hasil personalisasi AI belum tersedia. Silakan coba kembali beberapa saat lagi.</p>'; result.appendChild(fallback); }
      else { const loading=result.querySelector('.ai-panel'); if(loading) loading.innerHTML='<span class="ai-badge">PENDALAMAN AI TUTORIN</span><p class="ai-error">Pendalaman AI sedang tidak tersedia. Hasil asesmen utama tetap dapat digunakan.</p>'; }
    }
  };

  const observe=()=>{const result=document.getElementById('result');if(!result)return;const observer=new MutationObserver(()=>{if(!methodPage())requestForPage();});observer.observe(result,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});requestForPage();};
  window.addEventListener('tutorin:assessment-complete', () => requestForPage(true));
  window.TutorinAssessmentAI={runAI,ENDPOINT};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();