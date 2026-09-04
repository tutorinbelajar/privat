(() => {
  const page = location.pathname.split('/').pop();
  const type = page === 'assessment-method.html' ? 'method' : page === 'assessment-need.html' ? 'need' : null;
  if (!type) return;
  const KEY = `tutorin_assessment_${type}`;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const write = (status = 'in_progress') => {
    if (!Array.isArray(a)) return;
    try {
      const answerDetails = a.map((v, index) => ({
        question: qs[index]?.[0] || '',
        prompt: qs[index]?.[1] || '',
        answer: qs[index]?.[2]?.[Number(v)] || '',
        value: Number(v),
        mappedProfile: qs[index]?.[3]?.[Number(v)] || null
      }));
      localStorage.setItem(KEY, JSON.stringify({
        type,
        answers: a,
        answerDetails,
        currentIndex: i,
        status,
        savedAt: Date.now()
      }));
    } catch {}
  };
  const restore = () => {
    const data = read();
    if (!data || !Array.isArray(data.answers)) return;
    a.length = 0;
    data.answers.forEach(v => a.push(v));
    if (typeof data.currentIndex === 'number') i = Math.max(0, Math.min(data.currentIndex, qs.length - 1));
    if (typeof render === 'function') render();
    if (data.status === 'completed' && a.length === qs.length && a.every(v => v !== undefined)) {
      if (typeof result === 'function') {
        result();
        window.scrollTo({ top: 0, behavior: 'auto' });
        window.dispatchEvent(new Event('tutorin:assessment-complete'));
      }
    }
  };
  const reset = () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); };
  window.resetTutorinAssessment = reset;
  document.addEventListener('click', e => {
    if (e.target.closest('.opt')) setTimeout(() => write('in_progress'), 0);
    if (e.target.closest('#prev')) setTimeout(() => write('in_progress'), 0);
    if (e.target.closest('#next')) setTimeout(() => {
      const complete = Array.isArray(a) && a.length === qs.length && a.every(v => v !== undefined);
      write(complete ? 'completed' : 'in_progress');
    }, 0);
  });
  window.addEventListener('tutorin:assessment-complete', () => write('completed'));
  restore();
})();
