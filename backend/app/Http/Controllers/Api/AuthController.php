<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\CourierProfile;
use App\Models\MerchantApplication;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    /** Étape 1 de toute inscription (et du mot de passe oublié) : envoi du code SMS. */
    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+229\d{8,10}$/'],
            'purpose' => ['required', Rule::in(['register', 'reset'])],
        ]);

        $exists = User::where('phone', $data['phone'])->exists();
        if ($data['purpose'] === 'register' && $exists) {
            throw new BusinessRuleException('Ce numéro a déjà un compte. Connectez-vous.', 409, 'phone_taken');
        }
        if ($data['purpose'] === 'reset' && ! $exists) {
            throw new BusinessRuleException('Aucun compte avec ce numéro.', 404, 'unknown_phone');
        }

        $this->otp->send($data['phone'], $data['purpose']);

        return response()->json(['message' => 'Code envoyé par SMS.']);
    }

    public function registerClient(Request $request): JsonResponse
    {
        $data = $request->validate($this->baseRules() + [
            'zone_id' => ['required', 'exists:zones,id'],
            'address' => ['required', 'string', 'max:255'],
        ]);

        $user = $this->createUser($data, User::ROLE_CLIENT);

        return $this->tokenResponse($user, 201);
    }

    public function registerCourier(Request $request): JsonResponse
    {
        $data = $request->validate($this->baseRules() + [
            'zone_id' => ['required', 'exists:zones,id'],
            'address' => ['nullable', 'string', 'max:255'],
            'university' => ['required', 'string', 'max:150'],
            'vehicle_type' => ['required', Rule::in(['moto', 'voiture'])],
            'plate_number' => ['required', 'string', 'max:20'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = $this->createUser($data, User::ROLE_COURIER);
            CourierProfile::create([
                'user_id' => $user->id,
                'vehicle_type' => $data['vehicle_type'],
                'plate_number' => $data['plate_number'],
                'university' => $data['university'],
                'current_zone_id' => $data['zone_id'],
            ]);

            return $user;
        });

        return $this->tokenResponse($user, 201);
    }

    public function registerMerchant(Request $request): JsonResponse
    {
        $data = $request->validate($this->baseRules() + [
            'business_name' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(MerchantApplication::CATEGORIES)],
            'zone_id' => ['required', 'exists:zones,id'],
            'address' => ['required', 'string', 'max:255'],
            'ifu' => ['nullable', 'string', 'max:30'],
            'rccm' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
            'documents' => ['nullable', 'array', 'max:5'],
            'documents.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $user = DB::transaction(function () use ($data, $request) {
            $user = $this->createUser($data, User::ROLE_MERCHANT);
            $paths = collect($request->file('documents', []))
                ->map(fn ($file) => $file->store("merchants/{$user->id}", 'local'))->all();

            MerchantApplication::create([
                'user_id' => $user->id,
                ...collect($data)->only(['business_name', 'category', 'zone_id', 'address', 'ifu', 'rccm', 'description'])->all(),
                'documents' => $paths,
            ]);

            return $user;
        });

        return $this->tokenResponse($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('phone', $data['phone'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw new BusinessRuleException('Numéro ou mot de passe incorrect.', 401, 'bad_credentials');
        }
        if (! $user->isActive()) {
            throw new BusinessRuleException('Votre compte est suspendu. Contactez le support YAKO.', 403, 'suspended');
        }

        return $this->tokenResponse($user);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'exists:users,phone'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $this->otp->verify($data['phone'], 'reset', $data['code']);
        $user = User::where('phone', $data['phone'])->firstOrFail();
        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Mot de passe modifié. Connectez-vous.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('courierProfile', 'merchantApplication', 'zone'));
    }

    private function baseRules(): array
    {
        return [
            'phone' => ['required', 'string', 'regex:/^\+229\d{8,10}$/', 'unique:users,phone'],
            'code' => ['required', 'digits:6'],
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ];
    }

    private function createUser(array $data, string $role): User
    {
        $this->otp->verify($data['phone'], 'register', $data['code']);

        return User::create([
            ...collect($data)->only(['first_name', 'last_name', 'phone', 'email', 'password', 'zone_id', 'address'])->all(),
            'role' => $role,
            'phone_verified_at' => now(),
        ]);
    }

    private function tokenResponse(User $user, int $status = 200): JsonResponse
    {
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user->load('courierProfile', 'merchantApplication', 'zone')),
        ], $status);
    }
}
