@extends('layouts.app')
@section('content')
<section class="admin-login-page wrap">
 <div class="admin-login-card">
  <div class="admin-login-side">
   <img src="{{ asset('images/brand/etulis.png') }}" alt="etulis" width="1536" height="1024">
   <div><span>ADMIN PANEL</span><h1>Kelola catatan dalam satu tempat.</h1></div>
  </div>
  <div class="admin-login-form">
   <div class="login-heading"><span>AKSES ADMIN</span><h2>Masuk</h2><p>Gunakan akun administrator etulis.</p></div>
   <form method="POST" action="{{ route('admin.authenticate') }}">@csrf
    <label for="username">Username</label>
    <input id="username" class="login-input" type="text" name="username" value="{{ old('username') }}" autocomplete="username" autofocus required placeholder="Masukkan username">
    <div class="password-label"><label for="password">Password</label><button id="toggle-password" type="button">Tampilkan</button></div>
    <div class="password-field"><input id="password" class="login-input" type="password" name="password" autocomplete="current-password" required placeholder="Masukkan password"></div>
    @if($errors->any())<div class="login-error">{{ $errors->first() }}</div>@endif
    <button class="login-submit" type="submit">Masuk <i></i></button>
   </form>
   <a class="login-back" href="{{ route('home') }}">Kembali ke etulis</a>
  </div>
 </div>
</section>
@endsection
@push('scripts')
<script>const toggle=document.querySelector('#toggle-password'),password=document.querySelector('#password');toggle.addEventListener('click',()=>{const visible=password.type==='text';password.type=visible?'password':'text';toggle.textContent=visible?'Tampilkan':'Sembunyikan'})</script>
@endpush
