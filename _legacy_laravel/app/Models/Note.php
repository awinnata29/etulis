<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = ['title', 'slug', 'content', 'password', 'manage_token', 'views', 'expires_at'];

    protected $hidden = ['password', 'manage_token'];

    protected $casts = ['expires_at' => 'datetime'];
}
