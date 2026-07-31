"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La creation directe d'une facture (vente) sans bon de livraison n'existe
// plus : toute vente doit d'abord passer par un bon de livraison client.
export default function PageRedirectionNouvelleVente() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/bons-livraison-client/nouveau");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-500">
      Redirection vers la creation d'un bon de livraison...
    </div>
  );
}
