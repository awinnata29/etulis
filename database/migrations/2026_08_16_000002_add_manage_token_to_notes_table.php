<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('notes', fn (Blueprint $table) => $table->string('manage_token')->nullable()->after('password')); }
    public function down(): void { Schema::table('notes', fn (Blueprint $table) => $table->dropColumn('manage_token')); }
};
