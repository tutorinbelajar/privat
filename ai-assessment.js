(() => {
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderList = (items) => Array.isArray(items) ? items.map(x => `<li>${escape(x)}</li>`).join('') : '';

  async function enrich() {
    const result = document.getElementById('result');
    if (!result || result.dataset.aiStarted) return;
    result.dataset.aiStarted = '1';

    const type = location.pathname.includes('assessment-method') ? 'method' : location.pathname.includes('assessment-need') ? 'need' : null;
    if (!type) return;

    const snapshot = result.innerText.trim();
    if (!snapshot) return;

    const box = document.createElement('section');
    box.className = 'panel ai-analysis';
    box.innerHTML = `<h3>Analisis Personal Tutorin</h3><p class="ai-status">Sedang membaca pola jawaban Anda untuk membuat analisis yang lebih personal…</p>`;
    result.insertBefore(box, result.firstElementChild || null);

    try {
      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ assessmentType: type, analysis: { result: snapshot.slice(0, 30000) } })
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.analysis) throw new Error(data.error || 'AI unavailable');
      const a = data.analysis;
      box.innerHTML = `
        <div class="ai-badge">✦ Analisis AI Tutorin</div>
        <h3>Yang paling terlihat dari kondisi anak</h3>
        <p>${escape(a.summary)}</p>
        <div class="ai-grid">
          <div><strong>Hal yang perlu diperhatikan</strong><ul>${renderList(a.key_observations)}</ul></div>
          <div><strong>Yang bisa dilakukan orang tua</strong><ul>${renderList(a.parent_guidance)}</ul></div>
          <div><strong>Yang perlu dilakukan tutor</strong><ul>${renderList(a.tutor_guidance)}</ul></div>
          <div><strong>Langkah berikutnya</strong><ul>${renderList(a.next_steps)}</ul></div>
        </div>
        <p class="ai-note">Analisis ini dibuat dari jawaban asesmen dan hasil pemetaan Tutorin. Ini bukan diagnosis dan tetap perlu divalidasi melalui proses belajar nyata.</p>`;
    } catch (error) {
      box.innerHTML = `<h3>Analisis Personal Tutorin</h3><p class="ai-status">Analisis personal AI belum dapat dimuat. Hasil asesmen utama tetap dapat digunakan seperti biasa.</p>`;
      console.warn('Tutorin AI assessment:', error?.message || error);
    }
  }

  const observer = new MutationObserver(() => {
    const result = document.getElementById('result');
    if (result && !result.classList.contains('hide')) enrich();
  });
  observer.observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['class']});
})();
