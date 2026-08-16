<?php

namespace App\Http\Controllers;

use App\Models\AdminAccount;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    private function guard(Request $request): void { abort_unless($request->session()->get('admin'), 403); }

    public function login() { return session('admin') ? redirect()->route('admin.index') : view('admin.login'); }
    public function authenticate(Request $request)
    {
        $data = $request->validate(['username' => ['required', 'string'], 'password' => ['required']]);
        if (blank(config('app.admin_password')))
            return back()->withErrors(['username' => 'ADMIN_PASSWORD belum dikonfigurasi.'])->onlyInput('username');
        $account = AdminAccount::firstOrCreate(
            ['username' => config('app.admin_username')],
            ['password' => Hash::make(config('app.admin_password'))]
        );
        if (hash_equals($account->username, $data['username']) && Hash::check($data['password'], $account->password)) {
            $request->session()->regenerate();
            $request->session()->put(['admin' => true, 'admin_id' => $account->id]);
            return redirect()->route('admin.index');
        }
        return back()->withErrors(['username' => 'Username atau password tidak sesuai.'])->onlyInput('username');
    }
    public function logout(Request $request) { $request->session()->forget(['admin', 'admin_id']); $request->session()->regenerate(); $request->session()->regenerateToken(); return redirect()->route('admin.login'); }
    public function index(Request $request) { $this->guard($request); $notes = Note::when($request->q, fn ($query, $q) => $query->where(fn ($sub) => $sub->where('title', 'like', "%{$q}%")->orWhere('slug', 'like', "%{$q}%")))->latest()->paginate(12)->withQueryString(); return view('admin.index', compact('notes')); }
    public function show(Request $request, Note $note) { $this->guard($request); return view('admin.show', compact('note')); }
    public function destroy(Request $request, Note $note) { $this->guard($request); $note->delete(); return redirect()->route('admin.index')->with('success', 'Catatan berhasil dihapus.'); }
    public function updateNotePassword(Request $request, Note $note)
    {
        $this->guard($request);
        $data = $request->validate(['password' => ['nullable', 'string', 'min:4', 'confirmed']]);
        $note->update(['password' => filled($data['password'] ?? null) ? Hash::make($data['password']) : null]);
        return back()->with('success', filled($data['password'] ?? null) ? 'Password catatan berhasil diubah.' : 'Password catatan berhasil dihapus.');
    }

    public function password(Request $request) { $this->guard($request); return view('admin.password'); }
    public function updatePassword(Request $request)
    {
        $this->guard($request);
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], ['password.confirmed' => 'Konfirmasi password tidak sesuai.', 'password.min' => 'Password baru minimal 8 karakter.']);
        $account = AdminAccount::findOrFail($request->session()->get('admin_id'));
        if (!Hash::check($data['current_password'], $account->password))
            return back()->withErrors(['current_password' => 'Password saat ini salah.']);
        $account->update(['password' => Hash::make($data['password'])]);
        return back()->with('success', 'Password berhasil diubah.');
    }
}
