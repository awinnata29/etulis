<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? 'etulis — tulis, bagikan, selesai' }}</title>
    <link rel="icon" type="image/png" href="{{ asset('images/brand/etulis.png') }}">
    @vite(['resources/css/app.css','resources/js/app.js'])
</head>
<body>
<div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<header class="site-header">
 <div class="nav wrap">
    <a href="{{ route('home') }}" class="brand brand-image"><img src="{{ asset('images/brand/etulis.png') }}" alt="etulis" width="1536" height="1024"></a>
    <a class="header-action" href="{{ route('home') }}">Mulai menulis <i></i></a>
 </div>
</header>
<main>@yield('content')</main>
@if(!request()->routeIs('admin.login', 'admin.index', 'admin.password'))
@include('partials.promotion')
@endif
<footer class="site-footer">
 <div class="footer-shell wrap">
  <div class="footer-main">
   <div><a class="footer-logo footer-logo-image" href="{{ route('home') }}"><img src="{{ asset('images/brand/etulis.png') }}" alt="etulis" width="1536" height="1024"></a><p>Catatan sederhana untuk dibagikan.</p></div>
   <a class="footer-cta" href="{{ route('home') }}">Buat catatan <i></i></a>
  </div>
  <div class="footer-bottom"><span>© {{ date('Y') }} etulis</span><div><span>Link otomatis</span><span>Password opsional</span><span>Tanpa akun</span></div></div>
 </div>
</footer>
@stack('scripts')
</body>
</html>
