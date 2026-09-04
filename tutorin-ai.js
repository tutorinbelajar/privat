const messagesEl = document.getElementById('messages');
const welcomeCard = document.getElementById('welcomeCard');
const form = document.getElementById('chatForm');
const input = document.getElementById('promptInput');
const sendButton = document.getElementById('sendButton');
const conversation = [];
let busy = false;

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
  sendButton.textContent = value ? '…' : '↑';
}

async function sendMessage(text) {
  const prompt = String(text || '').trim();
  if (!prompt || busy) return;
  if (welcomeCard) welcomeCard.remove();

  conversation.push({ role: 'user', content: prompt });
  addMessage('user', prompt);
  input.value = '';
  input.style.height = 'auto';
  setBusy(true);

  const typing = addMessage('assistant', 'Tutorín AI sedang berpikir…', 'typing');
  try {
    const response = await fetch('/api/tutorin-ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: conversation })
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
    addMessage('assistant', 'Maaf, koneksi ke Tutorín AI sedang bermasalah. Coba lagi sebentar.', 'error');
  } finally {
    setBusy(false);
    input.focus();
  }
}

document.querySelectorAll('[data-prompt]').forEach(button => {
  button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});

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
