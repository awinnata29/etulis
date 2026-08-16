@extends('layouts.app')
@section('content')
<section class="admin-note-detail wrap">
 <div class="detail-nav"><a href="{{ route('admin.index') }}">Kembali</a><span>Detail catatan</span></div>
 <div class="detail-header">
  <div><span class="detail-label">CATATAN</span><h1>{{ $note->title ?: 'Tanpa judul' }}</h1><div class="detail-meta"><span>/{{ $note->slug }}</span><span>{{ $note->views }} dilihat</span><span>{{ $note->password ? 'Privat' : 'Publik' }}</span><span>{{ $note->created_at->format('d M Y, H:i') }}</span></div></div>
  <div class="detail-actions"><a href="{{ route('notes.show',$note) }}" target="_blank">Buka link</a><button type="button" onclick="navigator.clipboard.writeText(document.querySelector('#admin-note-content').innerText);this.textContent='Tersalin'">Salin isi</button><button type="button" onclick="navigator.clipboard.writeText('{{ route('notes.show',$note) }}');this.textContent='Tersalin'">Salin link</button><form method="POST" action="{{ route('admin.destroy',$note) }}" onsubmit="return confirm('Hapus catatan ini?')">@csrf @method('DELETE')<button class="delete">Hapus</button></form></div>
 </div>
 <div class="note-scroll-shell"><article class="detail-content"><pre id="admin-note-content" data-scroll-content tabindex="0">{{ $note->content }}</pre></article><div class="note-scroll-hint" data-scroll-hint>Scroll untuk melihat isi lainnya</div></div>
 <section class="note-password-panel"><div><span>PASSWORD CATATAN</span><h2>{{ $note->password ? 'Ganti atau hapus password' : 'Tambahkan password' }}</h2><p>Kosongkan kolom untuk menghapus password.</p></div><form method="POST" action="{{ route('admin.note.password',$note) }}">@csrf @method('PUT')<input type="password" name="password" placeholder="Password baru"><input type="password" name="password_confirmation" placeholder="Konfirmasi password"><button type="submit">Simpan</button></form>@error('password')<div class="field-error">{{ $message }}</div>@enderror</section>
</section>
@endsection
