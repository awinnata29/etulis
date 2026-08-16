import { escapeHtml } from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminLoginViewProps {
  adminPath: string;
  csrfToken: string;
  error?: string;
  oldUsername?: string;
}

export function renderAdminLogin(props: AdminLoginViewProps): string {
  const { adminPath, csrfToken, error, oldUsername } = props;
  const errorHtml = error ? `<div class="login-error">${escapeHtml(error)}</div>` : '';

  const content = `
<section class="admin-login-page wrap">
 <div class="admin-login-card">
  <div class="admin-login-side">
   <img src="/images/brand/etulis.png" alt="etulis" width="1536" height="1024">
   <div><span>ADMIN PANEL</span><h1>Kelola catatan dalam satu tempat.</h1></div>
  </div>
  <div class="admin-login-form">
   <div class="login-heading"><span>AKSES ADMIN</span><h2>Masuk</h2><p>Gunakan akun administrator etulis.</p></div>
   <form method="POST" action="/${escapeHtml(adminPath)}/login">
    <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
    <label for="username">Username</label>
    <input id="username" class="login-input" type="text" name="username" value="${escapeHtml(oldUsername || '')}" autocomplete="username" autofocus required placeholder="Masukkan username">
    <div class="password-label"><label for="password">Password</label><button id="toggle-password" type="button">Tampilkan</button></div>
    <div class="password-field"><input id="password" class="login-input" type="password" name="password" autocomplete="current-password" required placeholder="Masukkan password"></div>
    ${errorHtml}
    <button class="login-submit" type="submit">Masuk <i></i></button>
   </form>
   <a class="login-back" href="/">Kembali ke etulis</a>
  </div>
 </div>
</section>
`;

  const scripts = `
<script>
const toggle = document.querySelector('#toggle-password');
const password = document.querySelector('#password');
toggle?.addEventListener('click', () => {
    const visible = password.type === 'text';
    password.type = visible ? 'password' : 'text';
    toggle.textContent = visible ? 'Tampilkan' : 'Sembunyikan';
});
</script>
`;

  return renderLayout(content, {
    title: 'Login Administrator',
    csrfToken,
    showPromotion: false,
    scripts,
  });
}
