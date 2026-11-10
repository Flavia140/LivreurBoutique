<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/** Erreur métier renvoyée telle quelle à l'app (message en français). */
class BusinessRuleException extends Exception
{
    public function __construct(string $message, public int $status = 422, public ?string $errorCode = null)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode], $this->status);
    }
}
