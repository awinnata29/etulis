<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\NoteController;
use Illuminate\Support\Facades\Route;

Route::get('/', [NoteController::class, 'home'])->name('home');
Route::post('/tulis', [NoteController::class, 'store'])->name('notes.store');
Route::get('/dibuat/{note}', [NoteController::class, 'created'])->name('notes.created');

Route::prefix(config('app.admin_path'))->group(function () {
    Route::get('/login', [AdminController::class, 'login'])->name('admin.login');
    Route::post('/login', [AdminController::class, 'authenticate'])->middleware('throttle:5,1')->name('admin.authenticate');
    Route::post('/logout', [AdminController::class, 'logout'])->name('admin.logout');
    Route::get('/', [AdminController::class, 'index'])->name('admin.index');
    Route::get('/catatan/{note}', [AdminController::class, 'show'])->name('admin.show');
    Route::delete('/catatan/{note}', [AdminController::class, 'destroy'])->name('admin.destroy');
    Route::put('/catatan/{note}/password', [AdminController::class, 'updateNotePassword'])->middleware('throttle:10,1')->name('admin.note.password');
    Route::get('/pengaturan/password', [AdminController::class, 'password'])->name('admin.password');
    Route::put('/pengaturan/password', [AdminController::class, 'updatePassword'])->middleware('throttle:5,1')->name('admin.password.update');
});

Route::post('/{note:slug}/buka', [NoteController::class, 'unlock'])->middleware('throttle:10,1')->name('notes.unlock');
Route::get('/{note:slug}/ubah-password', [NoteController::class, 'password'])->name('notes.password');
Route::put('/{note:slug}/ubah-password', [NoteController::class, 'updatePasswordWithCurrent'])->middleware('throttle:5,1')->name('notes.password.update');
Route::get('/kelola/{note}/{token}', [NoteController::class, 'manage'])->name('notes.manage');
Route::put('/kelola/{note}/{token}/password', [NoteController::class, 'updatePassword'])->middleware('throttle:5,1')->name('notes.manage.password');
Route::get('/{note:slug}', [NoteController::class, 'show'])->name('notes.show');
