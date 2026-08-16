<?php

namespace Tests\Feature;

use App\Models\Note;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NoteFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.admin_username' => 'admin', 'app.admin_password' => 'admin123']);
    }

    public function test_a_public_note_can_be_created_and_opened(): void
    {
        $response = $this->withSession(['admin' => true])->post('/tulis', ['content' => 'Catatan pengujian', 'slug' => 'uji-catatan']);
        $note = Note::firstOrFail();
        $response->assertRedirect(route('notes.created', $note));
        $this->get('/uji-catatan')->assertOk()->assertSee('Catatan pengujian');
    }

    public function test_a_guest_cannot_create_a_custom_link(): void
    {
        $this->post('/tulis', ['content' => 'Catatan tamu', 'slug' => 'slug-pilihan']);
        $note = Note::firstOrFail();
        $this->assertNotSame('slug-pilihan', $note->slug);
        $this->assertMatchesRegularExpression('/^[a-z0-9]{7}$/', $note->slug);
    }

    public function test_a_password_note_requires_the_correct_password(): void
    {
        $note = Note::create(['slug' => 'rahasia', 'content' => 'Isi tersembunyi', 'password' => Hash::make('aman123')]);
        $this->get('/rahasia')->assertOk()->assertDontSee('Isi tersembunyi');
        $this->post('/rahasia/buka', ['password' => 'salah'])->assertSessionHasErrors('password');
        $this->post('/rahasia/buka', ['password' => 'aman123'])->assertRedirect('/rahasia');
        $this->get('/rahasia')->assertSee('Isi tersembunyi');
    }

    public function test_admin_can_login_view_and_delete_notes(): void
    {
        $note = Note::create(['slug' => 'kelola', 'content' => 'Dikelola admin']);
        $this->post(route('admin.authenticate'), ['username' => 'admin', 'password' => 'admin123'])->assertRedirect(route('admin.index'));
        $this->get(route('admin.index'))->assertOk()->assertSee('kelola');
        $this->delete(route('admin.destroy', $note))->assertRedirect(route('admin.index'));
        $this->assertDatabaseMissing('notes', ['id' => $note->id]);
    }

    public function test_admin_can_change_their_password(): void
    {
        $this->post(route('admin.authenticate'), ['username' => 'admin', 'password' => 'admin123']);
        $this->put(route('admin.password.update'), [
            'current_password' => 'admin123',
            'password' => 'password-baru',
            'password_confirmation' => 'password-baru',
        ])->assertSessionHasNoErrors()->assertSessionHas('success');

        $this->post(route('admin.logout'));
        $this->post(route('admin.authenticate'), ['username' => 'admin', 'password' => 'password-baru'])
            ->assertRedirect(route('admin.index'));
    }

    public function test_note_owner_can_change_password_with_management_token(): void
    {
        $token = 'token-rahasia-pemilik';
        $note = Note::create(['slug' => 'dikelola-user', 'content' => 'Isi', 'manage_token' => Hash::make($token)]);

        $this->put(route('notes.manage.password', [$note, $token]), [
            'password' => 'baru1234', 'password_confirmation' => 'baru1234',
        ])->assertSessionHas('success');

        $this->assertTrue(Hash::check('baru1234', $note->fresh()->password));
        $this->get(route('notes.manage', [$note, $token]))->assertOk();
        $this->post(route('notes.unlock', $note), ['password' => 'baru1234'])->assertRedirect(route('notes.show', $note));
        $this->get(route('notes.show', $note))->assertSee('Ubah password');
        $this->get(route('notes.manage', [$note, 'token-salah']))->assertNotFound();
    }

    public function test_admin_can_remove_a_note_password(): void
    {
        $note = Note::create(['slug' => 'ubah-admin', 'content' => 'Isi', 'password' => Hash::make('lama1234')]);
        $this->post(route('admin.authenticate'), ['username' => 'admin', 'password' => 'admin123']);
        $this->put(route('admin.note.password', $note), ['password' => '', 'password_confirmation' => ''])
            ->assertSessionHas('success');
        $this->assertNull($note->fresh()->password);
    }

    public function test_password_can_be_changed_with_the_current_note_password(): void
    {
        $note = Note::create(['slug' => 'catatan-lama', 'content' => 'Isi', 'password' => Hash::make('password-lama')]);
        $this->get(route('notes.password', $note))->assertOk()->assertSee('Ubah password');
        $this->put(route('notes.password.update', $note), [
            'current_password' => 'password-lama',
            'password' => 'password-baru',
            'password_confirmation' => 'password-baru',
        ])->assertSessionHas('success');
        $this->assertTrue(Hash::check('password-baru', $note->fresh()->password));
    }
}
