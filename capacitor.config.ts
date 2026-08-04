import type { CapacitorConfig } from '@capacitor/cli';

// Cette configuration transforme l'application Next.js deja deployee sur Vercel
// en application native Android / iOS via une WebView Capacitor.
// L'app pointe vers l'URL de production : toutes les fonctionnalites (API routes,
// auth par cookie httpOnly, Prisma/Supabase) restent gerees par le serveur Vercel.
//
// IMPORTANT : remplacez server.url ci-dessous par l'URL de votre deploiement
// Vercel si elle change (ex: domaine personnalise).
const config: CapacitorConfig = {
    appId: 'com.erpdistribution.alimentaire',
    appName: 'ERP Distribution Alimentaire',
    webDir: 'public',
    server: {
          url: 'https://erp-distribution-alimentaire-lime.vercel.app',
          cleartext: false,
          androidScheme: 'https'
    },
    android: {
          allowMixedContent: false
    },
    ios: {
          contentInset: 'automatic'
    }
};

export default config;
