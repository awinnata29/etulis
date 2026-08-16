@extends('layouts.app')
@section('content')
<article class="public-note wrap">
 <header class="public-note-head">
  <div><span class="detail-label">CATATAN ETULIS</span><h1>{{ $note->title ?: 'Tanpa judul' }}</h1></div>
  <div class="public-note-actions">@if(session("notes.manage_tokens.{$note->id}"))<a href="{{ route('notes.manage', [$note, session("notes.manage_tokens.{$note->id}")]) }}">Ubah password</a>@elseif($note->password)<a href="{{ route('notes.password',$note) }}">Ubah password</a>@endif<button type="button" onclick="navigator.clipboard.writeText(document.querySelector('#note-content').innerText);this.textContent='Tersalin'">Salin isi</button><button type="button" onclick="navigator.clipboard.writeText(location.href);this.textContent='Link tersalin'">Salin link</button></div>
 </header>
 <div class="public-note-meta"><span>{{ $note->created_at->translatedFormat('d F Y, H:i') }}</span><span>{{ $note->views }} kali dilihat</span>@if($note->password)<span>Diproteksi password</span>@endif @if($note->expires_at)<span>Berakhir {{ $note->expires_at->diffForHumans() }}</span>@endif</div>
 <div class="note-scroll-shell"><div class="public-note-content" id="note-content" data-scroll-content tabindex="0">{{ $note->content }}</div><div class="note-scroll-hint" data-scroll-hint>Scroll untuk melihat isi lainnya</div></div>
 <div class="public-note-bottom"><a href="{{ route('home') }}">Buat catatan baru</a></div>
</article>
@endsection
