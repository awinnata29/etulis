@extends('layouts.app')
@section('content')
<section class="center-card wrap">
 <div class="success-icon">✓</div>
 <div class="eyebrow">CATATAN BERHASIL DIBUAT</div>
 <h1>Siap untuk <em>dibagikan.</em></h1>
 <p class="lead">Tautan catatanmu sudah aktif. Salin dan kirim ke orang yang kamu inginkan.</p>
 <div class="copybox"><input id="link" readonly value="{{ route('notes.show',$note) }}"><button onclick="navigator.clipboard.writeText(link.value);this.textContent='Tersalin'">Salin tautan</button></div>
 <div class="meta"><span>{{ $note->password ? 'Dilindungi password' : 'Catatan publik' }}</span><span>{{ $note->expires_at ? 'Berakhir '.$note->expires_at->diffForHumans() : 'Tidak kedaluwarsa' }}</span></div>
 @if(session('manage_token'))<div class="manage-link-box"><label>Link pengelolaan</label><div class="copybox"><input id="manage-link" readonly value="{{ route('notes.manage', [$note, session('manage_token')]) }}"><button onclick="navigator.clipboard.writeText(document.querySelector('#manage-link').value);this.textContent='Tersalin'">Salin</button></div><small>Simpan link ini untuk mengubah password catatan.</small></div>@endif
 @if(session('manage_token'))<a class="btn manage-password-button" href="{{ route('notes.manage', [$note, session('manage_token')]) }}">Ubah password catatan</a>@endif
 <a class="text-link" href="{{ route('notes.show',$note) }}">Lihat catatan</a>
 <a class="btn secondary" href="{{ route('home') }}">Buat catatan baru</a>
</section>
@endsection
