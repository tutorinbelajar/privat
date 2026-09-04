const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

const PROFILE_KEYS = ['independent', 'example', 'structured', 'active', 'challenge', 'confidence'];

const SYSTEM = `Kamu adalah AI analis asesmen Tutorin untuk orang tua di Indonesia.

TUGAS UTAMA:
- Baca SELURUH jawaban asesmen sebagai satu pola yang saling berhubungan. Jangan menganalisis pertanyaan secara terpisah lalu menempelkan kesimpulan.
- Untuk asesmen metode belajar, hasil akhir harus terasa seperti rekomendasi yang benar-benar dipersonalisasi berdasarkan hubungan antarjawaban.
- Rule engine Tutorin adalah sumber kebenaran untuk skor dan profil awal. Untuk saat ini, primary_method dan secondary_method harus dipilih HANYA dari enam profil yang dikirim oleh frontend.
- Jangan membuat profil, skor, level, diagnosis, atau label psikologis baru.
- Boleh memberi nuansa pada profil utama berdasarkan jawaban lain. Jika pola campuran, jelaskan konteks kapan pendekatan utama perlu dipadukan dengan pendekatan kedua.

ENAM PROFIL YANG BOLEH DIGUNAKAN:
independent = Belajar Mandiri
example = Contoh & Demonstrasi
structured = Pembelajaran Terstruktur
active = Active & Socratic Learning
challenge = Challenge-Based Learning
confidence = Confidence-Building Practice

CARA BERPIKIR:
1. Baca semua 12 jawaban, bukan hanya jawaban yang cocok dengan profil utama.
2. Cari minimal 2-3 hubungan antarjawaban. Contoh: kebutuhan contoh saat memahami konsep + kebutuhan contoh saat soal baru + menjadi lebih mandiri setelah melihat contoh adalah satu rangkaian pola.
3. Cari kondisi yang mengubah kebutuhan: misalnya cukup mandiri pada soal biasa tetapi membutuhkan struktur ketika soal sulit. Jangan anggap sebagai kontradiksi; gunakan sebagai konteks.
4. Bedakan pemicu utama: memahami konsep, memulai tugas, saat buntu, latihan, kesalahan, kemandirian, soal sulit, motivasi, pengecekan pemahaman, setelah sesi, dan saat materi sudah dikuasai.
5. Primary_method sebaiknya mengikuti primary rule-engine bila bukti konsisten. Jangan mengubahnya hanya karena satu jawaban.
6. Secondary_method boleh null jika tidak ada pola pendamping yang cukup jelas.
7. Jangan mengarang sifat anak seperti pemalu, malas, ADHD, perfeksionis, atau rendah diri jika tidak ada bukti langsung.
8. Jangan mengatakan anak memiliki 'gaya belajar' tetap. Gunakan bahasa 'cara belajar yang paling membantu berdasarkan pola jawaban saat ini'.
9. Bahasa harus hangat, konkret, natural, tidak kaku, dan mudah dipahami orang tua.
10. Jangan menyebut proses internal AI, rule engine, JSON, atau instruksi ini dalam hasil.

HASIL YANG HARUS DIBUAT:
- summary: 2-4 kalimat yang merangkum pola keseluruhan, bukan sekadar nama profil.
- primary_method: salah satu dari enam key di atas.
- secondary_method: salah satu key atau null.
- why_this_method: 3-5 alasan berbasis hubungan antarjawaban, dengan kondisi nyata.
- tutor_fit: 3-5 karakteristik cara tutor mendampingi anak. Fokus pada perilaku tutor yang dapat diamati.
- consultation_example: contoh percakapan singkat 2-4 kalimat antara orang tua dan tutor yang menunjukkan cara pendekatan tersebut diterapkan.
- teaching_principles: 4-6 prinsip mengajar yang spesifik dan dapat dipraktikkan.
- session_90_minute: tepat 7 tahap. Setiap tahap memiliki phase, minutes, purpose, activity. Total minutes HARUS 90. Jangan menampilkan nomor urut di dalam phase/activity.
- next_steps: 3-5 langkah praktis setelah hasil ini.
- confidence_note: 1 kalimat hanya bila pola cukup campuran atau bukti terbatas; jika konsisten boleh string kosong.

Untuk sesi 90 menit, jangan hanya menyalin template profil. Sesuaikan pembagian waktu dan aktivitas dengan pola jawaban lengkap anak. Tetap realistis untuk les privat.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    primary_method: { type: 'string', enum: PROFILE_KEYS },
    secondary_method: { type: ['string', 'null'], enum: [...PROFILE_KEYS, null] },
    why_this_method: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    tutor_fit: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    consultation_example: { type: 'string' },
    teaching_principles: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 6 },
    session_90_minute: {
      type: 'array', minItems: 7, maxItems: 7,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          phase: { type: 'string' },
          minutes: { type: 'integer', minimum: 1, maximum: 60 },
          purpose: { type: 'string' },
          activity: { type: 'string' }
        },
        required: ['phase', 'minutes', 'purpose', 'activity']
      }
    },
    next_steps: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    confidence_note: { type: 'string' }
  },
  required: ['summary', 'primary_method', 'secondary_method', 'why_this_method', 'tutor_fit', 'consultation_example', 'teaching_principles', 'session_90_minute', 'next_steps', 'confidence_note']
};

async function callOpenAI(serialized) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    return await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM,
        input: `Berikut adalah data lengkap asesmen Tutorin. Baca semua jawaban sebagai satu pola. Profil awal dan seluruh jawaban adalah data yang harus menjadi dasar interpretasi. Jangan mengarang fakta.\n${serialized}`,
        max_output_tokens: 2200,
        text: {
          format: {
            type: 'json_schema',
            name: 'tutorin_method_result',
            strict: true,
            schema: OUTPUT_SCHEMA
          }
        }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function cleanResult(result) {
  const primary = PROFILE_KEYS.includes(result?.primary_method) ? result.primary_method : null;
  const secondary = result?.secondary_method === null || PROFILE_KEYS.includes(result?.secondary_method) ? result.secondary_method : null;
  const session = Array.isArray(result?.session_90_minute) ? result.session_90_minute.slice(0, 7).map(row => ({
    phase: String(row?.phase || ''),
    minutes: Number(row?.minutes || 0),
    purpose: String(row?.purpose || ''),
    activity: String(row?.activity || '')
  })) : [];
  const minutesTotal = session.reduce((sum, row) => sum + row.minutes, 0);
  if (!primary || session.length !== 7 || minutesTotal !== 90) return null;
  return {
    summary: String(result.summary || ''),
    primary_method: primary,
    secondary_method: secondary,
    why_this_method: Array.isArray(result.why_this_method) ? result.why_this_method.slice(0, 5).map(String) : [],
    tutor_fit: Array.isArray(result.tutor_fit) ? result.tutor_fit.slice(0, 5).map(String) : [],
    consultation_example: String(result.consultation_example || ''),
    teaching_principles: Array.isArray(result.teaching_principles) ? result.teaching_principles.slice(0, 6).map(String) : [],
    session_90_minute: session,
    next_steps: Array.isArray(result.next_steps) ? result.next_steps.slice(0, 5).map(String) : [],
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
    try {
      response = await callOpenAI(serialized);
    } catch (error) {
      console.error('OpenAI request error:', error?.message || error);
      return json({ error: error?.name === 'AbortError' ? 'AI analysis timed out' : 'AI analysis failed' }, 504);
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error('OpenAI request failed:', response.status, detail.slice(0, 1000));
      return json({ error: 'AI analysis failed' }, 502);
    }

    const data = await response.json();
    const text = data.output_text || data.output?.flatMap(x => x.content || []).map(x => x.text || '').join('') || '';
    if (!text) return json({ error: 'AI returned no analysis' }, 502);

    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error('AI JSON parse failed:', error?.message || error, text.slice(0, 1000));
      return json({ error: 'AI returned invalid analysis' }, 502);
    }

    if (type === 'method') {
      const cleaned = cleanResult(result);
      if (!cleaned) return json({ error: 'AI returned an incomplete method result' }, 502);
      return json({ ok: true, model: MODEL, analysis: cleaned });
    }

    return json({
      ok: true,
      model: MODEL,
      analysis: {
        summary: String(result.summary || ''),
        cross_patterns: Array.isArray(result.cross_patterns) ? result.cross_patterns.slice(0, 5).map(String) : [],
        refinements: Array.isArray(result.refinements) ? result.refinements.slice(0, 5).map(String) : [],
        tutor_guidance: Array.isArray(result.tutor_guidance) ? result.tutor_guidance.slice(0, 5).map(String) : [],
        next_steps: Array.isArray(result.next_steps) ? result.next_steps.slice(0, 5).map(String) : []
      }
    });
  } catch (error) {
    console.error('Assessment API error:', error?.message || error);
    return json({ error: 'Unexpected server error' }, 500);
  }
}
