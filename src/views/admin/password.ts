import { escapeHtml } from '../../utils/format';
import { renderLayout } from '../layout';

export interface AdminPasswordViewProps {
  adminPath: string;
  csrfToken: string;
  success?: string;
  errors?: {
    current_password?: string;
    password?: string;
  };
}

export function renderAdminPassword(props: AdminPasswordViewProps): string {
  const { adminPath, csrfToken, success, errors } = props;
  const successHtml = success ? `<div class="admin-alert success">${escapeHtml(success)}</div>` : '';
  const errorCurrentHtml = errors?.current_password
    ? `<div class="field-error">${escapeHtml(errors.current_password)}</div>`
    : '';
  const errorPasswordHtml = errors?.password
    ? `<div class="field-error">${escapeHtml(errors.password)}</div>`
    : '';

  const content = `
<section class="admin-settings wrap">
 <a class="settings-back" href="/${escapeHtml(adminPath)}">Kembali ke dashboard</a>
 <div class="settings-card">
  <div class="settings-heading"><span>KEAMANAN</span><h1>Ubah password</h1><p>Gunakan minimal 8 karakter.</p></div>
  ${successHtml}
  <form method="POST" action="/${escapeHtml(adminPath)}/pengaturan/password">
   <input type="hidden" name="_token" value="${escapeHtml(csrfToken)}">
   <input type="hidden" name="_method" value="PUT">
   <label>Password saat ini<input type="password" name="current_password" autocomplete="current-password" required></label>
   ${errorCurrentHtml}
   <label>Password baru<input type="password" name="password" autocomplete="new-password" required></label>
   ${errorPasswordHtml}
   <label>Konfirmasi password baru<input type="password" name="password_confirmation" autocomplete="new-password" required></label>
   <button type="submit">Simpan password</button>
  </form>
 </div>
</section>
`;

  return renderLayout(content, {
    title: 'Pengaturan Password Admin',
    csrfToken,
    showPromotion: false,
  });
}
