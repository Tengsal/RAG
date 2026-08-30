/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Google OAuth & Auth Manager
   ═══════════════════════════════════════════════════════════════ */

'use strict';

window.handleGoogleSignIn = async function(response) {
  try {
    const data = await api('/api/auth/google/verify', {
      method: 'POST',
      body: { credential: response.credential },
    });
    if (data.token && data.user) {
      localStorage.setItem('adtu_auth_token', data.token);
      localStorage.setItem('adtu_user', JSON.stringify(data.user));
      renderUser(data.user);
      toast(`Welcome, ${data.user.name}! Authenticated with Google.`, 'ok');
    }
  } catch (err) {
    toast(`Google Sign-In failed: ${err.message}`, 'err');
  }
};

function renderUser(user) {
  if (!user) return;
  const profileBox = $('user-profile');
  const avatar = $('user-avatar');
  const name = $('user-name');
  const email = $('user-email');

  if (avatar) avatar.src = user.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
  if (name) name.textContent = user.name || 'User';
  if (email) email.textContent = user.email || '';
  if (profileBox) profileBox.hidden = false;

  const signinBtn = document.querySelector('.g_id_signin');
  if (signinBtn) signinBtn.style.display = 'none';
}

const logoutBtn = $('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adtu_auth_token');
    localStorage.removeItem('adtu_user');
    location.reload();
  });
}

try {
  const savedUser = JSON.parse(localStorage.getItem('adtu_user') || 'null');
  if (savedUser) renderUser(savedUser);
} catch (_) {}
