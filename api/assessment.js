const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const PROFILE_KEYS = ['independent', 'example', 'structured', 'active', 'challenge', 'confidence'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

const METHOD_SYSTEM = `Kamu adalah AI analis asesmen Tutorin untuk orang tua di Indonesia.
Baca SELURUH 12 jawaban sebagai satu pola yang saling berhubungan. Jangan menempelkan kesimpulan dari pertanyaan secara terpisah.
Cari minimal 2-3 hubungan antarjawaban dan kondisi yang mengubah kebutuhan anak. Bedakan kebutuhan saat memahami konsep, mendapat soal baru, buntu, memulai tugas, latihan, salah, belajar mandiri, soal sulit, motivasi, mengecek pemahaman, setelah sesi, dan saat materi dikuasai.
Rule engine hanya menjadi profil awal dan sumber data. Primary_method tetap harus salah satu dari enam profil yang diberikan. Secondary_method boleh kosong jika tidak ada pola pendamping yang cukup jelas.
Jangan membuat diagnosis, label psikologis, atau sifat yang tidak didukung jawaban. Jangan menyebut proses internal AI atau rule engine.
Bahasa harus hangat, konkret, natural, dan mudah dipahami orang tua.
Untuk sesi 90 menit, gunakan pola jawaban lengkap anak, bukan template profil. Tepat 7 tahap dan total 90 menit.`;

const NEED_SYSTEM = `Kamu adalah AI pendalaman asesmen kebutuhan les privat Tutorin untuk orang tua di Indonesia.
Baca SELURUH jawaban asesmen sebagai satu pola. Cari hubungan antarjawaban, kondisi yang saling menguatkan, hal yang perlu diperhatikan, implikasi untuk tutor, dan langkah praktis.
Jangan membuat diagnosis, label psikologis, atau fakta yang tidak ada pada jawaban. Bahasa harus hangat, konkret, natural, dan mudah dipahami orang tua.`;

const METHOD_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    primary_method: { type: 'string', enum: PROFILE_KEYS },
    secondary_method: { type: 'string', enum: [...PROFILE_KEYS, ''] },
    why_this_method: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
    tutor_fit: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
    consultation_example: { type: 'string' },
    teaching_principles: { type: 'array', minItems: 4, maxItems: 6, items: { type: 'string' } },
    session_90_minute: {
      type: 'array', minItems: 7, maxItems: 7,
      items: { type: 'object', additionalProperties: false, properties: {
        phase: { type: 'string' }, minutes: { type: 'integer', minimum: 1, maximum: 60 },
        purpose: { type: 'string' }, activity: { type: 'string' }
      }, required: ['phase', 'minutes', 'purpose', 'activity'] }
    },
    next_steps: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
    confidence_note: { type: 'string' }
  },
  required: ['summary', 'primary_method', 'secondary_method', 'why_this_method', 'tutor_fit', 'consultation_example', 'teaching_principles', 'session_90_minute', 'next_steps', 'confidence_note']
};

const NEED_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    cross_patterns: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
    refinements: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
    tutor_guidance: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
    next_steps: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } }
  },
  required: ['summary', 'cross_patterns', 'refinements', 'tutor_guidance', 'next_steps']
};

async function callOpenAI(type, serialized) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const schema = type === 'method' ? METHOD_SCHEMA : NEED_SCHEMA;
    const instructions = type === 'method' ? METHOD_SYSTEM : NEED_SYSTEM;
    return await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'X-Client-Request-Id': `tutorin-assessment-${crypto.randomUUID()}`
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input: `Data lengkap asesmen Tutorin. Baca semua jawaban sebagai satu pola. Jangan mengarang fakta.\n${serialized}`,
        max_output_tokens: 4000,
        text: { format: { type: 'json_schema', name: type === 'method' ? 'tutorin_method_result' : 'tutorin_need_result', strict: true, schema } }
      }),
      signal: controller.signal
    });
  } finally { clearTimeout(timeout); }
}

function normalizeSession(rows) {
  if (!Array.isArray(rows) || rows.length !== 7) return null;
  const cleaned = rows.map(row => ({ phase: String(row?.phase || ''), minutes: Math.max(1, Math.min(60, Math.round(Number(row?.minutes) || 0))), purpose: String(row?.purpose || ''), activity: String(row?.activity || '') }));
  let total = cleaned.reduce((sum, row) => sum + row.minutes, 0);
  if (!cleaned.every(row => row.phase && row.purpose && row.activity) || total <= 0) return null;
  if (total !== 90) {
    const factor = 90 / total;
    cleaned.forEach(row => { row.minutes = Math.max(1, Math.min(60, Math.round(row.minutes * factor))); });
    total = cleaned.reduce((sum, row) => sum + row.minutes, 0);
    cleaned[6].minutes = Math.max(1, Math.min(60, cleaned[6].minutes + (90 - total)));
    total = cleaned.reduce((sum, row) => sum + row.minutes, 0);
    if (total !== 90) return null;
  }
  return cleaned;
}

function cleanMethod(result) {
  if (!PROFILE_KEYS.includes(result?.primary_method)) return null;
  const session = normalizeSession(result.session_90_minute);
  if (!session) return null;
  return {
    summary: String(result.summary || ''), primary_method: result.primary_method,
    secondary_method: result.secondary_method && PROFILE_KEYS.includes(result.secondary_method) ? result.secondary_method : null,
    why_this_method: result.why_this_method.slice(0, 5).map(String),
    tutor_fit: result.tutor_fit.slice(0, 5).map(String),
    consultation_example: String(result.consultation_example || ''),
    teaching_principles: result.teaching_principles.slice(0, 6).map(String),
    session_90_minute: session,
    next_steps: result.next_steps.slice(0, 5).map(String),
    confidence_note: String(result.confidence_note || '')
  };
}

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

    let response;
    try { response = await callOpenAI(type, serialized); }
    catch (error) {
      console.error('OpenAI request error:', error?.message || error);
      return json({ error: error?.name === 'AbortError' ? 'AI analysis timed out' : 'AI analysis failed' }, 504);
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error('OpenAI request failed:', response.status, detail.slice(0, 1500));
      return json({ error: response.status === 401 ? 'AI authentication failed' : response.status === 429 ? 'AI rate limit or quota reached' : 'AI analysis failed' }, response.status === 401 ? 503 : response.status === 429 ? 429 : 502);
    }

    const data = await response.json();
    if (data.status && data.status !== 'completed') {
      console.error('OpenAI response incomplete:', data.status, data.incomplete_details || '');
      return json({ error: 'AI analysis incomplete' }, 502);
    }
    const text = data.output_text || data.output?.flatMap(x => x.content || []).map(x => x.text || '').join('') || '';
    if (!text) return json({ error: 'AI returned no analysis' }, 502);

    let result;
    try { result = JSON.parse(text); }
    catch (error) { console.error('AI JSON parse failed:', error?.message || error); return json({ error: 'AI returned invalid analysis' }, 502); }

    if (type === 'method') {
      const cleaned = cleanMethod(result);
      if (!cleaned) return json({ error: 'AI returned an incomplete method result' }, 502);
      return json({ ok: true, model: MODEL, analysis: cleaned });
    }

    return json({ ok: true, model: MODEL, analysis: {
      summary: String(result.summary || ''), cross_patterns: result.cross_patterns.slice(0, 5).map(String),
      refinements: result.refinements.slice(0, 5).map(String), tutor_guidance: result.tutor_guidance.slice(0, 5).map(String),
      next_steps: result.next_steps.slice(0, 5).map(String)
    }});
  } catch (error) {
    console.error('Assessment API error:', error?.message || error);
    return json({ error: 'Unexpected server error' }, 500);
  }
}