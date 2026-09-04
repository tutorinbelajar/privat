const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

const SYSTEM = `Kamu adalah mesin interpretasi asesmen Tutorin untuk orang tua di Indonesia.
Tugasmu bukan mendiagnosis anak. Kamu hanya menginterpretasikan pola jawaban asesmen yang sudah dihitung oleh rule engine Tutorin.
Jangan mengubah level, skor, profil utama, atau fakta yang diberikan. Jangan membuat fakta baru.
Buat analisis yang hangat, spesifik, mudah dipahami orang tua, dan tidak terdengar seperti template AI.
Fokus pada: apa yang paling terlihat dari pola jawaban, kemungkinan kebutuhan belajar, apa yang sebaiknya dilakukan tutor, dan langkah praktis orang tua.
Jika sinyal lemah atau konflik, katakan bahwa hasil adalah indikasi awal dan perlu divalidasi melalui sesi belajar nyata.
Jangan menggunakan istilah diagnosis, gangguan, atau label psikologis.
Kembalikan JSON valid dengan tepat field: summary, key_observations, parent_guidance, tutor_guidance, next_steps.
summary adalah 2-4 kalimat.
key_observations, parent_guidance, tutor_guidance, next_steps masing-masing berupa array 3-5 item.`;

export default async function handler(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!process.env.OPENAI_API_KEY) return json({ error: 'AI service is not configured' }, 503);

  try {
    const body = await request.json();
    const type = body?.assessmentType;
    const payload = body?.analysis;
    if (!['need', 'method'].includes(type) || !payload) return json({ error: 'Invalid assessment payload' }, 400);

    const serialized = JSON.stringify({ assessmentType: type, analysis: payload });
    if (serialized.length > 50000) return json({ error: 'Assessment payload too large' }, 413);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM,
        input: `Berikut data terstruktur dari rule engine Tutorin. Gunakan hanya data ini.\n${serialized}`,
        max_output_tokens: 900
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('OpenAI request failed:', response.status, detail.slice(0, 500));
      return json({ error: 'AI analysis failed' }, 502);
    }

    const data = await response.json();
    const text = data.output_text || data.output?.flatMap(x => x.content || []).map(x => x.text || '').join('') || '';
    if (!text) return json({ error: 'AI returned no analysis' }, 502);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: 'AI returned invalid analysis' }, 502);
      result = JSON.parse(match[0]);
    }

    return json({
      ok: true,
      model: MODEL,
      analysis: {
        summary: String(result.summary || ''),
        key_observations: Array.isArray(result.key_observations) ? result.key_observations.slice(0, 5).map(String) : [],
        parent_guidance: Array.isArray(result.parent_guidance) ? result.parent_guidance.slice(0, 5).map(String) : [],
        tutor_guidance: Array.isArray(result.tutor_guidance) ? result.tutor_guidance.slice(0, 5).map(String) : [],
        next_steps: Array.isArray(result.next_steps) ? result.next_steps.slice(0, 5).map(String) : []
      }
    });
  } catch (error) {
    console.error('Assessment API error:', error?.message || error);
    return json({ error: 'Unexpected server error' }, 500);
  }
}
