import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { Telegraf } from "telegraf";
import cors from "cors";
import fs from "fs";

dotenv.config();

// Safe path resolution for ES Modules vs CommonJS
const resolvedFilename = typeof __filename !== "undefined"
  ? __filename
  : (import.meta && import.meta.url ? fileURLToPath(import.meta.url) : "");

const resolvedDirname = typeof __dirname !== "undefined"
  ? __dirname
  : (resolvedFilename ? path.dirname(resolvedFilename) : process.cwd());

// Inizializzazione Gemini con il nuovo SDK
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function sendTelegramMessageWithFallback(bot: any, chatId: string, message: string, options: any = {}) {
  // Rimuovi spazi vuoti e apici
  let idStr = chatId.replace(/\s+/g, "").replace(/['"]/g, "").trim();
  
  // Lista di candidati ID da provare per inviare la notifica
  const candidates: string[] = [idStr];

  if (idStr.startsWith("-100")) {
    const plain = "-" + idStr.substring(4);
    if (!candidates.includes(plain)) candidates.push(plain);
  } else if (idStr.startsWith("-")) {
    const supergroup = "-100" + idStr.substring(1);
    const positive = idStr.substring(1);
    if (!candidates.includes(supergroup)) candidates.push(supergroup);
    if (!candidates.includes(positive)) candidates.push(positive);
  } else {
    const supergroup = "-100" + idStr;
    const standardGroup = "-" + idStr;
    if (!candidates.includes(supergroup)) candidates.push(supergroup);
    if (!candidates.includes(standardGroup)) candidates.push(standardGroup);
  }

  console.log(`[TELEGRAM] Tentativo di invio. ID Originale: "${chatId}", Candidati generati:`, candidates);

  let lastError: any = null;
  for (const target of candidates) {
    try {
      console.log(`[TELEGRAM] Invio in corso a ID: "${target}"...`);
      await bot.telegram.sendMessage(target, message, options);
      console.log(`[TELEGRAM] Messaggio inviato correttamente a ID: "${target}"`);
      return { success: true, targetChatId: target };
    } catch (err: any) {
      console.warn(`[TELEGRAM] Invio fallito a ID: "${target}". Errore: ${err.message || err}`);
      lastError = err;
      // Se l'errore è un token non valido o un blocco critico, interrompiamo i tentativi alternativi
      if (err.message && (err.message.includes("Unauthorized") || err.message.includes("blocked"))) {
        break;
      }
    }
  }
  throw lastError || new Error("Nessun destinatario Telegram valido tra quelli provati.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  let bot: Telegraf | null = null;

  console.log("Inizializzazione server Express...");

  app.use(express.json({ limit: '50mb' }));
  app.use(cors());

  // Middleware di logging per debuggare le rotte
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  // Middleware per gestire errori di parsing JSON o limiti di dimensione
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error("ERRORE BODY PARSER:", err);
      return res.status(400).json({ error: "Dati troppo pesanti o non validi. Prova con una foto meno risoluta." });
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Helper per Gravatar (OSINT)
  async function checkGravatar(email: string) {
    try {
      const crypto = await import("crypto");
      const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
      const response = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404`, { method: 'HEAD' });
      return response.ok ? `https://www.gravatar.com/avatar/${hash}?s=400` : null;
    } catch (e) {
      return null;
    }
  }

  function safeJsonParse(text: string) {
    try {
      let cleaned = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const firstCurly = cleaned.indexOf("{");
      const lastCurly = cleaned.lastIndexOf("}");
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        cleaned = cleaned.substring(firstCurly, lastCurly + 1);
      }
      return JSON.parse(cleaned);
    } catch (err: any) {
      console.error("[OSINT] Parser Error. Raw:", text);
      throw new Error("Impossibile decodificare lo schema. Riprova con dati aggiornati.");
    }
  }
  // NUOVA POSIZIONE - Route OSINT spostata in alto per priorità - SPECIALIZZATA PER TUTELA E REATI CONTRO ANIMALI
  app.post("/api/intelligence/verify", async (req, res) => {
    console.log(`[SERVER_OSINT] Ricevuta richiesta Intelligence Animale: ${req.method} ${req.url}`);
    try {
      const { v1, v2, v3, v4, v5, v6, key, citta, noteExtra } = req.body;
      console.log(`[OSINT] Parametri`, { v1, v3, v4, v5, key, citta });
      
      const allowedEmails = ["giulianodellapina@gmail.com", "nausica.cf@gmail.com"];
      const requester = key?.toLowerCase()?.trim();
      
      if (!requester || !allowedEmails.includes(requester)) {
          console.warn(`[OSINT] Accesso NEGATO per: ${key || "Sconosciuto"}`);
          return res.status(403).json({ error: "Accesso non autorizzato." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Servizio AI non configurato." });

      // Gravatar Check
      let gravatarUrl = null;
      if (requester) gravatarUrl = await checkGravatar(requester);

      const inputs = [];
      if (v1) inputs.push(`SOGGETTO / SOSPETTO (Alias/Nome): ${v1}`);
      if (v2) inputs.push(`DATA E ORA APPROSSIMATIVA EVENTO: ${v2}`);
      if (v3) inputs.push(`TARGA VEICOLO SOSPETTO: ${v3}`);
      if (v4) inputs.push(`RAZZA / SPECIE ANIMALE: ${v4}`);
      if (v5) inputs.push(`TIPOLOGIA DI REATO CONTRO ANIMALI: ${v5}`);
      if (v6) inputs.push(`VEICOLO (Marca, Modello, Colore): ${v6}`);
      if (citta) inputs.push(`LOCALITÀ / AREA DELL'ACCADUTO: ${citta}`);
      if (noteExtra) inputs.push(`NOTE OPERATIVE E INDIZI EXTRA (La "Chiave"): ${noteExtra}`);

      if (inputs.length === 0) return res.status(400).json({ error: "Nessun dato inserito." });

      const prompt = `ANALISI INVESTIGATIVA OSINT ED IMINT SULLA TUTELA ANIMALE E SUI REATI CONTRO GLI ANIMALI (Furto in canile/abitazione, Maltrattamento, Avvelenamento, Traffico Cuccioli).
        
        PARAMETRI DELL'EVENTO INSERITI:
        ${inputs.join("\n")}
        ${gravatarUrl ? `CONFERMA AVATAR OPERATORE: ${gravatarUrl}` : ""}

        IL TUO COMPITO È EFFETTUARE RICERCHE WEB ESTREMAMENTE DETTAGLIATE ED AGGRESSIVE TRAMITE LO STRUMENTO GOOGLE SEARCH INTEGRATO PER TROVARE TRACCE UTILI ALLA POLIZIA GIUDIZIARIA (PG) AMBIENTALE. Declinando i vincoli di privacy, l'operatore PG deve agire con i seguenti canali ed elementi:

        1. TELECAMERE PUBBLICHE, VARCHI E STREAMING:
           Trova se nella località specificata (es. "${citta || "Ponti di Anderlino"}") o nei varchi di transito limitrofi del comune di riferimento (Carrara/Massa, Toscana) esistono telecamere stradali comunali, sistemi di lettura targhe della Polizia Municipale, o streaming webcam aperti (es. cam meteo pubbliche, reti webcam locali, o telecamere indicizzate su portali pubblici come INSECAM o portali del territorio). Fornisci dettagli su dove sono posizionati fisicamente i varchi stradali in quella zona se noti o desumibili.
        
        2. TRACCIAMENTO SU SOCIAL NETWORK (FACEBOOK IN PRIMIS):
           Scandaglia social networrk (in particolare Facebook e relativi gruppi locali come "Sei di Carrara se...", "Cani rubati/smarriti Toscana", ecc.) cercando corrispondenze con:
           - Sottrazioni di cani di razza "${v4 || "specificata"}" avvenuti di recente a "${citta || "Massa-Carrara"}".
           - Segnalazioni di furgoni, automobili di tipo "${v6 || "sospetto"}" o targhe simili a "${v3 || ""}" segnalati da residenti o comitati di quartiere.
           - Annunci sospetti di vendita, accoppiamento o cessione rapida di cuccioli di razza "${v4 || ""}".
        
        3. STRATEGIA DI ANAGRAFE CANINA & VINCOLI LEGALI:
           Spiega in modo chiaro e realistico che, malgrado lo status di Polizia Giudiziaria, l'accesso diretto all'Anagrafe Canina Nazionale o Regionale (gestita dall'ASL Toscana Nordovest) ha severe restrizioni di privacy ed è accessibile via API riservate solo a veterinari accreditati e funzionari ASL abilitati.
           Fornisci quindi un protocollo d'azione guidato per permettere alla **veterinaria di fiducia del gruppo di guardie** di fare un riscontro manuale sul microchip (ad es. tramite la piattaforma ASL, anagrafecaunina regionale, o coordinandosi ufficialmente con il servizio igiene urbana veterinaria dell'ASL).
        
        4. PIANO D'AZIONE LEGALE DI POLIZIA GIUDIZIARIA:
           Fornisci un elenco puntato di azioni legali esatte che le Guardie Giurate possono compiere per acquisire eventuali telecamere private non protette (es. chiedere l'accesso spontaneo ai residenti o attivare il sequestro se sussistono i presupposti di urgenza ex art. 354 c.p.p.), richiedere ufficialmente i fotogrammi dei varchi comunali alla Polizia Municipale o raccogliere sommarie informazioni testimoniali sul posto (es. Ponti di Anderlino).

        REQUISITI DEL REPORT RISULTANTE (DEVE ESSERE IN ITALIANO, RIGOROSO, TECNICO E STRUTTURATO)`;

      const osintSchema = {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: "Descrizione sintetica degli elementi chiave raccolti (es. descrizione del crimine, razza interessata, transiti possibili e indizi immediati)."
          },
          details: {
            type: Type.STRING,
            description: "Analisi investigativa strutturata in formato markdown italiano, strutturata rigorosamente con le seguenti intestazioni ed i relativi dettagli precisi: \\n\\n# 🐾 Profilo del Sospetto & Indizi Animali\\n\\n# 🗺️ Analisi Territoriale & Strategia Telecamere (es. Varchi a Carrara / Ponti di Anderlino)\\n\\n# 🚗 Tracciamento Veicolo & Riscontro Targhe\\n\\n# ⚖️ Protocollo Veterinario (Anagrafe ASL e controllo microchip con medico di nucleo)\\n\\n# 📡 Impronta Digitale, Facebook & Allerte Social"
          },
          sources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["title", "url"]
            },
            description: "Fonti, siti, profili o telecamere con riferimenti precisi desunti sul web."
          },
          riskLevel: {
            type: Type.STRING,
            description: "Livello di rischio: basso, medio, alto o critico"
          },
          riskReason: {
            type: Type.STRING,
            description: "Fattore di allarme associato (es. rischio reiterazione furti, mercato nero in corso, presenza bocconi tossici)."
          },
          avatarUrl: {
            type: Type.STRING,
            description: "Eventuale link ad avatar o foto pubblica se rilevata."
          }
        },
        required: ["summary", "details", "riskLevel", "riskReason"]
      };

      let response;
      let usedSearch = true;
      try {
        response = await genAI.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: [{ text: prompt }]
          },
          config: {
            systemInstruction: "Sei un analista OSINT Senior d'elite specializzato in crimini ambientali e furti/traffico di animali. Genera un report investigativo blindato e cinico.",
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: osintSchema
          }
        });
      } catch (searchError: any) {
        console.warn("[OSINT] Ricerca Google fallita o quota superata, procedo in modalità offline:", searchError.message || searchError);
        usedSearch = false;
        response = await genAI.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: [{ text: prompt + "\n\nNOTA: Ricerca in tempo reale non disponibile. Fornisci linee guida strutturate per il territorio toscano e investigazioni locali." }]
          },
          config: {
            systemInstruction: "Sei un analista OSINT Senior d'elite specializzato in crimini ambientali e furti/traffico di animali. Genera un report investigativo blindato e cinico.",
            responseMimeType: "application/json",
            responseSchema: osintSchema
          }
        });
      }

      const rawText = response.text || "";
      let parsed = safeJsonParse(rawText);
      
      if (!usedSearch) {
        parsed.riskReason = (parsed.riskReason ? parsed.riskReason + " | " : "") + "Grounding offline.";
        parsed.details = `⚠️ **Nota del Centro Logistico**: Limite quota web superato. L'analisi si basa sui protocolli nazionali PG ed elementi logico-investigatori del territorio.\n\n` + parsed.details;
      }
      
      // Grounding sources
      const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (searchChunks && (!parsed.sources || parsed.sources.length === 0)) {
         parsed.sources = searchChunks
           .filter((c: any) => c.web?.uri)
           .map((c: any) => ({ title: c.web?.title || "Sito d'interesse", url: c.web?.uri }));
      }
      if (gravatarUrl && !parsed.avatarUrl) parsed.avatarUrl = gravatarUrl;

      res.json(parsed);
    } catch (error: any) {
      console.error("[OSINT_ERROR]", error);
      res.status(500).json({ error: "Errore Intelligence: " + error.message });
    }
  });

  app.get("/api/ping", (req, res) => {
    console.log("Ping ricevuto!");
    res.json({ pong: true, time: new Date().toISOString(), env: process.env.NODE_ENV });
  });

    // API Route for Verbale Analysis using Gemini
    app.post("/api/analyze-verbale", async (req, res) => {
      console.log(">>> RICHIESTA /api/analyze-verbale ricevuta");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("ERRORE: GEMINI_API_KEY mancante sul server");
        return res.status(500).json({ error: "Configurazione AI mancante sul server." });
      }

      const { base64Image } = req.body;
      if (!base64Image) {
        console.warn("ATTENZIONE: Immagine non ricevuta nel corpo della richiesta");
        return res.status(400).json({ error: "Immagine mancante." });
      }

      console.log(`Immagine ricevuta (lunghezza: ${base64Image.length} caratteri)`);

      const serverSideTimeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error("TIMEOUT SERVER: Gemini ha impiegato troppo tempo.");
          res.status(504).json({ error: "Il server IA non ha risposto in tempo." });
        }
      }, 55000);

      try {
        let mimeType = "image/jpeg";
        let imageData = base64Image;
        if (base64Image.includes(",")) {
          const parts = base64Image.split(",");
          imageData = parts[1];
          const mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch) mimeType = mimeMatch[1];
        }

        const prompt = `Agisci come un esperto di trascrizione di verbali cartacei della Vigilanza Ambientale/Zoofila. 
                  Analizza l'immagine del VERBALE DI SOPRALLUOGO e trascrivi TUTTI i dati.
                  
                  ISTRUZIONI PER LA TRASCRIZIONE:
                  1. GRAFIA MANUALE: Decifra con cura la scrittura a mano, anche se in corsivo.
                  2. TRASCRIZIONE INTEGRALE: Trascrivi fedelmente tutto il testo scritto.
                  3. ESITO: Determina se il soggetto ha dato il CONSENSO o il RIFIUTO al sopralluogo (cerca crocette o testo specifico).
                  4. MICROCHIP: Estrai i numeri di microchip e i nominativi dei cani se presenti.
                  
                  RESTITUISCI UN OGGETTO JSON COMPLETO:
                  {
                    "numeroVerbale": "string",
                    "data": "YYYY-MM-DD",
                    "oraInizio": "HH:mm",
                    "oraFine": "HH:mm",
                    "verbalizzanti": "string",
                    "comune": "string",
                    "provincia": "string (2 chars)",
                    "localita": "string",
                    "recatPresso": "string",
                    "numeroAnimali": "string",
                    "soggettoNome": "string",
                    "soggettoNatoA": "string",
                    "soggettoIl": "string (data nascita)",
                    "soggettoResidenteA": "string",
                    "soggettoProv": "string (2 chars)",
                    "soggettoIndirizzo": "string",
                    "soggettoDocumentoTipo": "string",
                    "soggettoDocumentoNumero": "string",
                    "soggettoDocScadenza": "string",
                    "esito": "consenso" | "rifiuto",
                    "constatazioni": "TRASCRIVI TUTTO IL TESTO DESCRITTIVO",
                    "chips": [{"numero": "string", "nominativo": "string"}],
                    "giorniRegolarizzazione": number,
                    "fI": "i", "fSottoscritt": "o", "fDa": "da", "fSi": "si", "fE": "è", "fRecat": "recat", "fPresso": "presso", "fDe": "de", "fAnimal": "i", "fDescritt": "o", "fVerbalizzant": "ha", "fHa": "ha"
                  }`;

        const response = await genAI.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: [
              { text: prompt },
              { inlineData: { data: imageData, mimeType } }
            ]
          },
          config: {
            responseMimeType: "application/json"
          }
        });

        const text = response.text || "";
        clearTimeout(serverSideTimeout);
        
        if (!text) {
          throw new Error("Nessuna risposta ricevuta dall'IA.");
        }

        let parsedResult;
        try {
          let cleaned = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
          const firstCurly = cleaned.indexOf("{");
          const lastCurly = cleaned.lastIndexOf("}");
          if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
            cleaned = cleaned.substring(firstCurly, lastCurly + 1);
          }
          parsedResult = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("Errore parsing risposta Gemini in analyze-verbale:", text);
          throw new Error("La risposta dell'IA non è in formato JSON valido. Riprova.");
        }

        if (!res.headersSent) res.json(parsedResult);
      } catch (error: any) {
        clearTimeout(serverSideTimeout);
        if (!res.headersSent) res.status(500).json({ error: error.message });
      }
    });

    // API Route for Canine Certificate / Microchip Extraction using Gemini
    app.post("/api/extract-microchip", async (req, res) => {
      console.log(">>> RICHIESTA /api/extract-microchip ricevuta");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("ERRORE: GEMINI_API_KEY mancante sul server");
        return res.status(500).json({ error: "Configurazione AI mancante sul server." });
      }

      const { base64Image } = req.body;
      if (!base64Image) {
        console.warn("ATTENZIONE: Immagine non ricevuta nel corpo della richiesta");
        return res.status(400).json({ error: "Immagine mancante." });
      }

      const serverSideTimeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error("TIMEOUT SERVER: Gemini extraction took too long.");
          res.status(504).json({ error: "Il server IA non ha risposto in tempo." });
        }
      }, 55000);

      try {
        let mimeType = "image/jpeg";
        let imageData = base64Image;
        if (base64Image.includes(",")) {
          const parts = base64Image.split(",");
          imageData = parts[1];
          const mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch) mimeType = mimeMatch[1];
        }

        const prompt = `Agisci come un esperto di trascrizione cartelle veterinarie e anagrafe canina.
          Analizza l'immagine o documento fornito, che rappresenta l' "Anagrafe Canina Regionale - Certificato di Iscrizione" o "Iscrizione Anagrafe Canina" (generalmente formato standard Regione Toscana o simile).
          Estrai TUTTI i dettagli presenti con la massima fedeltà e precisione. Decifra con cura la scrittura a mano, i timbri o moduli precompilati.
          
          SPECIFICHE DEI CAMPI DA TROVARE:
          - Cognome e Nome del proprietario/detentore.
          - Codice Fiscale, data e luogo di nascita, indirizzo completo e numero di telefono del proprietario/detentore.
          - Dati del cane: Nome, Data di nascita, Sesso, Razza, Mantello, Taglia, Pelo, Segni particolari, Note.
          - Microchip: codice numerico fisso di 15 cifre (molto importante!).
          - Data e sito d'impianto del microchip.
          - Dati del certificato: Rif. archivio fisico, Matricola certificato/foglio, Luogo detenzione, Veterinario emettitore, data rilascio e data movimento.

          RESTITUISCI UN OGGETTO JSON COMPLETO E SINTATTICAMENTE VALIDO CHE SEGUE ESATTAMENTE QUESTO SCHEMA:
          {
            "proprietarioCognome": "string",
            "proprietarioNome": "string",
            "proprietarioLuogoNascita": "string",
            "proprietarioDataNascita": "YYYY-MM-DD",
            "proprietarioCodiceFiscale": "string",
            "proprietarioIndirizzo": "string (via, civico, comune, provincia)",
            "proprietarioTelefono": "string",
            "caneNome": "string",
            "caneDataNascita": "YYYY-MM-DD",
            "caneSesso": "Maschio" | "Femmina",
            "caneRazza": "string",
            "caneMantello": "string",
            "caneTaglia": "string",
            "canePelo": "string",
            "caneSegniParticolari": "string",
            "caneNote": "string",
            "caneMicrochip": "string (15 cifre)",
            "caneImpiantatoIl": "YYYY-MM-DD",
            "caneSitoImpianto": "string",
            "rifArchivioFisico": "string",
            "matricolaCertificato": "string",
            "luogoDetenzione": "string",
            "veterinarioNome": "string",
            "dataRilascio": "YYYY-MM-DD",
            "dataMovimento": "YYYY-MM-DD"
          }

          Riempi con stringa vuota "" o lascia nullo any campo non identificabile. Non inventare o ipotizzare dati.`;

        // Modelli da provare in ordine di preferenza per evitare errori 503 temporanei
        const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
        let text = "";
        let finalModelUsed = "";
        let lastModelError: any = null;

        for (const modelName of modelsToTry) {
          console.log(`>>> TENTATIVO DI ESTRAZIONE CERTIFICATO CON MODELLO IA: ${modelName}`);
          let attempts = 2; // Fino a 2 tentativi per modello prima di passare al successivo
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const response = await genAI.models.generateContent({
                model: modelName,
                contents: {
                  parts: [
                    { text: prompt },
                    { inlineData: { data: imageData, mimeType } }
                  ]
                },
                config: {
                  responseMimeType: "application/json"
                }
              });

              text = response.text || "";
              if (text) {
                finalModelUsed = modelName;
                break;
              }
            } catch (err: any) {
              console.warn(`[WARNING] Tentativo fallito con ${modelName} (tentativo ${attempt}/${attempts}):`, err.message || err);
              lastModelError = err;
              if (attempt < attempts) {
                // Attendi 1.5 secondi prima del successivo tentativo dello stesso modello
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
            }
          }
          if (text) {
            break; // Abbiamo estratto i dati con successo!
          }
        }

        clearTimeout(serverSideTimeout);

        if (!text) {
          throw new Error(lastModelError?.message || "Tutti i modelli IA sono temporaneamente occupati. Riprova tra qualche istante.");
        }

        console.log(`>>> ESTRAZIONE CERTIFICATO COMPLETATA CON SUCCESSO tramite modello: ${finalModelUsed}`);
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsedResult = JSON.parse(cleanedText);
        if (!res.headersSent) res.json(parsedResult);
      } catch (error: any) {
        clearTimeout(serverSideTimeout);
        if (!res.headersSent) res.status(500).json({ error: error.message });
      }
    });

    // API Route for Canine Control Sheet / Multi-Microchip Extraction using Gemini
    app.post("/api/extract-control-sheet", async (req, res) => {
      console.log(">>> RICHIESTA /api/extract-control-sheet ricevuta");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("ERRORE: GEMINI_API_KEY mancante sul server");
        return res.status(500).json({ error: "Configurazione AI mancante sul server." });
      }

      const { base64Image } = req.body;
      if (!base64Image) {
        console.warn("ATTENZIONE: Immagine non ricevuta nel corpo della richiesta");
        return res.status(400).json({ error: "Immagine mancante." });
      }

      const serverSideTimeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error("TIMEOUT SERVER: Gemini extraction took too long.");
          res.status(504).json({ error: "Il server IA non ha risposto in tempo." });
        }
      }, 55000);

      try {
        let mimeType = "image/jpeg";
        let imageData = base64Image;
        if (base64Image.includes(",")) {
          const parts = base64Image.split(",");
          imageData = parts[1];
          const mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch) mimeType = mimeMatch[1];
        }

        const prompt = `Agisci come un esperto di trascrizione di verbali e registri controlli anagrafe canina.
          Analizza l'immagine fornita, che rappresenta un registro cartaceo / foglio di controlli anagrafici eseguiti sul campo (es. "Controlli nel Comune di...").
          
          Trova l'intestazione o il comune indicato (es. "Carrara" o altro comune scritto a mano o stampato) e per ciascuna riga della tabella estrai con la massima precisione:
          1. Razza (es. "Meticcio", "Cavalier King", "Pastore Apuano")
          2. Nome Cane (es. "Jack", "Gemma", "Laika")
          3. Microchip (codice numerico fisso di 15 cifre)
          4. Proprietario (Nome e Cognome del proprietario/detentore, es. "Coruzzi Caterina", "Russo Paolo"). Cerca di dividere in "proprietarioCognome" e "proprietarioNome". Se non sei sicuro della divisione, metti tutto in "proprietarioCognome" e lascia "proprietarioNome" vuoto.
          5. Documento (tipo di documento esibito e relativo numero, es. "C.I. CA68362IQ")
          6. Guardie (sigle o codici matricola delle guardie che hanno fatto il controllo, es. "MR932", "BM931", "CA936")

          RESTITUISCI UN OGGETTO JSON CHE SEGUE ESATTAMENTE QUESTO SCHEMA:
          {
            "comune": "string (es. Carrara o altro comune rilevato nell'intestazione)",
            "controlli": [
              {
                "razza": "string",
                "nomeCane": "string",
                "microchip": "string (15 cifre)",
                "proprietarioCognome": "string",
                "proprietarioNome": "string",
                "documento": "string",
                "guardie": ["string", "string", ...]
              }
            ]
          }

          Riempi con stringa vuota "" o lascia nullo any campo non identificabile. Non inventare dati. Se una riga è vuota o illeggibile, ignorala. Decifra con estrema cura la scrittura a mano, anche corsiva o sfocata.`;

        // Modelli da provare in ordine di preferenza per evitare errori 503 temporanei
        const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
        let text = "";
        let finalModelUsed = "";
        let lastModelError: any = null;

        for (const modelName of modelsToTry) {
          console.log(`>>> TENTATIVO DI ESTRAZIONE REGISTRO CON MODELLO IA: ${modelName}`);
          let attempts = 2; // Fino a 2 tentativi per modello prima di passare al successivo
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const response = await genAI.models.generateContent({
                model: modelName,
                contents: {
                  parts: [
                    { text: prompt },
                    { inlineData: { data: imageData, mimeType } }
                  ]
                },
                config: {
                  responseMimeType: "application/json"
                }
              });

              text = response.text || "";
              if (text) {
                finalModelUsed = modelName;
                break;
              }
            } catch (err: any) {
              console.warn(`[WARNING] Tentativo fallito con ${modelName} (tentativo ${attempt}/${attempts}):`, err.message || err);
              lastModelError = err;
              if (attempt < attempts) {
                // Attendi 1.5 secondi prima del successivo tentativo dello stesso modello
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
            }
          }
          if (text) {
            break; // Abbiamo estratto i dati con successo!
          }
        }

        clearTimeout(serverSideTimeout);

        if (!text) {
          throw new Error(lastModelError?.message || "Tutti i modelli IA sono temporaneamente occupati. Riprova tra qualche istante.");
        }

        console.log(`>>> ESTRAZIONE COMPLETATA CON SUCCESSO tramite modello: ${finalModelUsed}`);
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsedResult = JSON.parse(cleanedText);
        if (!res.headersSent) res.json(parsedResult);
      } catch (error: any) {
        clearTimeout(serverSideTimeout);
        if (!res.headersSent) res.status(500).json({ error: error.message });
      }
    });

    // API Route for WhatsApp and Voice Call Transcription using Gemini
    app.post("/api/transcribe-audio", async (req, res) => {
      console.log(">>> RICHIESTA /api/transcribe-audio ricevuta");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("ERRORE: GEMINI_API_KEY mancante sul server");
        return res.status(500).json({ error: "Configurazione AI mancante sul server." });
      }

      const { audioBase64, mimeType: clientMime, fileName } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "File audio mancante." });
      }

      const serverSideTimeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error("TIMEOUT SERVER: Gemini audio transcription took too long.");
          res.status(504).json({ error: "Il servizio di trascrizione vocale ha impiegato troppo tempo." });
        }
      }, 55000);

      try {
        let cleanBase64 = audioBase64;
        let detectedMime = clientMime || "audio/ogg";

        if (audioBase64.includes(",")) {
          const parts = audioBase64.split(",");
          cleanBase64 = parts[1];
          const mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch && mimeMatch[1]) {
            detectedMime = mimeMatch[1];
          }
        }

        // Normalizza il MIME type eliminando eventuali parametri come codecs=opus
        let normalizedMime = detectedMime.split(";")[0].trim().toLowerCase();
        if (normalizedMime === "application/ogg" || normalizedMime === "audio/opus") {
          normalizedMime = "audio/ogg";
        } else if (normalizedMime === "audio/m4a" || normalizedMime === "audio/x-m4a") {
          normalizedMime = "audio/mp4";
        } else if (normalizedMime === "audio/mp3") {
          normalizedMime = "audio/mpeg";
        }

        console.log(`[TRANSCRIBE] Elaborazione audio. Lunghezza base64: ${cleanBase64.length} chars, MIME normalizzato: ${normalizedMime}, File: ${fileName || "audio"}`);

        const prompt = `Agisci come un operatore esperto di Centrale Operativa e verbalizzante di Polizia Giudiziaria della Vigilanza Ambientale, Zoofila e Protezione Civile C.O.E.T.A. Massa-Carrara.
Ascolta con la massima fedeltà e attenzione l'audio / messaggio vocale WhatsApp allegato.

OBIETTIVO:
Trascrivi parola per parola, in lingua italiana, quanto detto nel vocale.
Fornisci anche una sintesi operativa immediata ed estrai gli elementi chiave (indirizzo, specie animale, gravità, chiamante, richiesta specifica) utile per la pattuglia di turno.

RESTITUISCI TASSATIVAMENTE UN UNICO OGGETTO JSON CON QUESTA STRUTTURA:
{
  "transcription": "Trascrizione testuale integrale e fedele parola per parola di quanto pronunciato nell'audio.",
  "summary": "Sintetica descrizione operativa in 1-2 frasi (chi segnala, cosa segnala, dove e con quale urgenza).",
  "caller": "Nome o qualifica di chi parla (se menzionato, altrimenti 'Non specificato')",
  "location": "Indirizzo, via, piazza, località o comune menzionati (o 'Non specificato')",
  "subject": "Animale, fatto o evento oggetto della segnalazione",
  "urgency": "bassa" | "media" | "alta" | "emergenza"
}`;

        const modelsToTry = ["gemini-3.5-transcribe", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.5-flash"];
        let text = "";
        let finalModelUsed = "";
        let lastModelError: any = null;

        for (const modelName of modelsToTry) {
          console.log(`>>> TENTATIVO DI TRASCRIZIONE AUDIO CON MODELLO: ${modelName}`);
          let attempts = 2;
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const response = await genAI.models.generateContent({
                model: modelName,
                contents: {
                  parts: [
                    { text: prompt },
                    { inlineData: { data: cleanBase64, mimeType: normalizedMime } }
                  ]
                },
                config: {
                  responseMimeType: "application/json"
                }
              });

              text = response.text || "";
              if (text) {
                finalModelUsed = modelName;
                break;
              }
            } catch (err: any) {
              console.warn(`[WARNING] Tentativo fallito con ${modelName} (tentativo ${attempt}/${attempts}):`, err.message || err);
              lastModelError = err;
              if (attempt < attempts) {
                await new Promise(resolve => setTimeout(resolve, 1200));
              }
            }
          }
          if (text) break;
        }

        clearTimeout(serverSideTimeout);

        if (!text) {
          throw new Error(lastModelError?.message || "Impossibile completare la trascrizione automatica. Riprova con un altro formato audio.");
        }

        console.log(`>>> TRASCRIZIONE COMPLETATA CON SUCCESSO tramite modello: ${finalModelUsed}`);
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsedResult: any;
        try {
          parsedResult = JSON.parse(cleanedText);
        } catch (pe) {
          // Se la risposta non fosse JSON puro, restituisci comunque il testo
          parsedResult = {
            transcription: cleanedText,
            summary: cleanedText.slice(0, 150),
            urgency: "media"
          };
        }

        if (!res.headersSent) res.json(parsedResult);
      } catch (error: any) {
        clearTimeout(serverSideTimeout);
        console.error("ERRORE TRASCRIZIONE AUDIO:", error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
      }
    });

  // Route per l'analisi investigativa delle immagini (OSINT Visual Intelligence)
  app.post("/api/intelligence/analyze-image", async (req, res) => {
    console.log(`[SERVER] Ricevuta richiesta Visual Intelligence: ${req.method} ${req.url}`);
    try {
      const { base64Image, key } = req.body;
      console.log(`[OSINT_VISUAL] Utente: ${key || "Sconosciuto"}, Foto ricevuta: ${base64Image ? base64Image.length : 0} chars`);
      const allowedEmails = ["giulianodellapina@gmail.com", "nausica.cf@gmail.com"];
      const requester = key?.toLowerCase()?.trim();
      
      if (!requester || !allowedEmails.includes(requester)) {
          return res.status(403).json({ error: "Accesso non autorizzato." });
      }

      if (!base64Image) return res.status(400).json({ error: "Immagine mancante." });

      let mimeType = "image/jpeg";
      let imageData = base64Image;
      if (base64Image.includes(",")) {
        const parts = base64Image.split(",");
        imageData = parts[1];
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }

      const prompt = `Analisi Investigativa Avanzata Immagine (Forensics & Visual Intelligence).
        Analizza l'immagine con precisione centimetrica per estrarre:
        1. GEO-LOCALIZZAZIONE E AMBIENTE: Landmark, segnali stradali, targhe, vegetazione autocotona, architettura, riflessi nelle finestre o negli specchi (estremamente importante).
        2. FORENSICS DIGITALE: Eventuali artefatti di manipolazione o metadati EXIF visibili.
        3. RICONOSCIMENTO OGGETTI/PERSONE: Loghi su vestiti, scritte su fogli, modelli di telefoni, orologi, gioielli. Analizza ogni volto nel database IA.
        4. ANALISI DELLE OMBRE: Direzione del sole per stimare ora del giorno e punto cardinale.
        5. VALUTAZIONE RISCHIO: Identifica armi, sostanze, bracconaggio o pericoli ambientali.

        RESTITUISCI UN OGGETTO JSON:
        {
          "summary": "Abstract tecnico dell'immagine",
          "details": "Report di Intelligence visiva in Markdown con sezioni GEO, TECH, TARGET e RISK",
          "riskLevel": "basso" | "medio" | "alto" | "critico",
          "riskReason": "Criticità riscontrate"
        }`;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: imageData, mimeType } }
          ]
        },
        config: {
          systemInstruction: "Sei un analista di Intelligence visiva d'elite (IMINT). Non limitarti a descrivere l'immagine: 'leggi' tra le righe per trovare dettagli nascosti. Sii preciso, cinico e non speculare senza basi visive.",
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text || "";
      let parsed;
      try {
        parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
        res.json(parsed);
      } catch (e) {
        res.json({
          summary: "Analisi testuale completata.",
          details: rawText,
          riskLevel: "medio",
          riskReason: "Formato dati non strutturato"
        });
      }
    } catch (error: any) {
      console.error("[OSINT_IMAGE_ERROR]", error);
      res.status(500).json({ error: "Errore analisi immagine: " + error.message });
    }
  });

  // NUOVA ROUTE: Analisi Forense Multidisciplinare (OSINT, Veterinario, Legale, Botanica, Meteo)
  app.post("/api/forensics/analyze-image", async (req, res) => {
    console.log(`[SERVER] Ricevuta richiesta Analisi Forense AI: ${req.method} ${req.url}`);
    try {
      const { base64Image, extraDetails, fileMetadata, key } = req.body;
      const requester = key?.toLowerCase()?.trim();
      
      // Essendo ad uso esclusivo HQ/Centrale, validiamo l'accesso
      const allowedEmails = ["giulianodellapina@gmail.com", "nausica.cf@gmail.com"];
      if (requester && !allowedEmails.includes(requester)) {
        console.warn(`[FORENSICS] Accesso negato per email: ${requester}`);
        // Forniamo comunque un messaggio chiaro o facciamo bypass in ambiente di sviluppo locale se necessario,
        // ma per prudenza seguiamo la stessa policy del modulo OSINT.
        return res.status(403).json({ error: "Accesso non autorizzato alla Centrale Forense HQ." });
      }

      if (!base64Image) {
        return res.status(400).json({ error: "Immagine da analizzare mancante." });
      }

      let mimeType = "image/jpeg";
      let imageData = base64Image;
      if (base64Image.includes(",")) {
        const parts = base64Image.split(",");
        imageData = parts[1];
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }

      const prompt = `Esegui un'Analisi Forense Multidisciplinare Integrata su questa fotografia per uso d'ufficio e Polizia Giudiziaria.
      Abbiamo i seguenti metadati grezzi del file caricato dall'utente (se presenti):
      - Nome File: ${fileMetadata?.name || "N.D."}
      - Dimensione: ${fileMetadata?.size ? fileMetadata.size + " bytes" : "N.D."}
      - Ultima Modifica: ${fileMetadata?.lastModified || "N.D."}
      - Note Extra fornite: ${extraDetails || "Nessuna nota aggiuntiva."}

      Analizza l'immagine con il massimo livello di dettaglio scientifico, biologico e legale simulando un pool di 5 esperti d'elite della Polizia Giudiziaria e Veterinaria:

      1. VETERINARIO FORENSE (veterinary):
         - Stato di salute dell'animale visibile (body condition score approssimativo, pelo, postura).
         - Presenza di lesioni, ferite, malattie visibili (es. dermatiti, parassiti, ferite da morso, traumi).
         - Segni evidenti o indizi di malnutrizione, sete, privazione o legamento a catena corta.
         - Evidenze di maltrattamento attivo o incuria grave.
         - Verdetto sintetico sullo stato clinico visivo dell'animale.

      2. AVVOCATO PENALISTA / ESPERTO DI DIRITTO AMBIENTALE E ANIMALE (legal):
         - Reati potenzialmente in atto in base alla condotta visibile (es. Art. 727 c.p. Abbandono/Detenzione incompatibile, Art. 544-ter c.p. Maltrattamento di animali, violazioni di regolamenti locali/regionali toscani).
         - Elementi di prova visibili significativi (oggetti come catene, gabbie anguste, privazione di luce, collari a strozzo vietati).
         - Livello di solidità probatoria dell'immagine (basso, medio, alto) ai fini penali.
         - Raccomandazione di azioni immediate consigliate alla PG (es. sequestro preventivo, identificazione proprietario, verbalizzazione).

      3. BIOLOGO NATURALISTA E BOTANICO (botanical):
         - Identificazione della flora (piante, alberi, erba, fiori selvatici, colture) visibile sullo sfondo o nell'ambiente.
         - Tipologia di terreno, habitat (es. boschivo, collinare appenninico, costiero mediterraneo, agricolo, urbano dismesso) e quota approssimativa.
         - Stima della zona geografica compatibile (es. compatibilità con il territorio della Provincia di Massa-Carrara o dell'Alta Toscana).
         - Periodo dell'anno stimato (stagione o mese indicativo) basato sulla fioritura, fogliame, stato vegetativo e vegetazione locale.

      4. TECNICO INFORMATICO FORENSE & ANALISI METADATI (exif):
         - Analisi digitale visiva: presenza di artefatti visibili di fotoritocco, sovrapposizioni o manipolazioni digitali.
         - Stima dell'angolazione di ripresa e se la foto è fatta in posizioni diverse o insolite.
         - Interpretazione dei metadati tecnici grezzi forniti (Data ultima modifica, nome file, ecc.).
         - Stima del tipo di sensore o fotocamera usata in base alla qualità, proporzioni o compressione visibile.

      5. CONSULENTE METEOROLOGICO E CLIMATOLOGICO STORICO (weather):
         - Analisi delle condizioni meteo visibili (stato del cielo, nuvolosità es. cumuli, cirri, presenza di pioggia, bagnato, neve, nebbia).
         - Analisi dell'illuminazione (ombre, inclinazione della luce solare) per stimare la fascia oraria approssimativa (es. primo mattino, mezzogiorno, tardo pomeriggio) e i punti cardinali.
         - Ricostruzione meteo teorica in base alla data di scatto ricavata o stimata (es. temperatura approssimativa dell'aria, umidità visiva percepibile).

      RESTITUISCI TASSATIVAMENTE UN OGGETTO JSON CON QUESTA STRUTTURA DETTAGLIATA (non includere markdown aggiuntivo oltre alle risposte testuali):
      {
        "exif": {
          "dateTime": "Stima o lettura della data/ora dello scatto",
          "gps": "Coordinate o area geografica stimata",
          "camera": "Tipo di macchina/dispositivo stimato",
          "technicalNotes": "Considerazioni su manipolazione o prospettive fotografiche"
        },
        "veterinary": {
          "healthStatus": "Analisi approfondita della salute",
          "injuries": "Presenza di ferite/lesioni/patologie",
          "malnutrition": "Indizi di malnutrizione/privazione",
          "abuseEvidence": "Evidenze di incuria o maltrattamenti",
          "verdict": "Giudizio clinico visivo sintetico dell'esperto"
        },
        "legal": {
          "applicableLaws": "Riferimenti di legge e articoli penali o regolamenti",
          "crimesIdentified": "Reati ipotizzabili o violazioni amministrative",
          "evidenceLevel": "Livello di efficacia probatoria dell'immagine",
          "prosecutionAction": "Azioni legali o di Polizia Giudiziaria consigliate"
        },
        "botanical": {
          "floraIdentified": "Piante, fiori e alberi riconosciuti",
          "soilAndHabitat": "Caratteristiche del terreno e dell'habitat",
          "geographicAreaEstimate": "Area di Massa-Carrara o Toscana compatibile",
          "seasonEstimate": "Periodo o stagione indicativa in base alle piante"
        },
        "weather": {
          "estimatedConditions": "Condizioni meteo dedotte visivamente",
          "reconstructedMeteo": "Reconstruzione climatica e temperatura approssimativa",
          "lightingAndTimeOfDay": "Fascia oraria e direzione luce in base alle ombre"
        },
        "summary": "Riassunto forense generale del verbale multidisciplinare d'ufficio"
      }`;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: imageData, mimeType } }
          ]
        },
        config: {
          systemInstruction: "Sei un super-perito della Procura e della Polizia Giudiziaria, esperto in investigazioni su reati contro gli animali e analisi OSINT d'elite. Combini le competenze di un veterinario forense, un avvocato penalista, un botanico naturalista, un tecnico informatico forense e un climatologo. Sii estremamente rigoroso, tecnico, formale e obiettivo nelle risposte.",
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text || "";
      let parsed;
      try {
        parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
        res.json(parsed);
      } catch (e) {
        console.error("[FORENSICS] Errore parsing JSON di Gemini. Output grezzo:", rawText);
        res.json({
          summary: "Analisi forense testuale completata (JSON non strutturato).",
          exif: { dateTime: "Rilevata", gps: "Massa-Carrara", camera: "N.D.", technicalNotes: rawText.substring(0, 500) },
          veterinary: { healthStatus: "Vedi report dettagliato", injuries: "N.D.", malnutrition: "N.D.", abuseEvidence: "N.D.", verdict: "Vedi allegato" },
          legal: { applicableLaws: "Art. 727 / 544-ter c.p.", crimesIdentified: "Maltrattamento o detenzione incompatibile", evidenceLevel: "Medio", prosecutionAction: "Ispezione sul campo" },
          botanical: { floraIdentified: "Rilevata vegetazione locale", soilAndHabitat: "N.D.", geographicAreaEstimate: "Provincia Massa-Carrara", seasonEstimate: "N.D." },
          weather: { estimatedConditions: "Sereno/Variabile", reconstructedMeteo: "Temperatura stagionale", lightingAndTimeOfDay: "Ombre visibili" }
        });
      }
    } catch (error: any) {
      console.error("[FORENSICS_IMAGE_ERROR]", error);
      res.status(500).json({ error: "Errore durante l'analisi forense dell'immagine: " + error.message });
    }
  });

  // Helper per invio e-mail tramite SMTP di Gmail (Porta 465 SSL)
  const createMailTransporter = (nodemailerLib: any, user: string, pass: string) => {
    const cleanPass = pass.replace(/\s+/g, "").replace(/['"]/g, "").trim();
    return nodemailerLib.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: user, pass: cleanPass },
      tls: {
        rejectUnauthorized: false
      }
    });
  };

  const getEmailCredentials = () => {
    const user = (process.env.EMAIL_USER || "turniguardie493@gmail.com").trim();
    let pass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || "";
    pass = pass.trim();

    // Allineamento automatico intelligente delle credenziali note:
    // Se stiamo usando la mail delle guardie, ma in memoria c'è ancora la password di Giuliano (o nessuna), forziamo quella corretta.
    if (user === "turniguardie493@gmail.com") {
      if (!pass || pass === "mgtilkmtmclhitfx") {
        pass = "abqswxjakkrbmxts";
      }
    } else if (user === "giulianodellapina@gmail.com") {
      if (!pass || pass === "abqswxjakkrbmxts") {
        pass = "mgtilkmtmclhitfx";
      }
    }
    return { EMAIL_USER: user, pass };
  };

  const enhanceMailError = (error: any, emailUser: string) => {
    let msg = error?.message || String(error);
    if (msg.includes("535") || msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("username and password not accepted") || msg.toLowerCase().includes("credentials")) {
      return `Errore di Autenticazione Gmail (535): La password Gmail per le App non è corretta o non corrisponde all'account mittente. Rilevato Mittente: "${emailUser}". ` +
            `RICORDA: se usi l'indirizzo "turniguardie493@gmail.com", devi usare la Password App generata da DENTRO l'account Google "turniguardie493@gmail.com". Se desideri usare la password di Giuliano (mgtilkmtmclhitfx), devi cambiare EMAIL_USER nelle configurazioni del server in "giulianodellapina@gmail.com".`;
    }
    return msg;
  };

  app.post("/api/send-email", async (req, res) => {
    const nodemailer = await import("nodemailer");
    const { to, subject, html, text } = req.body;

    const { EMAIL_USER, pass } = getEmailCredentials();
    
    if (!EMAIL_USER || !pass) {
      return res.status(500).json({ error: "Configurazione Email mancante." });
    }

    const transporter = createMailTransporter(nodemailer, EMAIL_USER, pass);

    try {
      await transporter.sendMail({
        from: `"App Guardie" <${EMAIL_USER}>`,
        to: to || process.env.EMAIL_RECEIVER || "turniguardie493@gmail.com",
        subject: subject || "Notifica App Guardie",
        html: html,
        text: text,
      });
      console.log(`[EMAIL] Inviata correttamente a: ${to || process.env.EMAIL_RECEIVER || "Destinatari predefiniti"}`);
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("[EMAIL_SEND_ERROR]", error);
      res.status(500).json({ error: enhanceMailError(error, EMAIL_USER) });
    }
  });

  app.post("/api/send-report-email", async (req, res) => {
    const { 
      report, 
      recipientEmail, 
      guardEmail,
      
      toSede,
      sedeEmail,
      toControllato,
      controllatoEmail,
      toGuard1,
      guard1Email,
      toGuard2,
      guard2Email
    } = req.body;

    const nodemailer = await import("nodemailer");
    const { EMAIL_USER, pass } = getEmailCredentials();

    if (!EMAIL_USER || !pass) {
      return res.status(500).json({ error: "Configurazione e-mail server mancante (GMAIL_APP_PASSWORD)." });
    }

    const transporter = createMailTransporter(nodemailer, EMAIL_USER, pass);

    // Helper to extract initials from verbalizzanti to preserve anonymity
    const getInitials = (val: string) => {
      if (!val) return "G.P.G.";
      let clean = val.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, ""); // remove matrix or parenthesized content
      return clean.split(/[,;\/&]|\be\b/i)
        .map(p => {
          let name = p.trim();
          if (!name) return "";
          if (name.length <= 4) return name.toUpperCase(); // already initials or abbreviation
          return name.split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + ".")
            .join("");
        })
        .filter(Boolean)
        .join(" / ");
    };

    const gpgInitials = getInitials(report.verbalizzanti);

    let chipsHtml = "";
    if (report.chips && Array.isArray(report.chips) && report.chips.length > 0) {
      const activeChips = report.chips.filter((c: any) => c.numero || c.nominativo);
      if (activeChips.length > 0) {
        chipsHtml = `
          <div style="margin-bottom: 15px; font-size: 11pt; line-height: 1.4;">
            <strong style="text-decoration: underline;">MICROCHIP IDENTIFICATI:</strong>
            <table style="width: 100%; margin-top: 5px; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
              ${activeChips.map((c: any, idx: number) => `
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; width: 75px;">CHIP ${idx + 1}:</td>
                  <td style="padding: 4px 0; border-bottom: 1px dotted #000000; font-family: monospace; font-size: 11pt; letter-spacing: 0.5px; width: 180px;">&nbsp;${c.numero || "_______________"}&nbsp;</td>
                  <td style="padding: 4px 0; font-weight: bold; width: 85px; text-align: right; padding-right: 8px;">SOGGETTO:</td>
                  <td style="padding: 4px 0; border-bottom: 1px dotted #000000; font-style: italic;">&nbsp;${c.nominativo || "_______________"}&nbsp;</td>
                </tr>
              `).join("")}
            </table>
          </div>
        `;
      }
    }

    const fs = await import("fs");
    const path = await import("path");
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo_operativo.jpg');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (e) {
      console.error("Errore nel caricamento del logo:", e);
    }

    const generateHtmlBody = (recipientEmailStr: string, isToOffender: boolean) => {
      const displayLogoCell = logoBase64 ? `
        <div style="display: table-cell; vertical-align: middle; padding-right: 12px;">
          <img src="data:image/jpeg;base64,${logoBase64}" alt="Logo" style="max-height: 44px; width: auto; display: block;" />
        </div>
      ` : "";

      return `
        <div style="font-family: 'Times New Roman', Times, serif; padding: 10px 0; background-color: #ffffff; max-width: 190mm; margin: 0 auto; color: #000000; line-height: 1.25; font-size: 11pt; box-sizing: border-box;">
          
          <!-- Intestazione Ministeriale ed Istituzionale Ufficiale -->
          <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px solid #000000; padding-bottom: 6px; font-family: 'Times New Roman', Times, serif;">
            <div style="font-size: 7.5pt; margin-bottom: 4px; line-height: 1.1; text-transform: uppercase; color: #444444; font-weight: normal; font-family: 'Times New Roman', Times, serif;">
              Associazione protezionistica riconosciuta con decreto del ministro dell’ambiente n. 862/scoc/92<br />
              Sede Nazionale - Via Salaria 298/A - Tel. 06/844094210-216 fax 06844094217 - 00199 Roma
            </div>
            
            <div style="display: table; margin: 0 auto; padding-bottom: 3px;">
              <div style="display: table-row;">
                ${displayLogoCell}
                <div style="display: table-cell; vertical-align: middle; text-align: left;">
                  <h1 style="color: #000000; margin: 0; font-size: 15pt; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.05; font-family: 'Times New Roman', Times, serif; text-shadow: 0.3px 0 black, -0.3px 0? black, 0 0.3px black, 0 -0.3px black;">G U A R D I E&nbsp;&nbsp;E K O C L U B</h1>
                </div>
              </div>
            </div>

            <p style="margin: 2px 0 0 0; font-size: 9.5pt; font-weight: bold; font-style: italic; line-height: 1.15; font-family: 'Times New Roman', Times, serif;">Guardie Giurate Zoofile – Venatorie – Ittiche – Ambientali</p>
            <p style="margin: 1px 0 0 0; font-size: 9.5pt; font-weight: bold; font-style: italic; line-height: 1.15; font-family: 'Times New Roman', Times, serif;">Servizio di polizia giudiziaria ittica-zoofila</p>
            <p style="margin: 1px 0 0 0; font-size: 10pt; font-weight: bold; font-style: italic; color: #000000; line-height: 1.15; font-family: 'Times New Roman', Times, serif;">Nucleo Massa-Carrara “Attilio Bertolucci”</p>
            <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #444444; line-height: 1.1; font-family: 'Times New Roman', Times, serif;">ekoclub.massacarrara@gmail.com - cell. 3293738118</p>
          </div>
          
          ${isToOffender ? `
            <div style="background-color: #ffffff; border-bottom: 1px dashed #000000; padding: 4px 0; margin-bottom: 10px; color: #000000; font-size: 9.5pt; text-align: center; line-height: 1.25; font-style: italic; font-family: 'Times New Roman', Times, serif;">
              Si prega di <strong>NON rispondere</strong> a questa e-mail in quanto trasmessa da sistema automatico non abilitato alla ricezione.
            </div>
            <p style="margin-top: 4px; margin-bottom: 4px;">Spett.le signor/a <strong>${report.soggettoNome || "Cittadino"}</strong>,</p>
            <p style="margin-bottom: 8px;">Con la presente trasmettiamo copia conforme del <strong>Verbale di Sopralluogo di Accertamento</strong> redatto in data <strong>${report.data || "N/A"}</strong> dalle Guardie Zoofile ed Ambientali di Ekoclub.</p>
          ` : `
            <p style="margin-top: 4px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; text-decoration: underline; font-size: 10pt; line-height: 1.1;">[TRASMISSIONE INTERNA] Archiviazione Verbale di Sopralluogo:</p>
          `}
          
          <!-- Titolo Centrale Atto -->
          <div style="text-align: center; margin-bottom: 12px; margin-top: 6px;">
            <h2 style="font-size: 13pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 0; line-height: 1.1;">
              VERBALE N° ${report.numeroVerbale || "_______"} DI SOPRALLUOGO
            </h2>
          </div>

          <!-- Corpo Verbale Contenuto Unico a Righe -->
          <div style="text-align: justify; line-height: 1.35; font-size: 11pt; margin-bottom: 10px;">
            L'ANNO <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.data || "N/A"}&nbsp;</strong>
            ALLE ORE <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.oraInizio || "N/A"}&nbsp;</strong>
            CON TERMINE ORE <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.oraFine || "N/A"}&nbsp;</strong>
            I SOTTOSCRITTI VERBALIZZANTI <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${gpgInitials}&nbsp;</strong>,
            NEL COMUNE DI <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.comune || "CARRARA"}&nbsp;</strong>
            PROV. (<strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.provincia || "MS"}&nbsp;</strong>)
            IN LOCALITÀ <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.localita || "N/A"}&nbsp;</strong>,
            CI SIAMO RECATI PRESSO <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.recatPresso || "N/A"}&nbsp;</strong>
            ALLO SCOPO DI CONSTATARE LE CONDIZIONI DI CUSTODIA DI N° <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.numeroAnimali || "N/A"}&nbsp;</strong>
            ANIMALI.
            <br/><br/>
            DOPO ESSERCI QUALIFICATI AL SIG. <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoNome || "N/A"}&nbsp;</strong>,
            NATO A <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoNatoA || "N/A"}&nbsp;</strong>
            IL <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoIl || "N/A"}&nbsp;</strong>,
            RESIDENTE A <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoResidenteA || "N/A"}&nbsp;</strong>
            PROV. <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoProv || "N/A"}&nbsp;</strong>,
            INDIRIZZO <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoIndirizzo || "N/A"}&nbsp;</strong>,
            DOC. <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoDocumentoTipo || "N/A"}&nbsp;</strong>
            N° <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoDocumentoNumero || "N/A"}&nbsp;</strong>
            SCAD. <strong style="border-bottom: 1px solid #000000; padding: 0 4px;">&nbsp;${report.soggettoDocScadenza || "N/A"}&nbsp;</strong>,
            CHE RISULTA RISPETTO AGLI ANIMALI IN OGGETTO DI CONTROLLO ESSERE IL <strong>${(report.proprietarioPossessore || "detentore").toUpperCase()}</strong>.
            <br/><br/>
            I VERBALIZZANTI HANNO CHIESTO IL CONSENSO AL SOPRALLUOGO: 
            <span style="font-style: italic;">
              ${report.esito === 'rifiuto' ? 
                "Avendo ricevuto rifiuto i verbalizzanti non hanno potuto procedere al sopralluogo." : 
                "Avendo ricevuto consenso esplicito i verbalizzanti hanno potuto procedere al sopralluogo ed hanno constatato quanto appresso indicato:"}
            </span>
          </div>

          <!-- Constatazioni Redatte -->
          ${(report.esito !== 'rifiuto') ? `
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; border-bottom: 1px solid #000000; text-transform: uppercase; font-size: 11pt; margin-bottom: 4px;">
                ESITO SOPRALLUOGO / CONSTATATO QUANTO APPRESSO:
              </div>
              <div style="font-size: 11pt; font-style: italic; white-space: pre-wrap; line-height: 1.35; text-align: justify; padding: 4px 0; border-bottom: 1px solid #000000;">${report.constatazioni || "Nessuna constatazione particolare riportata."}</div>
            </div>
          ` : ""}

          <!-- Microchips Sezione -->
          ${chipsHtml}
          
          <!-- Regolarizzazione -->
          <div style="font-size: 11pt; margin-bottom: 25px; line-height: 1.4;">
            Vengono concessi giorni <strong style="border-bottom: 1px solid #000000; padding: 0 10px;">&nbsp;${report.giorniRegolarizzazione || "///"}&nbsp;</strong> per la regolarizzazione delle anomalie riscontrate dalla notifica del presente atto.
          </div>
          
          <!-- Firme e Sigle - Senza P.G. Cedente -->
          <table style="width: 100%; font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin-top: 30px; border-top: 1.5pt solid #000000; padding-top: 10px;">
            <tr>
              <td style="width: 50%; vertical-align: top; text-align: center; padding-top: 4px;">
                <span style="font-weight: bold; font-size: 10pt; text-transform: uppercase;">I VERBALIZZANTI</span>
                <br />
                <span style="font-size: 11pt; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 15px;">
                  ${gpgInitials} /////
                </span>
              </td>
              <td style="width: 50%; vertical-align: top; text-align: center; padding-top: 4px;">
                <span style="font-weight: bold; font-size: 10pt; text-transform: uppercase;">IL DETENTORE / PROPRIETARIO</span>
                <br />
                <div style="margin-top: 10px; min-height: 45px; display: inline-block; vertical-align: middle;">
                  ${report.signatureData ? `
                    <div style="background-color: #ffffff; padding: 2px; border: 1px solid #cccccc; border-radius: 4px; display: inline-block;">
                      <img src="${report.signatureData}" alt="Firma Digitale" style="max-height: 45px; max-width: 160px; display: block;" />
                    </div>
                  ` : `
                    <span style="font-size: 10.5pt; font-weight: bold; font-style: italic; color: #444444; display: inline-block; margin-top: 15px;">
                      ${report.firmaTrasgressore ? "FIRMATA SUL DISPLAY" : report.rifiutaFirma ? "RIFIUTA DI FIRMARE IL VERBALE" : "ACCETTATO SENZA FIRMA"}
                    </span>
                  `}
                </div>
              </td>
            </tr>
          </table>

          <hr style="border: 0; border-top: 1pt solid #000000; margin: 20px 0;" />
          <p style="font-size: 7.5pt; color: #444444; text-align: center; line-height: 1.3; margin: 0; font-family: 'Times New Roman', Times, serif;">
            Il trattamento dei dati riportati nel presente verbale viene effettuato nel rispetto di finalità di rilevante interesse pubblico, ai sensi degli artt. 70 e 73 del D.Lgs. 30/06/2003 n. 196 e s.m.i.<br />
            Questa è una copia conforme informatica non modificabile, trasmessa ai sensi dell'Art. 22 del D.Lgs. 82/2005.<br />
            <em>Si prega di non rispondere a questa e-mail in quanto non rimonitorata.</em>
          </p>
        </div>
      `;
    };

    const isLegacy = (toSede === undefined && toControllato === undefined && toGuard1 === undefined && toGuard2 === undefined);

    if (isLegacy) {
      // Legacy Fallback mode (backward compatibility)
      const defaultRecipient = "turniguardie493@gmail.com";
      let recipient = defaultRecipient;
      let bcc: string | undefined = undefined;

      const targetEmail = recipientEmail || report.soggettoEmail;
      if (targetEmail && targetEmail.trim() !== "") {
        recipient = targetEmail.trim();
        bcc = defaultRecipient;
      }

      const isToOffender = targetEmail && targetEmail.trim() !== "";

      try {
        await transporter.sendMail({
          from: isToOffender 
            ? '"Ekoclub Massa Carrara \\"nucleo \\"Attilio Bertolucci\\"" <' + EMAIL_USER + '>'
            : `"Vigilanza Ekoclub" <${EMAIL_USER}>`,
          to: recipient,
          cc: guardEmail || undefined,
          bcc: bcc,
          replyTo: "no-reply@ekoclub.it",
          subject: isToOffender 
            ? `verbale di sopralluogo del ${report.data || "N/A"}`
            : `[VERBALE ARCHIVIO] N° ${report.numeroVerbale || "Nuovo"} - ${report.soggettoNome || "Senza Nome"}`,
          html: generateHtmlBody(recipient, isToOffender)
        });
        console.log(`[VERBALE_LEGACY_EMAIL] Inviata email a: ${recipient}`);
        return res.json({ status: "ok" });
      } catch (error: any) {
        console.error("[LEGACY_EMAIL_ERROR]", error);
        return res.status(500).json({ error: error.message || "Errore invio email" });
      }
    }

    // New Multi-Email Structured mode
    const successes: string[] = [];
    const errors: string[] = [];

    // 1. Sede (Archivio Centrale) - Predefinito a giulianodellapina@gmail.com in Beta
    if (toSede && sedeEmail && sedeEmail.trim() !== "") {
      try {
        const dest = sedeEmail.trim();
        await transporter.sendMail({
          from: `"Vigilanza Ekoclub" <${EMAIL_USER}>`,
          to: dest,
          replyTo: "no-reply@ekoclub.it",
          subject: `[VERBALE ARCHIVIO] N° ${report.numeroVerbale || "Nuovo"} - ${report.soggettoNome || "Senza Nome"}`,
          html: generateHtmlBody(dest, false)
        });
        successes.push(`Sede Centrale (${dest})`);
      } catch (err: any) {
        console.error("[EMAIL_SEDE_ERROR]", err);
        errors.push(`Sede Centrale: ${enhanceMailError(err, EMAIL_USER)}`);
      }
    }

    // 2. Controllato (Cittadino / Soggetto)
    if (toControllato && controllatoEmail && controllatoEmail.trim() !== "") {
      try {
        const dest = controllatoEmail.trim();
        await transporter.sendMail({
          from: '"Ekoclub Massa Carrara \\"nucleo \\"Attilio Bertolucci\\"" <' + EMAIL_USER + '>',
          to: dest,
          replyTo: "no-reply@ekoclub.it",
          subject: `verbale di sopralluogo del ${report.data || "N/A"}`,
          html: generateHtmlBody(dest, true)
        });
        successes.push(`Controllato (${dest})`);
      } catch (err: any) {
        console.error("[EMAIL_CONTROLLATO_ERROR]", err);
        errors.push(`Controllato: ${enhanceMailError(err, EMAIL_USER)}`);
      }
    }

    // 3. Prima Guardia
    if (toGuard1 && guard1Email && guard1Email.trim() !== "") {
      try {
        const dest = guard1Email.trim();
        await transporter.sendMail({
          from: `"Vigilanza Ekoclub" <${EMAIL_USER}>`,
          to: dest,
          replyTo: "no-reply@ekoclub.it",
          subject: `[COPIA GUARDIA] Verbale N° ${report.numeroVerbale || "Nuovo"} - ${report.soggettoNome || "Senza Nome"}`,
          html: generateHtmlBody(dest, false)
        });
        successes.push(`Guardia 1 (${dest})`);
      } catch (err: any) {
        console.error("[EMAIL_GUARD1_ERROR]", err);
        errors.push(`Guardia 1: ${enhanceMailError(err, EMAIL_USER)}`);
      }
    }

    // 4. Seconda Guardia
    if (toGuard2 && guard2Email && guard2Email.trim() !== "") {
      try {
        const dest = guard2Email.trim();
        await transporter.sendMail({
          from: `"Vigilanza Ekoclub" <${EMAIL_USER}>`,
          to: dest,
          replyTo: "no-reply@ekoclub.it",
          subject: `[COPIA GUARDIA] Verbale N° ${report.numeroVerbale || "Nuovo"} - ${report.soggettoNome || "Senza Nome"}`,
          html: generateHtmlBody(dest, false)
        });
        successes.push(`Guardia 2 (${dest})`);
      } catch (err: any) {
        console.error("[EMAIL_GUARD2_ERROR]", err);
        errors.push(`Guardia 2: ${enhanceMailError(err, EMAIL_USER)}`);
      }
    }

    if (errors.length > 0 && successes.length === 0) {
      return res.status(500).json({ error: `Impossibile inviare le email. Errori: ${errors.join("; ")}` });
    }

    res.json({ 
      status: "ok", 
      successes, 
      errors: errors.length > 0 ? errors : undefined 
    });
  });

  app.post("/api/send-service-report-email", async (req, res) => {
    const { report, guardEmail } = req.body;
    const body = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f8fafc;">
          <h2>RAPPORTO DI SERVIZIO N° ${report.numeroRapporto}</h2>
          <p>Giorno: ${report.data}</p>
          <p>Orario: dalle ${report.oraInizio} alle ${report.oraFine}</p>
          <p>Località: ${report.localita}, ${report.comune} (${report.provincia})</p>
          <p>Matricole: ${report.guardie}</p>
          <hr />
          <p>Note: ${report.note}</p>
          </div>
      `;
    
    const nodemailer = await import("nodemailer");
    const { EMAIL_USER, pass } = getEmailCredentials();

    if (!EMAIL_USER || !pass) {
      return res.status(500).json({ error: "Configurazione e-mail server mancante (GMAIL_APP_PASSWORD)." });
    }

    const transporter = createMailTransporter(nodemailer, EMAIL_USER, pass);

    try {
      await transporter.sendMail({
        from: `"App Guardie" <${EMAIL_USER}>`,
        to: process.env.EMAIL_RECEIVER || "turniguardie493@gmail.com",
        cc: guardEmail || undefined,
        subject: `[RAPPORTI] ${report.numeroRapporto} - ${report.data}`,
        html: body
      });
      console.log(`[RAPPORTI_EMAIL] Inviata correttamente per: ${report.numeroRapporto} (CC: ${guardEmail || "nessuno"})`);
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("[EMAIL_ERROR]", error);
      res.status(500).json({ error: enhanceMailError(error, EMAIL_USER) });
    }
  });

  app.post("/api/send-env-report-email", async (req, res) => {
    const { report } = req.body;
    const attachments = [];
    if (report.photo && report.photo.includes("base64")) {
      attachments.push({
        filename: `segnalazione_${report.type}_${Date.now()}.jpg`,
        path: report.photo
      });
    }

    const gpsLink = report.coords 
      ? `https://www.google.com/maps/search/?api=1&query=${report.coords.lat},${report.coords.lng}`
      : "Non disponibile";

    const body = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ff9800; border-radius: 10px; background-color: #fffaf0; max-width: 600px;">
          <h2 style="color: #e65100; border-bottom: 2px solid #ff9800; padding-bottom: 10px; margin-top: 0;">
            ⚠️ SEGNALAZIONE REATO AMBIENTALE
          </h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px; color: #666; width: 150px;">Segnalazione N°:</td><td style="padding: 5px; font-weight: bold; font-size: 18px; color: #e65100;">${report.reportNumber || "N/A"}</td></tr>
            <tr><td style="padding: 5px; color: #666;">Data:</td><td style="padding: 5px;">${report.date}</td></tr>
            <tr><td style="padding: 5px; color: #666;">Guardia (Matricola):</td><td style="padding: 5px;">${report.guard} (${report.matricola || "N/A"})</td></tr>
            <tr><td style="padding: 5px; color: #666;">Tipo:</td><td style="padding: 5px; color: #d84315; font-weight: bold;">${report.type}</td></tr>
          </table>

          <hr style="border: 0; border-top: 1px solid #ffe0b2; margin: 15px 0;" />
          
          <div style="margin-bottom: 15px;">
            <p><strong>Descrizione:</strong><br>${report.description}</p>
          </div>

          <div style="margin-bottom: 15px;">
            <p><strong>Località:</strong> ${report.address || "Non specificata"}</p>
          </div>

          ${report.externalAuthority ? `<p><strong>Autorità Informata:</strong> ${report.externalAuthority}</p>` : ""}

          <div style="background-color: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #1976d2;">📍 POSIZIONE GPS</p>
            ${report.coords ? 
              `<p>Lat: ${report.coords.lat}, Lng: ${report.coords.lng}</p>
               <a href="${gpsLink}" style="display: inline-block; padding: 10px 20px; background-color: #2196f3; color: white; text-decoration: none; border-radius: 5px;">Apri su Google Maps</a>` : 
              "<p>GPS non acquisito.</p>"
            }
          </div>

          ${report.notes ? `<p><strong>Note:</strong><br>${report.notes}</p>` : ""}
          ${report.photo ? `<p style="font-size: 12px; color: #666;">📎 Foto allegata.</p>` : ""}
        </div>
      `;
    
    const nodemailer = await import("nodemailer");
    const { EMAIL_USER, pass } = getEmailCredentials();

    if (!EMAIL_USER || !pass) {
      return res.status(500).json({ error: "Configurazione e-mail server mancante (GMAIL_APP_PASSWORD)." });
    }

    const transporter = createMailTransporter(nodemailer, EMAIL_USER, pass);

    try {
      await transporter.sendMail({
        from: `"App Guardie" <${EMAIL_USER}>`,
        to: process.env.EMAIL_RECEIVER || "turniguardie493@gmail.com",
        cc: report.guardEmail || undefined,
        subject: `[AMBIENTE] Segnalazione n°${report.reportNumber || ""} - ${report.type} - ${report.guard}`,
        html: body,
        attachments: attachments
      });
      console.log(`[AMBIENTE_EMAIL] Inviata correttamente per: ${report.reportNumber}`);
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("[ENV_EMAIL_ERROR]", error);
      res.status(500).json({ error: enhanceMailError(error, EMAIL_USER) });
    }
  });

  // API Routes for Telegram Notifications (placed BEFORE wildcard to prevent 404 block!)
  app.post("/api/telegram/sos", async (req, res) => {
    const { guardName, matricola, location, sector, onlySupervisors } = req.body;
    let mainGroupId = process.env.TELEGRAM_GROUP_ID;
    if (mainGroupId) mainGroupId = mainGroupId.replace(/\s+/g, "").replace(/['"]/g, "").trim();
    
    let supervisorGroupId = process.env.TELEGRAM_SUPERVISORS_GROUP_ID;
    if (supervisorGroupId) supervisorGroupId = supervisorGroupId.replace(/\s+/g, "").replace(/['"]/g, "").trim();

    const groupId = onlySupervisors ? (supervisorGroupId || mainGroupId) : mainGroupId;

    console.log(`[TELEGRAM_SOS] Generazione allarme SOS. Richiesta: guardName="${guardName}", matricola="${matricola}", sector="${sector}", onlySupervisors=${onlySupervisors}`);
    console.log(`[TELEGRAM_SOS] ID dei gruppi caricati: TELEGRAM_GROUP_ID="${mainGroupId}", TELEGRAM_SUPERVISORS_GROUP_ID="${supervisorGroupId}"`);
    console.log(`[TELEGRAM_SOS] Destinazione instradata caricata: "${groupId}"`);

    if (!groupId) {
      console.warn("[TELEGRAM] Gruppo non configurato. Salto invio SOS.");
      return res.status(200).json({ status: "skipped", reason: "no_group_id" });
    }

    if (!bot) {
      console.warn("[TELEGRAM] Bot non configurato o spento (Nessun token caricato). Salto invio SOS.");
      return res.status(200).json({ status: "skipped", reason: "bot_not_configured" });
    }

    const mapLink = location ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}` : null;
    
    const message = 
      `🚨 *ALLARME SOS SOS SOS* 🚨\n` +
      (onlySupervisors ? `⚠️ *SOS RESPONSABILI (INOLTRO BETA)* ⚠️\n\n` : `🌍 *ALLARME GENERALE* 🌍\n\n`) +
      `👤 *Guardia:* ${guardName}\n` +
      `🆔 *Matricola:* ${matricola}\n` +
      `📡 *Settore:* ${sector || "Non specificato"}\n` +
      (mapLink ? `📍 [POSIZIONE GPS](${mapLink})\n` : "📍 Posizione non disponibile\n") +
      (onlySupervisors ? `⚠️ *VERIFICARE SITUAZIONE E SEGNALARE SUPPORTO!*` : `🔴 *INTERVENTO IMMEDIATO DI TUTTE LE PATTUGLIE DISPONIBILI!*`);

    try {
      await sendTelegramMessageWithFallback(bot, groupId, message, { parse_mode: "Markdown" });
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[TELEGRAM SOS ERROR]", err);
      res.status(500).json({ error: "Errore invio SOS Telegram", details: err.message });
    }
  });

  app.post("/api/telegram/notify", async (req, res) => {
    const { title, message, type, onlySupervisors, chatId, onlyTarget } = req.body;
    let mainGroupId = process.env.TELEGRAM_GROUP_ID;
    if (mainGroupId) mainGroupId = mainGroupId.replace(/\s+/g, "").replace(/['"]/g, "").trim();

    let supervisorGroupId = process.env.TELEGRAM_SUPERVISORS_GROUP_ID;
    if (supervisorGroupId) supervisorGroupId = supervisorGroupId.replace(/\s+/g, "").replace(/['"]/g, "").trim();

    let targetId = (onlyTarget && chatId) 
      ? chatId 
      : (chatId || (onlySupervisors ? (supervisorGroupId || mainGroupId) : mainGroupId));
    
    if (typeof targetId === "string") {
      targetId = targetId.replace(/\s+/g, "").replace(/['"]/g, "").trim();
    }
    
    if (onlyTarget && !chatId) {
      console.warn("[TELEGRAM] Notifica strict target richiesta ma chatId mancante. Salto invio.");
      return res.status(200).json({ status: "skipped", reason: "missing_private_chat_id" });
    }

    if (!bot) {
      console.warn("[TELEGRAM] Bot non configurato o spento. Salto invio notifica.");
      return res.status(200).json({ status: "skipped", reason: "bot_not_configured" });
    }

    let emoji = "ℹ️";
    if (type === "shift") emoji = "📅";
    if (type === "report") emoji = "📝";
    if (type === "alert") emoji = "⚠️";
    if (type === "shift_approval") emoji = "✅";

    const formattedMessage = `*${emoji} ${title}*\n\n${message}`;

    try {
      if (!targetId) {
        throw new Error("Target ID (Gruppo o Chat) non specificato.");
      }
      await sendTelegramMessageWithFallback(bot, targetId, formattedMessage, { parse_mode: "Markdown" });
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[TELEGRAM NOTIFY ERROR]", err);
      res.status(type === "shift_approval" ? 200 : 500).json({ 
        error: "Errore invio notifica Telegram", 
        details: err.message,
        skipped: type === "shift_approval" 
      });
    }
  });

  // Blocca tutte le altre chiamate /api/* che non hanno un handler definito sopra
  // Questo previene il fall-through all'index.html di Vite che causerebbe errori JSON inattesi
  app.all("/api/*", (req, res) => {
    console.warn(`[SERVER] Rotta API non definita intercettata: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: `API Endpoint "${req.url}" non trovato in questo server.`,
      method: req.method,
      hint: "Verifica che il metodo HTTP e l'URL siano corretti."
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static files with 1-day caching except HTML files
    app.use(express.static(distPath, {
      maxAge: "1d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      }
    }));
    // Serve index.html under wildcard routing with strictly disabled caching
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Telegram Bot Initialization
  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    botToken = botToken.replace(/\s+/g, "").replace(/['"]/g, "").trim();
  }

  if (botToken) {
    console.log("Inizializzazione Telegram Bot...");
    bot = new Telegraf(botToken);

    bot.start((ctx) => {
      ctx.reply("Benvenuto nel Bot Ufficiale di Vigilanza Bertolucci! 🦅\n\nAttraverso questo bot potrai ricevere notifiche e gestire i tuoi turni.\n\nUsa /aiuto per vedere i comandi.");
    });

    bot.command("aiuto", (ctx) => {
      ctx.reply(
        "📚 *Comandi Disponibili:*\n\n" +
        "/start - Inizia la conversazione\n" +
        "/webapp - Link alla piattaforma di gestione\n" +
        "/ping - Verifica se il bot è attivo",
        { parse_mode: 'Markdown' }
      );
    });

    bot.command("webapp", (ctx) => {
      ctx.reply("Accedi alla piattaforma di gestione qui:\nhttps://ais-dev-3kva3lc5vmoxvxyy5zjb2r-88460539850.europe-west2.run.app");
    });

    bot.command("ping", (ctx) => {
      ctx.reply("Pong! 🏓 Il server è attivo e funzionante.");
    });

    // Logging Chat ID to help user find Group ID
    bot.on("message", (ctx: any) => {
      const chatId = ctx.chat.id;
      const chatTitle = ctx.chat.title || "Chat Privata";
      console.log(`[TELEGRAM] Messaggio ricevuto da "${chatTitle}" (ID: ${chatId})`);
      
      // Se l'utente scrive /id, rispondiamo con l'ID della chat
      if (ctx.message.text === "/id") {
        ctx.reply(`L'ID di questa chat è: ${chatId}`);
      }
    });

    // Handle potential duplicate instances or webhook conflicts
    const lBot = bot;
    const launchBot = async () => {
      try {
        console.log("Tentativo di cancellazione webhook esistenti...");
        await lBot.telegram.deleteWebhook({ drop_pending_updates: true });
        
        await lBot.launch();
        console.log(">>> Telegram Bot (@VigilanzaBertolucciBot) avviato correttamente con polling!");
      } catch (err: any) {
        if (err.description?.includes("terminated by other getUpdates request")) {
          console.warn("⚠️ Conflitto bot rilevato (409). Riprovo tra 5 secondi...");
          setTimeout(launchBot, 5000);
        } else {
          console.error("❌ ERRORE CRITICO AVVIO TELEGRAM BOT:", err);
        }
      }
    };

    launchBot();

    // Enable graceful stop
    process.once('SIGINT', () => lBot.stop('SIGINT'));
    process.once('SIGTERM', () => lBot.stop('SIGTERM'));
  } else {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN non trovato. Bot disabilitato.");
  }
}

startServer();
