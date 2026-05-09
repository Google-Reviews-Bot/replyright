// ─── PAGE ROUTING ───────────────────────────────────────────
function showPage(name) {
  ['landing', 'signup', 'login', 'app'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(name).style.display = 'block';
  window.scrollTo(0, 0);
}

// ─── SIMPLE AUTH (localStorage) ─────────────────────────────
// NOTE: This is a lightweight auth system for your MVP.
// When you're ready to scale, swap this for Supabase (free).

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const status = document.getElementById('signup-status');

  if (!name || !email || !password) { status.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6) { status.textContent = 'Password must be at least 6 characters.'; return; }

  const users = JSON.parse(localStorage.getItem('rr_users') || '{}');
  if (users[email]) { status.textContent = 'An account with that email already exists.'; return; }

  users[email] = { name, email, password, plan: 'trial', joined: Date.now() };
  localStorage.setItem('rr_users', JSON.stringify(users));
  localStorage.setItem('rr_session', JSON.stringify({ name, email }));

  loginSuccess(name);
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const status = document.getElementById('login-status');

  const users = JSON.parse(localStorage.getItem('rr_users') || '{}');
  const user = users[email];

  if (!user || user.password !== password) { status.textContent = 'Incorrect email or password.'; return; }

  localStorage.setItem('rr_session', JSON.stringify({ name: user.name, email }));
  loginSuccess(user.name);
}

function loginSuccess(name) {
  document.getElementById('user-name-display').textContent = name;
  const savedKey = localStorage.getItem('rr_gemini_key');
  if (savedKey) document.getElementById('apiKey').value = savedKey;
  showPage('app');
}

function handleLogout() {
  localStorage.removeItem('rr_session');
  showPage('landing');
}

// Check if already logged in on page load
window.addEventListener('DOMContentLoaded', () => {
  const session = JSON.parse(localStorage.getItem('rr_session') || 'null');
  if (session) {
    document.getElementById('user-name-display').textContent = session.name;
    const savedKey = localStorage.getItem('rr_gemini_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;
    showPage('app');
  }

  // Star rating
  document.querySelectorAll('.star').forEach(s => {
    s.addEventListener('click', () => {
      rating = parseInt(s.dataset.val);
      document.querySelectorAll('.star').forEach((st, i) => st.classList.toggle('lit', i < rating));
    });
  });

  // Tone buttons
  document.querySelectorAll('.tone-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tone-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      tone = b.dataset.tone;
    });
  });
});

// ─── API KEY ────────────────────────────────────────────────
function saveKey() {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) { document.getElementById('key-status').textContent = 'Paste your API key first.'; return; }
  localStorage.setItem('rr_gemini_key', key);
  document.getElementById('key-status').textContent = 'Key saved. Ready to generate responses.';
}

// ─── REVIEW RESPONDER ───────────────────────────────────────
let rating = 0;
let tone = 'warm and friendly';

async function generate() {
  const key = localStorage.getItem('rr_gemini_key');
  if (!key) { document.getElementById('gen-status').textContent = 'Save your Gemini API key first.'; return; }

  const biz = document.getElementById('bizName').value.trim();
  const type = document.getElementById('bizType').value;
  const review = document.getElementById('reviewText').value.trim();
  if (!review) { document.getElementById('gen-status').textContent = 'Paste a review first.'; return; }

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.textContent = 'Writing...';
  document.getElementById('gen-status').textContent = '';
  document.getElementById('resultCard').style.display = 'none';

  const bizLabel = biz ? `${biz} (${type})` : type;
  const ratingText = rating ? `${rating} stars` : 'unknown rating';
  const isNegative = rating > 0 && rating <= 3;

  const prompt = `You are a real business owner writing a personal reply to a Google review. Write exactly as a real human owner would, not a marketing person or AI.

Business: ${bizLabel}
Rating: ${ratingText}
Tone: ${tone}
Review: "${review}"

Rules:
- NEVER use em dashes. Use commas or short sentences instead.
- Never use: "valued", "we strive", "we pride ourselves", "ensure", "at [business name]", "thank you for your feedback", "we appreciate your patronage"
- Do not start with "Thank you for your review" or any variation
- Sound like a real person typed this on their phone, not a PR team
- Pick up on one specific detail from the review and mention it naturally
- Keep it to 3 to 4 sentences max
- If negative (${isNegative}), be genuine and offer to fix it, include "give us a call on [your number]"
- No exclamation marks unless the review is very positive and one feels completely natural
- Output only the response text, nothing else.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await res.json();
    if (data.error) {
      document.getElementById('gen-status').textContent = 'API error: ' + data.error.message;
      btn.disabled = false;
      btn.textContent = 'Generate response';
      return;
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Something went wrong, try again.';
    document.getElementById('resultText').textContent = text.trim();
    document.getElementById('resultCard').style.display = 'block';
  } catch (e) {
    document.getElementById('gen-status').textContent = 'Connection error. Check your API key and try again.';
  }

  btn.disabled = false;
  btn.textContent = 'Generate response';
}

function copyText() {
  const text = document.getElementById('resultText').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy to clipboard'; }, 2000);
  });
}
