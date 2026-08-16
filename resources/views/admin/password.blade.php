@extends('layouts.app')
@section('content')
<section class="admin-settings wrap">
 <a class="settings-back" href="{{ route('admin.index') }}">Kembali ke dashboard</a>
 <div class="settings-card">
  <div class="settings-heading"><span>KEAMANAN</span><h1>Ubah password</h1><p>Gunakan minimal 8 karakter.</p></div>
  @if(session('success'))<div class="admin-alert success">{{ session('success') }}</div>@endif
  <form method="POST" action="{{ route('admin.password.update') }}">@csrf @method('PUT')
   <label>Password saat ini<input type="password" name="current_password" autocomplete="current-password" required></label>
   @error('current_password')<div class="field-error">{{ $message }}</div>@enderror
   <label>Password baru<input type="password" name="password" autocomplete="new-password" required></label>
   @error('password')<div class="field-error">{{ $message }}</div>@enderror
   <label>Konfirmasi password baru<input type="password" name="password_confirmation" autocomplete="new-password" required></label>
   <button type="submit">Simpan password</button>
  </form>
 </div>
</section>
@endsection
