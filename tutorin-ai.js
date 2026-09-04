const messagesEl = document.getElementById('messages');
const welcomeCard = document.getElementById('welcomeCard');
const form = document.getElementById('chatForm');
const input = document.getElementById('promptInput');
const sendButton = document.getElementById('sendButton');
const imageInput = document.getElementById('imageInput');
const attachmentPreview = document.getElementById('attachmentPreview');
const conversation = [];
let busy = false;
let pendingImage = null;

function addMessage(role, text, extraClass = '') {
  const row = document.createElement('div');
  row.className = `message ${role} ${extraClass}`.trim();
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  input.disabled = value;
  if (imageInput) imageInput.disabled = value;
  sendButton.textContent = value ? '…' : '↑';
}

function readAssessment(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (!data || data.status !== 'completed') return null;
    return data;
  } catch {
    return null;
  }
}

function buildStudentContext() {
  const method = readAssessment('tutorin_assessment_method');
  const need = readAssessment('tutorin_assessment_need');
  if (!method && !need) return null;
  return {
    source: 'website_assessment',
    method: method ? {
      type: 'metode_belajar',
      answers: Array.isArray(method.answerDetails) ? method.answerDetails.slice(0, 20) : method.answers
    } : null,
    need: need ? {
      type: 'kebutuhan_belajar',
      answers: Array.isArray(need.answerDetails) ? need.answerDetails.slice(0, 20) : need.answers
    } : null
  };
}

function showAttachment(file) {
  if (!attachmentPreview) return;
  attachmentPreview.innerHTML = '';
  if (!file) return;
  const img = document.createElement('img');
  img.alt = 'Foto soal yang akan dikirim';
  img.src = URL.createObjectURL(file);
  const label = document.createElement('span');
  label.textContent = `${file.name} · siap dikirim`;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '×';
  remove.setAttribute('aria-label', 'Hapus foto');
  remove.onclick = () => {
    pendingImage = null;
    if (imageInput) imageInput.value = '';
    attachmentPreview.innerHTML = '';
  };
  attachmentPreview.append(img, label, remove);
}

async function resizeImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('File bukan gambar.');
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function sendMessage(text) {
  const prompt = String(text || '').trim();
  if ((!prompt && !pendingImage) || busy) return;
  if (welcomeCard) welcomeCard.remove();

  const imageForRequest = pendingImage;
  conversation.push({ role: 'user', content: prompt || 'Tolong baca dan bantu aku mengerjakan soal pada foto ini.' });
  addMessage('user', prompt || '📷 Aku mengirim foto soal. Tolong bantu aku memahaminya.');
  input.value = '';
  input.style.height = 'auto';
  pendingImage = null;
  if (imageInput) imageInput.value = '';
  if (attachmentPreview) attachmentPreview.innerHTML = '';
  setBusy(true);

  const typing = addMessage('assistant', 'Tutorín AI sedang membaca soal dan menyesuaikan cara membimbingmu…', 'typing');
  try {
    let imageDataUrl = null;
    if (imageForRequest) imageDataUrl = await resizeImage(imageForRequest);
    const response = await fetch('/api/tutorin-ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: conversation,
        studentContext: buildStudentContext(),
        imageDataUrl
      })
    });
    const data = await response.json().catch(() => ({}));
    typing.remove();
    if (!response.ok || !data.answer) {
      addMessage('assistant', data.error || 'Maaf, Tutorín AI belum bisa menjawab. Coba lagi sebentar.', 'error');
      conversation.pop();
      return;
    }
    conversation.push({ role: 'assistant', content: data.answer });
    addMessage('assistant', data.answer);
  } catch (error) {
    console.error(error);
    typing.remove();
    conversation.pop();
    addMessage('assistant', error?.message || 'Maaf, koneksi ke Tutorín AI sedang bermasalah. Coba lagi sebentar.', 'error');
  } finally {
    setBusy(false);
    input.focus();
  }
}

document.querySelectorAll('[data-prompt]').forEach(button => {
  button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});

if (imageInput) {
  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addMessage('assistant', 'Foto soal harus berupa file gambar.', 'error');
      imageInput.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      addMessage('assistant', 'Ukuran foto terlalu besar. Pilih foto di bawah 8 MB.', 'error');
      imageInput.value = '';
      return;
    }
    pendingImage = file;
    showAttachment(file);
    input.focus();
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
