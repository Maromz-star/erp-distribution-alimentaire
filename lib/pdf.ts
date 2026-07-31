import jsPDF from "jspdf";

// Genere un PDF (Bon de livraison ou Facture) directement dans le
// navigateur a partir des donnees deja chargees sur la page, et declenche
// le telechargement. Utilise les parametres de l'entreprise (logo, adresse,
// ICE, RC...) ainsi que les informations du client (adresse, ICE, RC).

export type InfoEntreprisePDF = {
  nom: string;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  email?: string | null;
  ice?: string | null;
  identifiantFiscal?: string | null;
  registreCommerce?: string | null;
  logoUrl?: string | null;
};

export type InfoClientPDF = {
  nom: string;
  societe?: string | null;
  adresse?: string | null;
  ville?: string | null;
  ice?: string | null;
  identifiantFiscal?: string | null;
  registreCommerce?: string | null;
};

export type LignePDF = {
  designation: string;
  quantite: string;
  prixUnitaire: string;
  remise: string;
  total: string;
};

export type DocumentPDF = {
  typeDocument: string;
  numero: string;
  date: string;
  entreprise: InfoEntreprisePDF;
  client: InfoClientPDF;
  lignes: LignePDF[];
  sousTotalHT: string;
  totalRemise: string;
  totalTVA: string;
  totalTTC: string;
  montantPaye?: string;
  solde?: string;
};

export function genererPDFDocument(doc: DocumentPDF) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const largeur = pdf.internal.pageSize.getWidth();
  const margeD = largeur - 15;
  let y = 15;

  if (doc.entreprise.logoUrl) {
    try {
      pdf.addImage(doc.entreprise.logoUrl, 15, y, 28, 20);
    } catch {
      // logo illisible : on continue sans bloquer la generation du PDF
    }
  }

  const xTexte = doc.entreprise.logoUrl ? 48 : 15;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.entreprise.nom, xTexte, y + 4);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  let yEntreprise = y + 9;
  const lignesEntreprise = [
    doc.entreprise.adresse ? doc.entreprise.adresse + (doc.entreprise.ville ? ", " + doc.entreprise.ville : "") : null,
    doc.entreprise.telephone ? "Tel: " + doc.entreprise.telephone : null,
    doc.entreprise.email || null,
    doc.entreprise.ice ? "ICE: " + doc.entreprise.ice : null,
    doc.entreprise.identifiantFiscal ? "IF: " + doc.entreprise.identifiantFiscal : null,
    doc.entreprise.registreCommerce ? "RC: " + doc.entreprise.registreCommerce : null,
  ].filter((v): v is string => Boolean(v));
  lignesEntreprise.forEach((ligne) => {
    pdf.text(ligne, xTexte, yEntreprise);
    yEntreprise += 4.2;
  });

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.typeDocument, margeD, 20, { align: "right" });
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("N\u00b0 : " + doc.numero, margeD, 26, { align: "right" });
  pdf.text("Date : " + doc.date, margeD, 31, { align: "right" });

  y = Math.max(yEntreprise, 40) + 4;
  pdf.setDrawColor(200);
  pdf.line(15, y, margeD, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Client :", 15, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text(doc.client.nom, 15, y);
  y += 4.5;
  if (doc.client.societe) {
    pdf.text(doc.client.societe, 15, y);
    y += 4.5;
  }
  if (doc.client.adresse) {
    pdf.text(doc.client.adresse + (doc.client.ville ? ", " + doc.client.ville : ""), 15, y);
    y += 4.5;
  }
  if (doc.client.ice) {
    pdf.text("ICE: " + doc.client.ice, 15, y);
    y += 4.5;
  }
  if (doc.client.identifiantFiscal) {
    pdf.text("IF: " + doc.client.identifiantFiscal, 15, y);
    y += 4.5;
  }
  if (doc.client.registreCommerce) {
    pdf.text("RC: " + doc.client.registreCommerce, 15, y);
    y += 4.5;
  }

  y += 6;

  const colDesignation = 15;
  const colQte = 108;
  const colPrix = 133;
  const colRemise = 158;
  const colTotal = margeD;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Designation", colDesignation, y);
  pdf.text("Qte", colQte, y);
  pdf.text("P.U.", colPrix, y);
  pdf.text("Remise", colRemise, y);
  pdf.text("Total", colTotal, y, { align: "right" });
  y += 2;
  pdf.line(15, y, margeD, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  doc.lignes.forEach((ligne) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(ligne.designation.slice(0, 42), colDesignation, y);
    pdf.text(ligne.quantite, colQte, y);
    pdf.text(ligne.prixUnitaire, colPrix, y);
    pdf.text(ligne.remise, colRemise, y);
    pdf.text(ligne.total, colTotal, y, { align: "right" });
    y += 6;
  });

  y += 4;
  pdf.line(120, y, margeD, y);
  y += 6;

  const lignesTotal: [string, string][] = [
    ["Sous-total HT", doc.sousTotalHT],
    ["Remises", "-" + doc.totalRemise],
    ["TVA", doc.totalTVA],
    ["Total TTC", doc.totalTTC],
  ];
  if (doc.montantPaye !== undefined) lignesTotal.push(["Paye", doc.montantPaye]);
  if (doc.solde !== undefined) lignesTotal.push(["Solde", doc.solde]);

  lignesTotal.forEach(([label, valeur]) => {
    const enGras = label === "Total TTC" || label === "Solde";
    pdf.setFont("helvetica", enGras ? "bold" : "normal");
    pdf.text(label, 140, y);
    pdf.text(valeur, margeD, y, { align: "right" });
    y += 5.5;
  });

  pdf.save(doc.typeDocument.replace(/\s+/g, "_") + "_" + doc.numero + ".pdf");
}
