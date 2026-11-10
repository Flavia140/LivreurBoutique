<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Notifications push. Pour l'instant journalisées ; l'envoi Firebase (FCM HTTP v1)
 * sera branché quand le projet Firebase existera.
 */
class PushNotifier
{
    /** @param iterable<User>|User $users */
    public function send(iterable|User $users, string $title, string $body, array $data = []): void
    {
        $users = $users instanceof User ? [$users] : $users;
        $ids = collect($users)->pluck('id');
        $tokens = DeviceToken::whereIn('user_id', $ids)->pluck('token');

        Log::info('PUSH', ['users' => $ids->all(), 'tokens' => $tokens->count(), 'title' => $title, 'body' => $body, 'data' => $data]);
    }
}
