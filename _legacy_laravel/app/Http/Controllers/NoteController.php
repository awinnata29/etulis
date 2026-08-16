<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NoteController extends Controller
{
    public function home() { return view('home'); }

    public function store(Request $request)
    {
        $rules = [
            'title' => ['nullable', 'string', 'max:120'],
            'content' => ['required', 'string', 'max:100000'],
            'password' => ['nullable', 'string', 'min:4', 'max:100'],
            'expires' => ['nullable', Rule::in(['1h', '1d', '7d', '30d'])],
        ];
        if ($request->session()->get('admin')) {
            $rules['slug'] = ['nullable', 'alpha_dash', 'min:3', 'max:50', Rule::unique('notes')];
        }
        $data = $request->validate($rules, ['slug.unique' => 'Tautan khusus ini sudah digunakan.', 'content.required' => 'Tulis sesuatu terlebih dahulu.']);

        // Custom links are reserved for authenticated administrators.
        $slug = $request->session()->get('admin') ? ($data['slug'] ?? null) : null;
        do { $slug = $slug ?: Str::lower(Str::random(7)); } while (Note::where('slug', $slug)->exists());
        $expiry = match ($data['expires'] ?? null) {
            '1h' => now()->addHour(), '1d' => now()->addDay(), '7d' => now()->addDays(7),
            '30d' => now()->addDays(30), default => null,
        };
        $manageToken = Str::random(48);
        $note = Note::create([
            'title' => ($data['title'] ?? null) ?: null, 'content' => $data['content'], 'slug' => $slug,
            'password' => filled($data['password'] ?? null) ? Hash::make($data['password']) : null,
            'manage_token' => Hash::make($manageToken),
            'expires_at' => $expiry,
        ]);

        $request->session()->put("notes.manage_tokens.{$note->id}", $manageToken);
        return redirect()->route('notes.created', $note)->with('manage_token', $manageToken);
    }

    public function created(Note $note) { return view('created', compact('note')); }

    public function show(Request $request, Note $note)
    {
        abort_if($note->expires_at?->isPast(), 410, 'Catatan ini sudah kedaluwarsa.');
        if ($note->password && !$request->session()->get("notes.unlocked.{$note->id}"))
            return view('unlock', compact('note'));
        $note->increment('views');
        return view('note', compact('note'));
    }

    public function unlock(Request $request, Note $note)
    {
        $request->validate(['password' => ['required', 'string']]);
        if (!Hash::check($request->password, $note->password))
            return back()->withErrors(['password' => 'Password yang dimasukkan salah.']);
        $request->session()->put("notes.unlocked.{$note->id}", true);
        return redirect()->route('notes.show', $note);
    }

    public function manage(Request $request, Note $note, string $token)
    {
        abort_unless($note->manage_token && Hash::check($token, $note->manage_token), 404);
        $request->session()->put("notes.manage_tokens.{$note->id}", $token);
        return view('manage', compact('note', 'token'));
    }

    public function updatePassword(Request $request, Note $note, string $token)
    {
        abort_unless($note->manage_token && Hash::check($token, $note->manage_token), 404);
        $data = $request->validate(['password' => ['nullable', 'string', 'min:4', 'confirmed']]);
        $note->update(['password' => filled($data['password'] ?? null) ? Hash::make($data['password']) : null]);
        $request->session()->forget("notes.unlocked.{$note->id}");
        return back()->with('success', filled($data['password'] ?? null) ? 'Password catatan berhasil diubah.' : 'Password catatan berhasil dihapus.');
    }

    public function password(Note $note)
    {
        abort_unless($note->password, 404);
        return view('note-password', compact('note'));
    }

    public function updatePasswordWithCurrent(Request $request, Note $note)
    {
        abort_unless($note->password, 404);
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:4', 'confirmed'],
        ]);
        if (!Hash::check($data['current_password'], $note->password))
            return back()->withErrors(['current_password' => 'Password saat ini salah.']);
        $note->update(['password' => Hash::make($data['password'])]);
        $request->session()->forget("notes.unlocked.{$note->id}");
        return back()->with('success', 'Password catatan berhasil diubah.');
    }
}
