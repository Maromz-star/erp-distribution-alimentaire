# ERP Distribution Alimentaire

Application de gestion commerciale (produits, stock, ventes, achats, clients,
fournisseurs, reglements, rapports) pour une entreprise de distribution de
produits alimentaires.

**Stack** : Next.js 14 (App Router, API routes) · PostgreSQL · Prisma ·
Tailwind CSS · TypeScript.

---

## ⚠️ A lire avant de commencer

Ce code a ete ecrit dans un environnement **sans acces reseau** : il n'a donc
pas pu etre installe (`npm install`) ni execute pour verification. Il a ete
ecrit avec autant de rigueur que possible (types stricts, transactions DB,
validation systematique), mais vous devrez :

1. L'installer et le lancer chez vous en suivant les etapes ci-dessous.
2. Corriger d'eventuelles erreurs mineures (typo, import manquant) qu'un
   compilateur TypeScript reel aurait attrapees immediatement.
3. Lire la section **"Ce qui est fait / ce qui reste a faire"** plus bas
   avant de mettre l'application entre les mains d'utilisateurs reels.

Ne partez pas du principe que c'est un logiciel fini et audite - c'est une
base solide et fonctionnelle sur le papier, a valider par vos soins.

---

## 1. Installation locale

### Prerequis
- Node.js 18.17 ou plus recent
- PostgreSQL 14+ (local, Docker, ou un service manage comme Supabase/Neon/Railway)

### Etapes

```bash
# 1. Installer les dependances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# -> editez .env : DATABASE_URL (connexion PostgreSQL) et JWT_SECRET
#    (generez un secret avec : openssl rand -base64 48)

# 3. Creer les tables en base (genere aussi le client Prisma)
npm run db:migrate

# 4. (Optionnel mais recommande) Charger des donnees de demonstration
npm run db:seed
# Cree un compte admin : admin@distribution.local / admin1234
# et un compte employe : employe@distribution.local / employe1234
# -> CHANGEZ CES MOTS DE PASSE avant toute utilisation reelle.

# 5. Lancer l'application en developpement
npm run dev
# -> http://localhost:3000
```

### Explorer la base de donnees
```bash
npm run db:studio
```
Ouvre Prisma Studio (interface web) pour inspecter/modifier les donnees directement.

---

## 2. Deploiement en production

### Option recommandee : Vercel (frontend) + base managee (Neon / Supabase / Railway)

1. Poussez le code sur un depot Git (GitHub/GitLab).
2. Creez une base PostgreSQL managee, recuperez son `DATABASE_URL`.
3. Sur Vercel : importez le depot, ajoutez les variables d'environnement
   (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`).
4. Avant le premier deploiement (ou via un script de build), executez
   `npx prisma migrate deploy` pour appliquer les migrations sur la base de
   production (ne PAS utiliser `migrate dev` en production).
5. ⚠️ **Stockage des photos produits** : `/api/upload` ecrit sur le disque
   local du serveur (`public/uploads`). Sur Vercel (serverless, disque non
   persistant), les photos uploadees disparaitront. Pour un deploiement
   serverless, remplacez ce module par un stockage objet (S3, Cloudinary,
   Vercel Blob...) avant mise en production.

### Option alternative : serveur classique (VPS)

Fonctionne nativement puisque le disque est persistant :
```bash
npm run build
npm run start          # ou via pm2 / systemd pour la resilience
```
Mettez PostgreSQL et l'app derriere un reverse proxy (Nginx/Caddy) avec HTTPS.

---

## 3. Comptes et roles

| Role       | Acces                                                                 |
|------------|------------------------------------------------------------------------|
| ADMIN      | Tout, y compris la gestion des utilisateurs                           |
| EMPLOYE    | Toutes les operations metier (produits, stock, ventes, achats...)     |
| COMMERCIAL | Ventes et clients en ecriture ; le reste en lecture seule             |

La logique complete est dans `lib/permissions.ts`.

---

## 4. Ce qui est fait / ce qui reste a faire

### ✅ Complet et fonctionnel (sur le papier - a valider en le lançant)
- Authentification par cookie httpOnly + JWT, mots de passe hashes (bcrypt)
- Permissions par role, middleware de protection de toutes les routes
- Produits : CRUD, recherche, filtres, photo principale (upload local)
- Clients / Fournisseurs : CRUD, fiche detaillee avec historique complet et soldes
- **Ventes** : panier multi-produits, calcul HT/remise/TVA/TTC en temps reel,
  **decrement automatique du stock en transaction DB** (annulation complete
  si le stock est insuffisant), generation de numero de facture, reglement
  immediat optionnel
- **Livraisons fournisseurs** : meme logique, **increment automatique du stock**
- Reglements clients / paiements fournisseurs avec calcul de solde
- Mouvements de stock (journal complet) + ajustements manuels traces
- Dashboard : tous les KPI demandes + 4 graphiques (recharts)
- Recherche globale instantanee (produits, clients, fournisseurs, factures, bons)
- Rapports (7 types) exportables en CSV (compatible Excel)
- Mode clair/sombre, interface responsive, navigation laterale
- Journal d'audit (table `journal_actions`) trace les actions sensibles

### ⚠️ Partiel / simplifie (limites documentees dans le code)
- **Export PDF** : non implemente (CSV seulement). Necessite une lib de
  rendu HTML->PDF cote serveur (puppeteer, @react-pdf/renderer).
- **Photos multiples par produit** : le modele de donnees les supporte
  (`ProduitPhoto`), mais l'interface ne gere que la photo principale pour
  l'instant.
- **Import de produits** (CSV/Excel en masse) : non implemente.
- **Notifications** : affichees dans le dashboard et une pastille sur la
  cloche (stock faible), mais pas de notifications push/email en temps reel.
- **Cout de revient historique** : le rapport "benefices" compare le prix de
  vente historise a la **date de la vente** au prix d'achat **actuel** du
  produit (le cout d'achat n'est pas historise ligne par ligne). Pour des
  marges exactes sur les ventes anciennes apres une hausse de prix
  fournisseur, il faudrait ajouter un `coutAchatHistorise` sur `LigneVente`.
- **Numero de facture / bon** : genere par comptage simple ; en tres forte
  concurrence (deux ventes la meme milliseconde), un conflit est possible
  (rattrape par la contrainte `@unique`, qui fait echouer proprement la
  2e requete plutot que de corrompre les donnees, mais l'utilisateur devrait
  reessayer). Pour un tres gros volume, remplacez par une sequence PostgreSQL
  dediee.
- **Filtre "stock faible"** et quelques agregations client/dashboard sont
  calcules en memoire cote serveur plutot qu'en SQL pur (documente en
  commentaire a chaque endroit). Suffisant pour le volume d'une PME ; a
  revoir avec des vues SQL si le catalogue depasse plusieurs dizaines de
  milliers de lignes.

### ❌ Non fait (a construire si besoin)
- Tests automatises (aucun test n'a ete ecrit)
- Internationalisation (l'interface est en francais uniquement)
- Gestion multi-depots / multi-entrepots
- Codes-barres : le champ existe en base, mais pas de scanner integre
- Dates de peremption : champ en base (`datePeremption`), pas encore
  exploite dans les alertes du dashboard

---

## 5. Structure du projet

```
app/
  (app)/                 routes authentifiees (layout partage : sidebar + topbar)
    dashboard/
    produits/
    clients/[id]/
    fournisseurs/[id]/
    ventes/nouvelle/, ventes/[id]/
    livraisons/nouvelle/, livraisons/[id]/
    stock/
    reglements/
    rapports/
    utilisateurs/
  api/                   route handlers (backend)
    auth/, produits/, clients/, fournisseurs/, ventes/, livraisons/,
    stock/, reglements/, paiements-fournisseurs/, dashboard/, recherche/,
    rapports/, utilisateurs/, upload/
  login/
components/              composants reutilisables (Sidebar, TopBar, DataTable, Modal, ui.tsx)
lib/                     db.ts, auth.ts, permissions.ts, api-helpers.ts, api-client.ts
prisma/
  schema.prisma          schema complet de la base
  seed.ts                donnees de demonstration
middleware.ts            protection des routes (auth + roles)
```

---

## 6. Securite - ce qui est en place

- Mots de passe haches avec bcrypt (jamais stockes en clair)
- Sessions via JWT dans un cookie **httpOnly** (inaccessible en JavaScript
  cote client -> protection contre le vol de session par XSS)
- Toutes les entrees utilisateur validees avec Zod avant tout acces base
  de donnees (protection injection, donnees malformees)
- Prisma genere des requetes parametrees (protection injection SQL native)
- Permissions verifiees a la fois par le middleware et dans chaque route API
  (defense en profondeur)
- Journal d'audit sur les actions sensibles (connexion, creation/modification
  de produits, ventes, utilisateurs...)

**A faire vous-meme avant production** : configurer HTTPS (obligatoire pour
que `secure: true` sur le cookie prenne effet), mettre en place un rate
limiting sur `/api/auth/login` (non inclus ici), et une politique de
sauvegarde de la base de donnees.

---

## 7. Support

Ce projet a ete genere comme point de depart solide, pas comme produit fini.
Pour toute question de mise en oeuvre, faites-le relire par un developpeur
Next.js/PostgreSQL avant un vrai lancement en production.
