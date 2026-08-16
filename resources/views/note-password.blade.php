@extends('layouts.app')
@section('content')
<section class="manage-note-page wrap">
 <a class="settings-back" href="{{ route('notes.show',$note) }}">Kembali ke catatan</a>
 <div class="settings-card">
  <div class="settings-heading"><span>KEAMANAN CATATAN</span><h1>Ubah password</h1><p>/{{ $note->slug }}</p></div>
  @if(session('success'))<div class="admin-alert success">{{ session('success') }}</div>@endif
  <form method="POST" action="{{ route('notes.password.update',$note) }}">@csrf @method('PUT')
   <label>Password saat ini<input type="password" name="current_password" required></label>
   @error('current_password')<div class="field-error">{{ $message }}</div>@enderror
   <label>Password baru<input type="password" name="password" required></label>
   @error('password')<div class="field-error">{{ $message }}</div>@enderror
   <label>Konfirmasi password baru<input type="password" name="password_confirmation" required></label>
   <button type="submit">Simpan perubahan</button>
  </form>
 </div>
</section>
@endsection
