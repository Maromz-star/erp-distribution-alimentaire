# Application mobile Android / iOS (via Capacitor)

Ce document decrit comment transformer l'application web (deja deployee sur Vercel) en application native Android et iOS, en utilisant Capacitor.

## Principe

L'app mobile n'est pas une reecriture : elle embarque une WebView native qui charge directement l'URL de production Vercel (voir capacitor.config.ts, cle server.url). Toute la logique (API routes Next.js, authentification par cookie httpOnly, Prisma/Supabase) continue de tourner cote serveur sur Vercel, exactement comme pour la version web. Avantage : aucune duplication de code, toute nouvelle fonctionnalite ajoutee au site web est immediatement disponible dans l'app mobile. Limite a connaitre : necessite une connexion internet, pas de mode hors ligne pour l'instant.

## Etape 1. Preparation locale (a faire sur votre machine)

Ces commandes necessitent Node.js et, selon la plateforme, Android Studio pour Android, ou macOS plus Xcode pour iOS (obligatoire, Apple ne permet pas de compiler une app iOS depuis Windows ou Linux). Lancez dans l'ordre : npm install, puis npx cap add android, puis npx cap add ios (uniquement depuis macOS), puis npx cap sync. Cela genere deux nouveaux dossiers android et ios dans le projet, contenant les projets natifs.

## Etape 2. Personnalisation : icone, splash screen, nom

Remplacez l'icone par defaut dans android/app/src/main/res/ et ios/App/App/Assets.xcassets/. Vous pouvez utiliser l'outil cap:assets (npx @capacitor/assets generate) pour generer automatiquement toutes les tailles a partir d'une seule image source. Le nom affiche et l'identifiant appId sont deja configures dans capacitor.config.ts (com.erpdistribution.alimentaire) ; changez cet identifiant si vous avez deja reserve un autre appId sur les stores.

## Etape 3. Tester sur un appareil ou un emulateur

Utilisez npx cap open android pour ouvrir Android Studio, puis lancez Run. Utilisez npx cap open ios pour ouvrir Xcode sur Mac, puis lancez Run.

## Etape 4. Build de production

Pour Android, dans Android Studio, utilisez Build puis Generate Signed Bundle / APK, creez une cle de signature en la conservant precieusement (elle est necessaire pour toutes les futures mises a jour), puis generez un fichier .aab. Pour iOS, dans Xcode, utilisez Product puis Archive, puis Distribute App pour envoyer vers App Store Connect ; cela necessite un compte Apple Developer payant (99 dollars par an).

## Etape 5. Publication sur les stores

Ces etapes demandent vos propres comptes developpeur, avec identite et paiement verifies par Apple ou Google, et je ne peux pas les realiser a votre place. Pour Google Play Console (compte a 25 dollars, paiement unique), il faut creer une fiche application, uploader le fichier .aab, remplir la politique de confidentialite et les captures d'ecran, puis passer en revue, ce qui prend generalement quelques heures a quelques jours. Pour App Store Connect (compte Apple Developer a 99 dollars par an), il faut creer la fiche application, uploader le build via Xcode ou Transporter, remplir les metadonnees, puis soumettre pour revue, ce qui prend souvent un a trois jours.

## A prevoir avant soumission

Une politique de confidentialite doit etre accessible publiquement, ce qui est obligatoire pour les deux stores. Verifiez aussi que le cookie de session reste bien en secure true, ce qui est deja le cas via Vercel en HTTPS. Enfin, prevoyez un ecran de gestion des erreurs reseau, pour le cas ou l'utilisateur n'a pas de connexion internet dans la WebView.
