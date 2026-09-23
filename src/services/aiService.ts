export interface VerbaleAIResponse {
  numeroVerbale?: string;
  data?: string;
  oraInizio?: string;
  oraFine?: string;
  tipoVerbale?: "zoofila" | "ittica" | "venatoria";
  verbalizzanti?: string;
  comune?: string;
  provincia?: string;
  localita?: string;
  recatPresso?: string;
  soggettoNome?: string;
  soggettoNatoA?: string;
  soggettoIl?: string;
  soggettoResidenteA?: string;
  soggettoProv?: string;
  soggettoIndirizzo?: string;
  soggettoDocumentoTipo?: string;
  soggettoDocumentoNumero?: string;
  soggettoDocScadenza?: string;
  proprietarioPossessore?: "proprietario" | "detentore" | "possessore";
  tipoAnimale?: string;
  numeroAnimali?: string;
  esito?: "rifiuto" | "consenso";
  constatazioni?: string;
  chips?: { numero: string; nominativo: string }[];
  giorniRegolarizzazione?: number;
}

export const processVerbaleImage = async (base64Image: string): Promise<VerbaleAIResponse | null> => {
  console.log("Inizio analisi AI del verbale tramite server...");
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 secondi timeout

  try {
    const response = await fetch("/api/analyze-verbale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore server: ${response.statusText}`);
      } else {
        const text = await response.text();
        console.error("Risposta server non-JSON (errore):", text.substring(0, 500));
        throw new Error(`Errore server (${response.status}): Risposta non valida.`);
      }
    }

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Risposta server non-JSON (successo?):", text.substring(0, 500));
      throw new Error("Il server ha risposto con un formato non valido (HTML invece di JSON). Prova a ricaricare la pagina.");
    }

    const result = await response.json();
    return result as VerbaleAIResponse;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("L'analisi ha richiesto troppo tempo. Riprova con una foto più piccola o una connessione migliore.");
    }
    console.error("Dettaglio Errore AI (client):", error);
    
    if (error.message?.includes("quota") || error.message?.includes("429")) {
      throw new Error("Limite di richieste raggiunto. Attendi un minuto e riprova.");
    }
    
    throw error;
  }
};
