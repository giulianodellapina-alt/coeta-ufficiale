import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

export interface AutoMicrochipData {
  microchip: string;
  specieRazza?: string;
  nomeCane?: string;
  proprietarioCognome?: string;
  proprietarioNome?: string;
  proprietarioIndirizzo?: string;
  proprietarioTelefono?: string;
  comune?: string;
  localita?: string;
  fonte: string; // Es. "Controllo Territorio", "1° Sopralluogo", "2° Sopralluogo", "Verbale AI"
}

/**
 * Sincronizza ed estrapola automaticamente un microchip inserito nei verbali o controlli
 * salvandolo nell'Archivio Anagrafe Canina (canine_certificates).
 */
export async function syncMicrochipToArchive(data: AutoMicrochipData): Promise<void> {
  if (!db) return;
  const chipRaw = data.microchip ? String(data.microchip).trim() : "";
  if (!chipRaw || chipRaw.length < 3) return; // Salta se non presente o invalido

  try {
    const certsRef = collection(db, "canine_certificates");
    const q = query(certsRef, where("caneMicrochip", "==", chipRaw));
    const snap = await getDocs(q);

    const fullIndirizzo = data.proprietarioIndirizzo 
      ? data.proprietarioIndirizzo 
      : (data.localita ? `${data.localita} (${data.comune || ""})` : (data.comune || "Massa-Carrara"));

    if (snap.empty) {
      // Crea nuovo certificato anagrafico automaticamente
      await addDoc(certsRef, {
        caneMicrochip: chipRaw,
        caneRazza: data.specieRazza || "Cane",
        caneNome: data.nomeCane || "",
        proprietarioCognome: data.proprietarioCognome || "",
        proprietarioNome: data.proprietarioNome || "",
        proprietarioIndirizzo: fullIndirizzo,
        proprietarioTelefono: data.proprietarioTelefono || "",
        caneSesso: "Sconosciuto",
        caneSitoImpianto: "Collo Sinistro",
        caneNote: `Estrapolato automaticamente da: ${data.fonte} (${new Date().toLocaleDateString("it-IT")})`,
        createdAt: serverTimestamp(),
        creatoDa: "Sincronizzazione Automatica HQ"
      });
      console.log(`[Microchip Sync] Nuovo microchip ${chipRaw} registrato in Anagrafe Canina da ${data.fonte}`);
    } else {
      // Aggiorna scheda esistente se ci sono informazioni aggiuntive
      const existingDoc = snap.docs[0];
      const existingData = existingDoc.data();
      const updates: any = {};

      if (!existingData.caneRazza && data.specieRazza) updates.caneRazza = data.specieRazza;
      if (!existingData.caneNome && data.nomeCane) updates.caneNome = data.nomeCane;
      if (!existingData.proprietarioCognome && data.proprietarioCognome) updates.proprietarioCognome = data.proprietarioCognome;
      if (!existingData.proprietarioIndirizzo && fullIndirizzo) updates.proprietarioIndirizzo = fullIndirizzo;
      if (!existingData.proprietarioTelefono && data.proprietarioTelefono) updates.proprietarioTelefono = data.proprietarioTelefono;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(doc(db, "canine_certificates", existingDoc.id), updates);
        console.log(`[Microchip Sync] Scheda microchip ${chipRaw} aggiornata automaticamente da ${data.fonte}`);
      }
    }
  } catch (err) {
    console.error("[Microchip Sync Error]: Errore durante la sincronizzazione automatica microchip:", err);
  }
}
