(() => {
  const ENDPOINT = '/api/assessment';
  const runAI = async (assessmentType, analysis) => {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assessmentType, analysis })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.analysis) throw new Error(data?.error || 'AI analysis failed');
      return data.analysis;
    } catch (error) {
      console.warn('Tutorin AI analysis unavailable:', error?.message || error);
      return null;
    }
  };
  window.TutorinAssessmentAI = { runAI, ENDPOINT };
})();
