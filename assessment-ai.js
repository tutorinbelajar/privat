(() => {
  const ENDPOINT = '/api/assessment';
  const TIMEOUT_MS = 35000;
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;');
  const listHtml = (items) => Array.isArray(items) && items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
  const methodPage = () => location.pathname.split('/').pop() === 'assessment-method.html';

  const addStyles = () => {
    if (document.getElementById('tutorin-ai-style')) return;
    const style = document.createElement('style');
    style.id = 'tutorin-ai-style';
    style.textContent = `.ai-panel{margin-top:18px;padding:20px;border:1px solid var(--line,#dce9e2);border-radius:18px;background:linear-gradient(180deg,#fbfefc,#f4faf7)}.ai-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:#e5f4ec;color:var(--green-2,#005b38);font-size:11px;font-weight:800;letter-spacing:.04em}.ai-panel h2{margin:10px 0 8px;font-size:20px}.ai-panel h3{margin:18px 0 7px;font-size:14px}.ai-panel p{line-height:1.7;margin:0}.ai-panel ul{margin:7px 0 0;padding-left:20px}.ai-panel li{margin:6px 0;line-height:1.6}.ai-loading{color:#5d6f67;font-size:13px;margin-top:10px}.ai-panel .session-ai{display:grid;gap:10px;margin-top:10px}.ai-panel .session-ai-row{padding:14px;border:1px solid var(--line,#dce9e2);border-radius:14px;background:#fff}.ai-panel .session-ai-row strong{display:block;margin-bottom:4px}.ai-panel .session-ai-row .mins{font-size:11px;font-weight:800;color:var(--green-2,#005b38);margin-bottom:6px}.ai-panel .session-ai-row p{font-size:12px;margin:4px 0}.ai-error{color:#5d6f67;font-size:13px;margin-top:10px}.ai-retry{display:inline-block;margin-top:12px;padding:9px 14px;border:0;border-radius:10px;background:#006b45;color:#fff;font-weight:700;cursor:pointer}`;
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
    a.forEach((v,j)=>{const key=qs[j]?.[3]?.[Number(v)];if(key)scores[key]=(scores[key]||0)+1;});
    const ranked=Object.entries(scores).sort((x,y)=>y[1]-x[1]);
    const primary=ranked[0]?.[0] || 'structured';
    const secondary=ranked.find(([key,count])=>key!==primary&&count>=2)?.[0] || null;
    return {answers,scores,primary:primary?{key:primary,name:profiles[primary]?.name}:null,secondary:secondary?{key:secondary,name:profiles[secondary]?.name}:null,patternContext:{profileDescriptions:Object.fromEntries(Object.keys(profiles).map(k=>[k,{name:profiles[k].name,desc:profiles[k].desc,role:profiles[k].role}]))}};
  };

  const answer = (payload, index) => payload.answers[index]?.answer || '';
  const mapped = (payload, index) => payload.answers[index]?.mappedProfile;
  const count = (payload, key) => payload.scores[key] || 0;

  const buildRuleResult = (payload) => {
    const primary = payload.primary?.key || 'structured';
    const secondary = payload.secondary?.key || null;
    const name = profiles[primary]?.name || primary;
    const secondaryName = secondary ? profiles[secondary]?.name || secondary : '';
    const reasons=[];
    const fits=[];
    const next=[];

    const addPattern = (condition, text) => { if (condition && reasons.length < 5) reasons.push(text); };

    addPattern(count(payload,'structured') >= 3,
      `Di beberapa situasi sekaligus—${answer(payload,1).toLowerCase()}, ${answer(payload,2).toLowerCase()}, dan ${answer(payload,3).toLowerCase()}—anak lebih terbantu ketika alur belajarnya dibuat jelas. Ini menunjukkan kebutuhan terhadap struktur terutama saat harus memulai atau ketika menemui soal yang belum dikuasai.`);
    addPattern(count(payload,'example') >= 3,
      `Kebutuhan terhadap contoh muncul berulang, mulai dari memahami konsep sampai berlatih setelah melihat contoh. Karena itu contoh konkret paling tepat dipakai sebagai jembatan sebelum anak diminta mengerjakan variasi soal sendiri.`);
    addPattern(count(payload,'active') >= 3,
      `Pada beberapa titik anak lebih terbantu ketika terlibat aktif: menjelaskan cara berpikir, membahas kesalahan, atau mengecek pemahaman. Tutor sebaiknya tidak terlalu cepat memberi jawaban, tetapi memancing anak menjelaskan prosesnya.`);
    addPattern(count(payload,'challenge') >= 3,
      `Jawaban pada materi sulit dan tahap pengembangan menunjukkan bahwa tantangan dapat menjadi pendorong belajar. Tingkat soal perlu dinaikkan bertahap agar tantangan tetap produktif, bukan sekadar membuat anak buntu.`);
    addPattern(count(payload,'independent') >= 3,
      `Kemandirian terlihat cukup konsisten: anak terbantu ketika diberi tujuan atau petunjuk singkat lalu diberi ruang untuk mencoba sendiri. Peran tutor lebih efektif sebagai pemberi arah dan evaluator daripada terus mendampingi setiap langkah.`);
    addPattern(count(payload,'confidence') >= 2,
      `Ketika tingkat kesulitan naik, anak tampak membutuhkan pengalaman berhasil dalam langkah-langkah kecil. Karena itu kenaikan kesulitan sebaiknya bertahap dan disertai umpan balik yang spesifik.`);

    // Cross-answer rules: these are deliberately based on relationships, not single answers.
    if (mapped(payload,1)==='structured' && mapped(payload,2)==='structured' && mapped(payload,3)==='structured') {
      reasons.unshift('Ada pola yang kuat pada tiga situasi berurutan: menghadapi soal baru, saat buntu, dan ketika harus memulai. Ketiganya sama-sama mengarah pada kebutuhan akan langkah yang jelas, sehingga struktur bukan hanya membantu di awal sesi tetapi juga saat anak mengalami hambatan.');
    }
    if (mapped(payload,0)==='example' && mapped(payload,4)==='example') {
      reasons.unshift('Kebutuhan contoh muncul sejak memahami konsep dan kembali muncul saat berpindah ke latihan. Artinya contoh berfungsi sebagai jembatan pemahaman, bukan sekadar bantuan ketika anak kesulitan.');
    }
    if (mapped(payload,5)==='active' && mapped(payload,9)==='active' && mapped(payload,10)==='active') {
      reasons.unshift('Ada kesinambungan antara cara memperbaiki kesalahan, memastikan pemahaman, dan menutup sesi. Anak tampak lebih terbantu ketika proses berpikirnya dibicarakan kembali, bukan hanya ketika jawaban akhirnya dinilai benar atau salah.');
    }
    if (mapped(payload,7)==='challenge' && mapped(payload,11)==='challenge') {
      reasons.unshift('Respons terhadap soal sulit dan respons setelah materi dikuasai sama-sama mengarah pada tantangan. Ini menunjukkan bahwa setelah fondasi cukup, anak dapat berkembang melalui soal yang lebih menantang daripada sekadar menambah jumlah latihan.');
    }
    if (mapped(payload,6)==='independent' && mapped(payload,11)==='independent') {
      reasons.unshift('Kemandirian terlihat pada dua tahap berbeda: saat latihan tanpa tutor dan setelah materi mulai dikuasai. Jadi bantuan tutor sebaiknya berkurang seiring meningkatnya penguasaan, bukan dibuat tetap sepanjang sesi.');
    }

    while (reasons.length < 3) reasons.push(`Pola jawaban paling banyak mengarah pada ${name.toLowerCase()}, sehingga pendekatan ini menjadi titik awal yang paling konsisten untuk pendampingan anak saat ini.`);
    reasons.splice(5);

    if (primary==='structured') fits.push('Membuat tujuan dan urutan belajar terlihat sejak awal sesi.','Memecah soal sulit menjadi langkah kecil lalu mengurangi bantuan secara bertahap.','Mengecek pemahaman sebelum berpindah ke tahap berikutnya.');
    if (primary==='example') fits.push('Menunjukkan contoh yang relevan sebelum meminta anak mengerjakan variasi sendiri.','Menjelaskan alasan di balik setiap langkah contoh, bukan hanya menunjukkan jawaban.','Secara bertahap mengurangi contoh sampai anak mampu memilih strategi sendiri.');
    if (primary==='active') fits.push('Banyak menggunakan pertanyaan yang memancing anak menjelaskan cara berpikir.','Membahas kesalahan sebagai bahan menemukan strategi yang lebih baik.','Memberi ruang bagi anak untuk menjelaskan kembali sebelum tutor memberi koreksi.');
    if (primary==='challenge') fits.push('Memberi soal yang menantang tetapi masih berada dalam jangkauan kemampuan anak.','Mendorong beberapa strategi dan membahas mengapa satu strategi lebih efektif.','Menaikkan tingkat kesulitan berdasarkan penguasaan, bukan sekadar mengejar jumlah soal.');
    if (primary==='independent') fits.push('Memberi target yang jelas lalu memberi ruang untuk mencoba sendiri.','Menggunakan bantuan singkat atau petunjuk bertingkat ketika anak buntu.','Menjadikan tutor sebagai mentor dan evaluator, bukan sumber jawaban setiap saat.');
    if (primary==='confidence') fits.push('Memulai dari target yang realistis agar anak mengalami keberhasilan nyata.','Menaikkan kesulitan sedikit demi sedikit sambil memberi umpan balik spesifik.','Menghindari lompatan tingkat kesulitan yang membuat anak kehilangan momentum belajar.');

    if (secondary) next.push(`Padukan ${name} dengan ${secondaryName} ketika kondisi belajar berubah, terutama pada bagian yang terlihat dari jawaban asesmen.`);
    next.push('Uji pendekatan ini selama beberapa sesi dan catat bagian ketika anak paling cepat memahami atau paling sering membutuhkan bantuan.');
    next.push('Minta tutor menyesuaikan tingkat bantuan: lebih banyak di awal ketika diperlukan, lalu dikurangi ketika anak sudah mampu melanjutkan sendiri.');
    next.push('Evaluasi kembali setelah beberapa sesi karena hasil asesmen menggambarkan pola kebutuhan anak saat ini, bukan label permanen.');

    const consultation = primary==='structured'
      ? '“Anak saya lebih mudah belajar kalau tahu harus mulai dari mana. Tolong bantu susun langkahnya dulu, lalu secara bertahap kurangi bantuannya ketika dia sudah paham.”'
      : primary==='example'
      ? '“Anak saya biasanya lebih cepat paham setelah melihat contoh. Tolong tunjukkan satu contoh sambil menjelaskan alasannya, lalu arahkan dia mencoba soal berikutnya sendiri.”'
      : primary==='active'
      ? '“Saya ingin anak tidak hanya mendapat jawaban. Tolong lebih sering tanyakan cara berpikirnya dan minta dia menjelaskan kembali sebelum dibantu.”'
      : primary==='challenge'
      ? '“Kalau konsepnya sudah dikuasai, anak saya justru perlu tantangan. Tolong naikkan tingkat soalnya bertahap dan bahas strateginya setelah mencoba.”'
      : primary==='independent'
      ? '“Anak saya cukup bisa kalau sudah tahu targetnya. Tolong beri arahan singkat lalu beri ruang untuk dia mencoba sendiri, dan bantu hanya saat benar-benar buntu.”'
      : '“Anak saya lebih berkembang kalau mendapat keberhasilan kecil dulu. Tolong naikkan tingkat kesulitan secara bertahap supaya dia tetap tertantang tetapi tidak cepat menyerah.”';

    const session = primary==='structured'
      ? [['Pembukaan & target',10,'Menyepakati tujuan dan urutan belajar.','Tutor menjelaskan target sesi dan memetakan bagian yang perlu dibantu.'],['Bangun fondasi',10,'Memastikan konsep prasyarat siap digunakan.','Review singkat konsep inti yang berkaitan dengan target.'],['Contoh terpandu',15,'Menunjukkan pola penyelesaian yang dapat diikuti.','Tutor mengerjakan satu contoh sambil menjelaskan urutan berpikir.'],['Latihan bertahap',25,'Memindahkan tanggung jawab dari tutor ke anak.','Anak mengerjakan beberapa soal dari mudah ke menengah dengan bantuan yang makin sedikit.'],['Soal aplikasi',15,'Menguji apakah struktur tetap dapat digunakan pada soal baru.','Anak mengerjakan soal yang sedikit berbeda dan menjelaskan langkahnya.'],['Review & koreksi',10,'Menguatkan bagian yang masih keliru.','Bahas kesalahan utama dan minta anak memperbaiki langkahnya.'],['Target lanjutan',5,'Menentukan latihan setelah sesi.','Tetapkan latihan mandiri dan indikator yang harus dicapai.']]
      : primary==='example'
      ? [['Pembukaan & target',10,'Menentukan konsep yang perlu dikuasai.','Tetapkan target dan pilih contoh yang paling relevan.'],['Contoh pertama',15,'Membangun pemahaman melalui contoh konkret.','Tutor menunjukkan contoh sambil menjelaskan alasan tiap langkah.'],['Contoh kedua',10,'Memperjelas pola dengan variasi.','Bandingkan dua contoh dan soroti bagian yang tetap sama.'],['Latihan serupa',20,'Memindahkan pola dari contoh ke latihan.','Anak mengerjakan soal serupa dengan bantuan minimal.'],['Variasi soal',20,'Menguji apakah pola sudah dipahami, bukan dihafal.','Berikan soal dengan bentuk sedikit berbeda.'],['Review',10,'Memastikan anak memahami kapan strategi digunakan.','Anak menjelaskan kembali pola dan memperbaiki kesalahan.'],['Target mandiri',5,'Mendorong penerapan tanpa contoh.','Berikan latihan mandiri dengan checklist sederhana.']]
      : primary==='active'
      ? [['Pembukaan & target',10,'Membuat anak terlibat sejak awal.','Anak menyebutkan apa yang sudah dan belum dipahami.'],['Eksplorasi konsep',10,'Mengaktifkan penalaran sebelum penjelasan tutor.','Tutor menggunakan pertanyaan pemantik dan contoh singkat.'],['Latihan berpikir',15,'Melatih anak menjelaskan strategi.','Anak menyelesaikan soal sambil mengungkapkan alasan tiap langkah.'],['Diskusi kesalahan',20,'Mengubah kesalahan menjadi bahan belajar.','Tutor dan anak membedah satu-dua kesalahan dan mencari penyebabnya.'],['Soal aplikasi',15,'Menguji transfer pemahaman.','Anak memilih strategi untuk soal baru lalu menjelaskan pilihannya.'],['Teach-back',15,'Memastikan pemahaman benar-benar terbentuk.','Anak menjelaskan kembali konsep tanpa melihat catatan.'],['Target lanjutan',5,'Menjaga kebiasaan refleksi setelah sesi.','Catat satu strategi yang berhasil dan satu hal yang perlu dilatih.']]
      : primary==='challenge'
      ? [['Pembukaan & target',10,'Menentukan tantangan yang realistis.','Pilih target dan tingkat kesulitan berdasarkan penguasaan saat ini.'],['Pemanasan',10,'Menyiapkan konsep yang diperlukan.','Review singkat satu-dua konsep prasyarat.'],['Tantangan utama',20,'Memberi ruang eksplorasi strategi.','Anak mencoba soal menantang sebelum tutor memberi petunjuk.'],['Eksplorasi strategi',20,'Membandingkan cara penyelesaian.','Coba alternatif strategi dan bahas kelebihan masing-masing.'],['Tantangan lanjutan',15,'Menaikkan standar setelah fondasi cukup.','Berikan variasi yang lebih sulit tetapi masih terukur.'],['Review strategi',10,'Mengambil pelajaran dari proses.','Bahas kesalahan, keputusan strategi, dan cara memperbaikinya.'],['Target mandiri',5,'Melanjutkan tantangan setelah sesi.','Berikan satu masalah lanjutan yang dapat dicoba sendiri.']]
      : primary==='independent'
      ? [['Pembukaan & target',10,'Membuat tujuan belajar jelas.','Tetapkan target dan kriteria selesai bersama anak.'],['Petunjuk awal',10,'Memberi arah tanpa mengambil alih.','Tutor memberi kerangka atau satu petunjuk awal.'],['Kerja mandiri',20,'Memberi ruang anak membangun strategi.','Anak mengerjakan latihan sendiri dengan tutor mengamati.'],['Latihan mandiri',20,'Memperkuat kemandirian.','Anak mengerjakan variasi soal dan memilih strategi sendiri.'],['Soal aplikasi',15,'Menguji fleksibilitas strategi.','Berikan soal baru tanpa contoh langsung.'],['Review & feedback',10,'Membantu anak mengevaluasi pekerjaannya.','Tutor memberi umpan balik dan meminta anak menemukan perbaikannya.'],['Target berikutnya',5,'Menjaga progres setelah sesi.','Tetapkan target latihan berikutnya dan kapan bantuan tutor diperlukan.']]
      : [['Pembukaan & target',10,'Menetapkan target yang terasa realistis.','Pilih satu sasaran utama dan indikator keberhasilan.'],['Pemanasan',10,'Membangun momentum dari bagian yang sudah dikuasai.','Mulai dengan latihan yang memungkinkan keberhasilan cepat.'],['Latihan bertahap',15,'Menambah kesulitan sedikit demi sedikit.','Naikkan tingkat soal secara bertahap dengan feedback spesifik.'],['Latihan inti',25,'Membangun rasa mampu melalui kemajuan nyata.','Kerjakan soal inti dari mudah ke menengah dengan dukungan saat diperlukan.'],['Tantangan terukur',15,'Menguji kemampuan tanpa lompatan terlalu besar.','Berikan satu tantangan yang sedikit di atas level nyaman.'],['Review & penguatan',10,'Menegaskan kemajuan dan strategi yang berhasil.','Tinjau keberhasilan, kesalahan, dan perbaikan yang sudah dibuat.'],['Target lanjutan',5,'Menjaga momentum belajar.','Tetapkan latihan berikutnya dengan tingkat kesulitan yang sesuai.']];

    return {
      summary:`Berdasarkan pola 12 jawaban, anak paling banyak terbantu dengan ${name.toLowerCase()}. Polanya tidak hanya muncul pada satu situasi, tetapi terlihat pada beberapa tahap belajar sehingga pendekatan ini layak dijadikan titik awal cara tutor mendampingi anak.`,
      primary_method:primary,
      primary_method_name:name,
      secondary_method:secondary,
      secondary_method_name:secondaryName,
      why_this_method:reasons,
      tutor_fit:fits.slice(0,5),
      consultation_example:consultation,
      teaching_principles:fits.slice(0,5),
      session_90_minute:session.map(([phase,minutes,purpose,activity])=>({phase,minutes,purpose,activity})),
      next_steps:next.slice(0,5),
      confidence_note:count(payload,primary)>=4?'':'Pola jawaban cukup beragam, jadi pendekatan utama sebaiknya diuji dan disesuaikan berdasarkan respons anak selama beberapa sesi.'
    };
  };

  const renderMethodResult = (analysis) => {
    const result=document.getElementById('result'); if(!result||!analysis) return;
    result.dataset.aiRendered='1';
    result.innerHTML=`<section id="ai-method-result" class="panel"><span class="k">HASIL PEMETAAN CARA BELAJAR</span><h1>Cara belajar yang paling cocok: ${escapeHtml(analysis.primary_method_name || analysis.primary_method || '')}</h1><p class="result-lead">${escapeHtml(analysis.summary)}</p>${analysis.secondary_method_name ? `<p><strong>Pendekatan pendamping:</strong> ${escapeHtml(analysis.secondary_method_name)}</p>` : ''}${analysis.confidence_note ? `<p class="disclaimer">${escapeHtml(analysis.confidence_note)}</p>` : ''}<div class="panel"><h3>Mengapa pendekatan ini paling cocok?</h3>${listHtml(analysis.why_this_method)}</div><div class="panel"><h3>Tutor yang cocok</h3>${listHtml(analysis.tutor_fit)}</div><div class="parent-script"><strong>Contoh saat berkonsultasi dengan tutor</strong><p>${escapeHtml(analysis.consultation_example)}</p></div><div class="panel"><h3>Prinsip mengajar</h3>${listHtml(analysis.teaching_principles)}</div><div class="panel"><h3>Contoh sesi privat 90 menit</h3><div class="session-ai">${(analysis.session_90_minute||[]).map(row=>`<div class="session-ai-row"><strong>${escapeHtml(row.phase)}</strong><div class="mins">${escapeHtml(row.minutes)} menit</div><p><strong>Tujuan:</strong> ${escapeHtml(row.purpose)}</p><p><strong>Aktivitas:</strong> ${escapeHtml(row.activity)}</p></div>`).join('')}</div></div><div class="panel"><h3>Langkah berikutnya</h3>${listHtml(analysis.next_steps)}</div></section>`;
  };

  const renderNeedAI = (analysis) => {
    const result=document.getElementById('result'); if(!result||result.dataset.aiRendered==='1') return;
    result.dataset.aiRendered='1'; const panel=document.createElement('section'); panel.className='ai-panel';
    panel.innerHTML=`<span class="ai-badge">PENDALAMAN AI TUTORIN</span><h2>Kaitan jawaban yang paling terlihat</h2><p>${escapeHtml(analysis.summary)}</p><h3>Pola yang saling menguatkan</h3>${listHtml(analysis.cross_patterns)}<h3>Hal yang perlu diperhatikan</h3>${listHtml(analysis.refinements)}<h3>Implikasi untuk tutor</h3>${listHtml(analysis.tutor_guidance)}<h3>Langkah praktis</h3>${listHtml(analysis.next_steps)}`;
    result.appendChild(panel);
  };

  const runNeedAI = async (payload) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({assessmentType:'need',analysis:payload}),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data?.ok||!data?.analysis) throw new Error(data?.error||`HTTP ${response.status}`);
      return data.analysis;
    } finally { clearTimeout(timer); }
  };

  const requestForPage = async (force=false) => {
    const result=document.getElementById('result'); if(!result||result.classList.contains('hide')||(!force&&result.dataset.aiRequested==='1')) return;
    const path=location.pathname.split('/').pop(); const type=path==='assessment-need.html'?'need':path==='assessment-method.html'?'method':null; if(!type)return;
    result.dataset.aiRequested='1'; addStyles();

    if(type==='method') {
      const payload=getMethodAnalysis();
      if(!payload){result.dataset.aiRequested='';return;}
      result.innerHTML='<section class="panel ai-loading-host"><span class="ai-badge">HASIL PEMETAAN CARA BELAJAR</span><p class="ai-loading">Membaca pola 12 jawaban dan keterkaitannya…</p></section>';
      // Method assessment intentionally uses a deterministic rule base so the result remains available even when AI service is unavailable.
      const analysis=buildRuleResult(payload);
      renderMethodResult(analysis);
      return;
    }

    const payload=getNeedAnalysis(); if(!payload){result.dataset.aiRequested='';return;}
    const loading=document.createElement('section'); loading.className='ai-panel'; loading.innerHTML='<span class="ai-badge">PENDALAMAN AI TUTORIN</span><p class="ai-loading">Sedang membaca keterkaitan antarjawaban…</p>'; result.appendChild(loading);
    try { const ai=await runNeedAI(payload); result.querySelector('.ai-panel')?.remove(); renderNeedAI(ai); }
    catch(error) {
      console.warn('Tutorin AI analysis unavailable:',error?.message||error);
      const message=error?.message||''; const detail=message.includes('429')||message.toLowerCase().includes('quota')?'Layanan AI sedang mencapai batas penggunaan.':message.includes('503')?'Layanan AI belum terkonfigurasi di server.':message.toLowerCase().includes('timeout')?'Analisis AI membutuhkan waktu lebih lama dari batas tunggu.':'Pendalaman AI belum berhasil diproses.';
      if(loading){loading.innerHTML=`<span class="ai-badge">PENDALAMAN AI TUTORIN</span><p class="ai-error">${detail}</p>`;}
    }
  };

  const observe=()=>{
    const result=document.getElementById('result'); if(!result)return;
    const observer=new MutationObserver(()=>{ if(!methodPage()) requestForPage(); });
    observer.observe(result,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});
    requestForPage();
  };

  window.TutorinAssessmentAI={runAI:runNeedAI,ENDPOINT,requestForPage};
  window.addEventListener('tutorin:assessment-complete',()=>requestForPage(true));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();