# Tester YAKO sur un PC Windows

Version de démonstration : tout tourne sur le PC, sans FeexPay ni SMS.
Les paiements Mobile Money sont validés d'office et le code SMS est toujours **123456**.

## 1. Prérequis (une seule fois)

- PHP 8.3 ou plus, Composer, Node.js 20 ou plus, Git.
- Avec winget : `winget install PHP.PHP.8.3 Composer.Composer OpenJS.NodeJS.LTS Git.Git`
- Dans `php.ini`, activer : `pdo_sqlite`, `sqlite3`, `fileinfo`, `mbstring`, `openssl`, `curl`, `zip`.
- Sur le téléphone (Android) : l'application **Expo Go** (Play Store), connecté au même Wi-Fi que le PC.

## 2. Installer

Double-cliquer sur `installer.bat` (ou le lancer dans un terminal). Il :
prépare le serveur Laravel, crée la base SQLite avec les zones, tarifs, boutiques et comptes de test,
puis installe l'app mobile.

## 3. Lancer

Double-cliquer sur `demarrer.bat`. Deux fenêtres s'ouvrent :

- **Serveur** : http://localhost:8000 (back-office : http://localhost:8000/admin)
- **App** : un QR code à scanner avec Expo Go. Appuyer sur `w` pour l'ouvrir dans le navigateur à la place.

## 4. Comptes de test (mot de passe `yako1234`)

| Profil | Téléphone | Ce qu'on peut tester |
|---|---|---|
| Client | 01 97 00 00 01 | Envoyer un colis, acheter en boutique, suivre, noter |
| Livreur (validé) | 01 96 00 00 01 | Passer en ligne, accepter, signaler l'arrivée, livrer avec le code, gains |
| Commerçant (validé, sans boutique) | 01 95 00 00 01 | Abonnement, créer la boutique avec un modèle, produits, commandes |
| Administrateur | 01 00 00 00 00 | Mot de passe `admin-yako` sur http://localhost:8000/admin |

Les boutiques de démonstration (Africa Market, Ma Cuisine, Tech World, Boutique Mode Cotonou) sont déjà en ligne.
On peut aussi créer de nouveaux comptes depuis l'app : le code reçu par « SMS » est 123456.

## 5. Scénario conseillé

1. **Client** : onglet Envoyer → Akpakpa vers Fidjrossè → payer en espèces → noter le code à 4 chiffres.
2. **Livreur** (sur un autre téléphone ou après déconnexion) : passer en ligne → Courses → Accepter →
   « Je suis au point de retrait » → « J'ai récupéré le colis » → « Je suis arrivé » → saisir le code du client.
3. **Client** : voir « Votre livreur est arrivé ! », puis la preuve de livraison, et laisser un avis.
4. **Commerçant** : abonnement (validé d'office) → créer la boutique → ajouter un produit → demander la mise en ligne.
5. **Admin** : Boutiques → mettre la boutique en ligne ; Espèces à reverser ; Réglages → plafond espèces.

Remarques : la carte de suivi s'affiche seulement sur téléphone. Les horaires de service sont élargis à 6h–23h59 pour les tests.
