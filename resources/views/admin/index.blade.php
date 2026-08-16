@extends('layouts.app')
@section('content')
<section class="admin-dashboard wrap">
 <div class="admin-topbar">
  <div><span class="admin-label">ADMIN DASHBOARD</span><h1>Catatan</h1></div>
  <div class="admin-top-actions"><a class="admin-ghost" href="{{ route('admin.password') }}">Ubah password</a><a class="admin-primary" href="{{ route('home') }}">Buat catatan</a><form method="POST" action="{{ route('admin.logout') }}">@csrf<button type="submit">Keluar</button></form></div>
 </div>
 @if(session('success'))<div class="admin-alert success">{{ session('success') }}</div>@endif
 <div class="admin-stats">
  <article><span>Total catatan</span><strong>{{ \App\Models\Note::count() }}</strong><small>Semua link</small></article>
  <article><span>Total dilihat</span><strong>{{ \App\Models\Note::sum('views') }}</strong><small>Seluruh kunjungan</small></article>
  <article><span>Diproteksi</span><strong>{{ \App\Models\Note::whereNotNull('password')->count() }}</strong><small>Menggunakan password</small></article>
  <article><span>Kedaluwarsa</span><strong>{{ \App\Models\Note::whereNotNull('expires_at')->count() }}</strong><small>Memiliki batas waktu</small></article>
 </div>
 <div class="admin-content-card">
  <div class="admin-table-head"><div><h2>Semua catatan</h2><span>{{ $notes->total() }} hasil</span></div><form method="GET" action="{{ route('admin.index') }}"><input name="q" value="{{ request('q') }}" placeholder="Cari judul atau link"><button>Cari</button></form></div>
  <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Catatan</th><th>Link</th><th>Akses</th><th>Dilihat</th><th>Dibuat</th><th></th></tr></thead><tbody>
  @forelse($notes as $note)
   <tr><td><strong>{{ $note->title ?: 'Tanpa judul' }}</strong><small>{{ \Illuminate\Support\Str::limit($note->content,55) }}</small></td><td><a class="admin-slug" href="{{ route('notes.show',$note) }}" target="_blank">/{{ $note->slug }}</a></td><td><span class="access-pill {{ $note->password ? 'private' : '' }}">{{ $note->password ? 'Privat' : 'Publik' }}</span></td><td>{{ $note->views }}</td><td><span>{{ $note->created_at->format('d M Y') }}</span><small>{{ $note->created_at->format('H:i') }}</small></td><td><div class="row-actions"><a href="{{ route('admin.show',$note) }}">Lihat</a><button type="button" class="password-action" onclick="document.querySelector('#password-modal-{{ $note->id }}').showModal()">Password</button><form method="POST" action="{{ route('admin.destroy',$note) }}" onsubmit="return confirm('Hapus catatan ini?')">@csrf @method('DELETE')<button>Hapus</button></form></div><dialog class="password-modal" id="password-modal-{{ $note->id }}" onclick="if(event.target===this)this.close()"><div class="password-modal-card"><div class="password-modal-head"><div><span>PASSWORD CATATAN</span><h3>{{ $note->title ?: 'Tanpa judul' }}</h3></div><button type="button" onclick="this.closest('dialog').close()" aria-label="Tutup">×</button></div><form method="POST" action="{{ route('admin.note.password',$note) }}">@csrf @method('PUT')<label>Password baru<input type="password" name="password" placeholder="Kosongkan untuk menghapus"></label><label>Konfirmasi password<input type="password" name="password_confirmation"></label><div class="password-modal-actions"><button type="button" onclick="this.closest('dialog').close()">Batal</button><button type="submit">Simpan</button></div></form></div></dialog></td></tr>
  @empty<tr><td colspan="6" class="admin-empty">{{ request('q') ? 'Catatan tidak ditemukan.' : 'Belum ada catatan.' }}</td></tr>@endforelse
  </tbody></table></div><div class="admin-pagination">{{ $notes->links() }}</div>
 </div>
</section>
<style>.password-modal[open]{position:fixed;inset:0;display:block;margin:auto;max-height:calc(100vh - 32px)}</style>
@endsection
