import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { routeApi, utilisateurCourant } from "@/lib/api-helpers";
import { exigerPermission } from "@/lib/permissions";

const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo par photo

// POST /api/upload (multipart/form-data, champ "fichier") -> { url }
//
// Implementation volontairement simple : stockage sur le disque local du
// serveur, sous /public/uploads. Suffisant pour une seule instance de
// l'application. Si vous deployez sur une plateforme serverless (Vercel...)
// ou avec plusieurs instances, le disque local n'est pas partage/persistant :
// remplacez ce module par un stockage objet (S3, Cloudinary, R2...) - voir
// README section "Prochaines etapes".
export const POST = routeApi(async (request: NextRequest) => {
  const { role } = utilisateurCourant(request);
  exigerPermission(role, "produits.ecrire");

  const formData = await request.formData();
  const fichier = formData.get("fichier");

  if (!(fichier instanceof File)) {
    return NextResponse.json({ erreur: "Aucun fichier recu (champ 'fichier' attendu)" }, { status: 400 });
  }
  if (!TYPES_AUTORISES.includes(fichier.type)) {
    return NextResponse.json(
      { erreur: "Format non supporte. Utilisez JPEG, PNG ou WebP." },
      { status: 400 }
    );
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ erreur: "Fichier trop volumineux (5 Mo max)" }, { status: 400 });
  }

  const dossierUploads = path.join(process.cwd(), "public", "uploads");
  await mkdir(dossierUploads, { recursive: true });

  const extension = fichier.type === "image/png" ? "png" : fichier.type === "image/webp" ? "webp" : "jpg";
  const nomFichier = `${randomUUID()}.${extension}`;
  const cheminComplet = path.join(dossierUploads, nomFichier);

  const octets = Buffer.from(await fichier.arrayBuffer());
  await writeFile(cheminComplet, octets);

  return NextResponse.json({ donnees: { url: `/uploads/${nomFichier}` } }, { status: 201 });
});
