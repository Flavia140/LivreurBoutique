<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopRating extends Model
{
    protected $fillable = ['order_id', 'shop_id', 'client_id', 'score', 'conformity', 'presentation', 'packaging', 'comment'];
}
