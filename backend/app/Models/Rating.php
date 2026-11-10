<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    protected $fillable = ['delivery_id', 'client_id', 'courier_id', 'score', 'punctuality', 'care', 'politeness', 'comment'];
}
