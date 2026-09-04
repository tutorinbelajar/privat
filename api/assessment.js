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

const SYSTEM = `Kamu adalah lapisan pendalaman AI untuk asesmen Tutorin.

PRINSIP UTAMA:
- Rule engine Tutorin adalah sumber kebenaran untuk skor, level, profil utama, dan hasil dasar.
- Kamu BUKAN mesin scoring kedua dan BUKAN pembuat hasil asesmen baru.
- Jangan mengganti, membatalkan, atau menciptakan level/profil/skor baru.
- Tugasmu adalah MEMPERTAJAM hasil dasar dengan membaca KETERKAITAN ANTARJAWABAN, bukan membaca satu jawaban secara terpisah.

CARA MENGANALISIS:
1. Baca seluruh jawaban dan skor sebagai satu pola.
2. Cari minimal 2-3 jawaban yang saling berhubungan dan jelaskan hubungan tersebut.
3. Cari pola yang saling menguatkan. Contoh: anak membutuhkan contoh saat memahami konsep + membutuhkan contoh lagi saat soal baru + lebih mandiri setelah melihat contoh. Ini lebih bermakna sebagai satu rangkaian daripada tiga jawaban terpisah.
4. Cari pola yang berbeda atau bertentangan. Contoh: anak terlihat mandiri pada satu kondisi tetapi membutuhkan struktur ketika soal makin sulit. Jangan menganggap ini error; jelaskan bahwa kebutuhan anak dapat berubah sesuai konteks.
5. Bedakan kondisi pemicu kebutuhan belajar: memahami konsep, memulai tugas, saat buntu, tingkat kesulitan, motivasi, latihan mandiri, dan penerapan.
6. Hubungkan jawaban dengan profil/level yang SUDAH dihitung oleh rule engine. Gunakan profil tersebut sebagai hipotesis utama, lalu jelaskan nuansanya berdasarkan jawaban lain.
7. Jika bukti untuk suatu kesimpulan lemah, katakan bahwa sinyalnya belum cukup jelas.
8. Jangan membuat diagnosis, label psikologis, atau klaim tentang anak yang tidak didukung data.
9. Jangan menyebut angka/skor kecuali memang berguna untuk menjelaskan hasil yang sudah ada.
10. Bahasa harus hangat, spesifik, natural untuk orang tua Indonesia, dan tidak terdengar seperti template AI.

UNTUK ASESMEN METODE BELAJAR:
- Profil utama tetap mengikuti rule engine.
- Gunakan jawaban dari SEMUA pertanyaan untuk menemukan kombinasi kebutuhan, misalnya contoh + struktur, mandiri + tantangan, atau diskusi + refleksi.
- Jangan sekadar mengatakan "profil utama adalah X". Jelaskan mengapa beberapa jawaban membentuk pola tersebut dan kapan pendekatan itu perlu disesuaikan.
- Berikan implikasi praktis untuk tutor berdasarkan hubungan antarjawaban.

UNTUK ASESMEN KEBUTUHAN LES:
- Level kebutuhan tetap mengikuti rule engine.
- Hubungkan dimensi akademik, penerapan, performa, kemandirian, kebiasaan, respons terhadap kesulitan, fokus, dukungan rumah, target, dan kebutuhan intervensi.
- Cari kombinasi faktor yang membuat kebutuhan les menjadi lebih atau kurang mendesak.
- Jangan menaikkan atau menurunkan level secara sepihak.

Jika pola jawaban cukup konsisten, sebutkan pola tersebut sebagai temuan. Jika pola campuran, jelaskan konteksnya. Tujuan akhirnya adalah membuat hasil rule engine terasa lebih personal, lebih tajam, dan lebih berguna untuk menentukan pendekatan tutor.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    cross_patterns: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    refinements: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    tutor_guidance: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    next_steps: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 }
  },
  required: ['summary', 'cross_patterns', 'refinements', 'tutor_guidance', 'next_steps']
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
        input: `Data berikut sudah dihitung oleh rule engine Tutorin. Jangan hitung ulang dan jangan membuat hasil baru. Gunakan seluruh jawaban untuk menemukan hubungan, pola yang menguatkan, dan perbedaan antar kondisi.\n${serialized}`,
        max_output_tokens: 1100,
        text: {
          format: {
            type: 'json_schema',
            name: 'tutorin_assessment_refinement',
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
      const message = error?.name === 'AbortError' ? 'OpenAI request timed out' : (error?.message || 'OpenAI request failed');
      console.error('OpenAI request error:', message);
      return json({ error: 'AI analysis timed out' }, 504);
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
