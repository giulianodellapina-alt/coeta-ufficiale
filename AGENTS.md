# Regole di Interazione

1. **Modalità Predefinita**: Spiegazione e proposta. L'agente fornisce spiegazioni, risposte o suggerimenti senza modificare il codice.
2. **Autorizzazione Modifiche**: Le modifiche al codice possono essere effettuate SOLO dopo aver ricevuto il consenso esplicito dell'utente tramite la dicitura "**Procedi**".
3. **Ripristino Modalità**: Dopo ogni modifica autorizzata, l'agente tornerà immediatamente in modalità informativa/proposta.
4. **Nessun Salvataggio Automatico**: Non apportare modifiche spontanee o sistemi di persistenza automatica non richiesti.
5. **Prevenzione Rimozioni e Allarmi**: Se l'utente richiede un'azione o una modifica che rischia di eliminare una funzione esistente o di compromettere una funzionalità operativa, l'agente DEVE emettere un avviso preventivo esplicito (Warning) e chiedere conferma prima di fare modifiche# Stato Progetto e Prossimi Passi (Update 2026-08-01)
- **Risoluzione Definitiva Errore Firestore & Stabilizzazione Multi-Scheda**: Inizializzata la gestione della memoria locale (`memoryLocalCache()`) per Firestore in `lib/firebase.ts` e disabilitata la sincronizzazione IndexedDB tra schede per eliminare alla radice l'eccezione `INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9 / b815)`. Ogni dispositivo o scheda ora lavora su una connessione in tempo reale pulita e indipendente.
- **Cartella Unica Interventi & Dossier Completato**: Verificato e operativo il fascicolo unificato che accorpa automaticamente il 1° e 2° sopralluogo, compresi gli allegati fotografici e il riepilogo del secondo controllo per verifica prescrizioni.
- **Esito Positivo Prova Generale Scritture & Stampe**: Collaudati con successo i flussi di scrittura, salvataggio telematico e stampa A4 di tutti i moduli (verbali di accertamento, verbali sanzionatori e relazioni di servizio).
- **Nuovo Registro Controlli Territoriali A4 Orizzontale (Stile Excel)**: Separato nettamente il registro dei controlli sul territorio dalle statistiche. Realizzata la stampa orizzontale in formato A4 Landscape con intestazione ufficiale dell'Aquila e del Comune ("Controlli nel Comune di...") ideale per i controlli continuativi (es. Molo di Ponente, Passeggiata Mare) per azzerare lo spreco di carta e risme.
- **Sincronizzazione ed Estrapolazione Automatica Microchip**: Implementato il sistema automatico che estrapola i dati dei cani e microchip registrati sia dai Controlli sul Territorio sia dai Verbali di Sopralluogo (1° e 2° verbale) e Verbali Sanzionatori, memorizzandoli o aggiornandoli istantaneamente nell'Archivio Anagrafe Canina (`canine_certificates`).
- **Nuovo SOS Fluttuante & Segnalazione**: Sostituita la vecchia barra rossa con un pulsante fluttuante "SOS" a destra (effetto radar). Rinominato lo strumento rapido di segnalazione in **"Segnalazione Ambientale Rapida"** su dashboard e sottomenu per evitare doppioni terminologici e migliorarne l'immediatezza sonora.
- **Aggiornamento Guida Operativa**: Modificato il preavviso d'inserimento del turno a "si consiglia almeno 24 ore prima" (rimosso il vecchio limite rigido di 48h) e descritta dettagliatamente la gestione blindata dell'SOS (visibile prima a responsabili/amministratori per verifica preventiva, onde evitare procurati allarmi alle forze dell'ordine o panico, con attivazione successiva dell'allerta globale).
- **Rimozione Ridondanze Mappa**: Rimosso il messaggio ridondante "Sono qui, chiamami!" per concentrare l'attenzione esclusivamente sulle opzioni telefoniche/WhatsApp dirette.
- **Telegram Bot**: Inizializzato (@VigilanzaBertolucciBot). Supporto SOS e turni attivo.
- **Modulo OSINT**: Aggiunto campo "Chiave/Note Extra", pulsante di reset e risolti problemi di visualizzazione avatar/immagini. Passato a modello `gemini-3.5-flash` per supportare appieno il nuovo SDK GenAI e avere risposte ultra-dettagliate.
- **Notifiche Verbali**: Disabilitata notifica automatica dei verbali su Telegram per evitare intasamento cellulare (richiesta Giuliano).
- **Stampa da Archivio**: Abilitata la stampa cartacea standard A4 dei verbali di sopralluogo direttamente dall'archivio HQ (sia tramite pubblicazione rapida su card che dentro i "Dettagli").

# ARCHITETTURA CARTELLA UNICA INTERVENTO & ARCHIVIO HQ (Discussa il 06/06/2026)
Questo modulo centralizzato di archiviazione risolverà il problema del tracciamento dei controlli successivi (prescrizioni) e della gestione documentale:
1. **Dossier Unificato ("Cartella Unica")**:
   - Accorpa automaticamente il **1° Sopralluogo** (verbale iniziale con prescrizioni, es. "10 giorni per adeguamento") con il **2° Sopralluogo** (verbale di controllo per verifica adempimenti) in un'unica scheda/cartella di intervento.
   - La ricerca e il filtraggio avvengono su **più voci chiave stabili** (ID Microchip, Indirizzo/Località, Specie/Razza dell'animale, Numero Verbale Iniziale), omettendo/disattivando la ricerca primaria per nome del proprietario del cane (poiché il soggetto controllato o chi detiene l'animale potrebbe variare tra il primo e il secondo controllo).
   - L'intero fascicolo (1° e 2° verbale uniti) è stampabile in unico formato A4 continuo per uso d'ufficio o Polizia Giudiziaria.

2. **Flusso di Lavoro Blindato & Divisione Competenze**:
   - **Competenza Guardia sul Campo:** Sollevata da qualsiasi compilazione burocratica o gestione carte. Se sul posto il proprietario esibisce un documento (es. modulo iscrizione ASL Nord-Ovest o anagrafe canina), la guardia usa la fotocamera dell'app per scattare una foto nitida del documento e inviarla direttamente alla sede con geotag automatico.
   - **Competenza Sede (HQ / Amministratori):** L'archivio documentale fisico e la dicitura delle anagrafi ufficiali sono di pertinenza degli amministratori. Dal pannello HQ, l'amministratore associa le foto inviate dalle guardie, i moduli scannerizzati (es. iscrizioni ufficiali dell'ASL, riscontri della Polizia Municipale) alla "Cartella Unica" dell'intervento per completare il quadro informativo telematico, accessibile ovunque senza bisogno di essere fisicamente in ufficio.

# Prossimi Passi (PRIORITARI - Prossima Sessione)
1. **MODULISTICA PER SETTORE & REGOLE OPERATIVE BLINDATE (Confermate 2026-09-03)**:
   - **Settore Zoofilo**:
     - Confermato il set attuale: Verbale 1° Sopralluogo (accertamento e prescrizioni), Verbale 2° Sopralluogo (verifica ottemperanza), Verbale Sanzionatorio (L.R. Toscana 59/09 e regolamenti locali), Relazione di Servizio, Registro Controlli Territoriali e Archivio Microchip.
     - **Regola Esclusioni**: NON si creano né si utilizzano verbali di sequestro amministrativo né di cessione di proprietà volontaria (il corpo opera penalmente trasmettendo CNR - Comunicazione di Notizia di Reato - direttamente alla Procura della Repubblica).
     - Censimento colonie feline posticipato a step successivi.
   - **Settori Ittica e Venatoria**:
     - NON hanno verbali di sopralluogo per privati/canili (tipici della zoofila).
     - Hanno a disposizione:
       1. **Rapporti di Servizio Dedicati**: sezioni specifiche per acque/fiumi, licenze e concessioni per l'Ittica; tesserini venatori, porto d'armi, tipologia appostamenti, zone ATC e divieti per la Venatoria.
       2. **Verbali Sanzionatori Settoriali**: articoli e sanzioni specifiche precaricate per Pesca (R.D. 1604/1931) e Caccia (L. 157/1992 e L.R. Toscana 3/1994).
       3. **Registro Controlli Territoriali A4 Landscape**: per registrare rapidamente i pescatori e i cacciatori controllati sul campo senza spreco di fogli.
   - **Invio Telematico Copia Verbale all'Interessato via Email**:
     - Nel Verbale di Sopralluogo è confermata la presenza del campo email dell'interessato per l'invio immediato della copia conforme PDF all'atto della chiusura, sopperendo alla mancanza di stampanti portatili sul posto.
   - **Buffer Locale Offline & Invio Automatico al Ritorno della Rete**:
     - I verbali, rapporti e controlli redatti in aree senza segnale cellulare (boschi, alvei di fiumi, zone montane) vengono memorizzati istantaneamente nella coda locale protetta del dispositivo (`pending_documents`).
     - Al rilevamento del ripristino della connettività internet, il sistema attiva automaticamente la trasmissione in background a Firestore e l'inoltro delle email programmate, con badge di notifica dell'avvenuto invio.

2. **DIAGNOSI & RIPRISTINO PUNTO DI STABILITÀ FIRESTORE / APPLICAZIONE (PRIORITÀ ASSOLUTA)**:
   - Analisi e verifica strutturale di tutte le sottoscrizioni in tempo reale (`onSnapshot`) e dei listener Firebase per isolare la causa dell'assertion error di Firestore.
   - Verifica di sicurezza per garantire l'assenza di perdita dati o conflitti di stato e ripristinare il corretto funzionamento in ogni scheda/dispositivo.
2. **GESTIONE RESPONSABILI & AUTORIZZAZIONE TURNI BLINDATA**:
   - Inserimento e profilazione dei responsabili di settore nel sistema.
   - **Regola Priorità Ittica e Venatoria**: Il responsabile **Baratta Andrea** ha la priorità assoluta di autorizzare e convalidare i turni del settore **"Ittica e Venatoria"**. Nel caso di ritardo prolungato o mancata risposta entro i limiti operativi, il sistema consentirà l'intervento sostitutivo di convalida da parte degli altri amministratori/coordinatori generali per garantire la continuità dei servizi sul campo.
3. **CONTROLLO DI SICUREZZA & STABILITÀ CODICE**:
   - Eseguire un controllo approfondito e un audit del codice per garantire l'assenza di loop, ottimizzare le dependency-array dei React hooks e certificare la solidità dell'applicazione.
4. **Modulo OSINT Animale & Telecamere Pubbliche (Mappa / Radar)**:
   - Mappare le webcam meteo storiche pubbliche e stradali legali del territorio di Massa-Carrara (es. Ponti di Anderlino, Marina di Carrara, centro storico, varchi stradali censiti) come punti interattivi (marker telecamera) sulla mappa radar. Alla pressione, mostrare i dettagli della cam, l'ente proprietario (es. Comune o rete meteo) e l'eventuale URL dello streaming/fotogramma in diretta legale.
   - Implementare l'analisi storica temporale ("Time Travel"): spiegare ed integrare un selettore orario per ricostruire il posizionamento e capire come recuperare fotogrammi storici (spesso salvati per 24h/72h dalle cam meteo o tramite richiesta formale di PG alla Polizia Municipale per i varchi Targasystem).
5. **Sessione SOS & Tracciamento Automatico**:
   - Integrare il tracciamento automatico dei contatti (quando un responsabile clicca "Chiama" o "WhatsApp" sui dettagli dell'emergenza, registrare automaticamente l'azione negli aggiornamenti SOS).
   - Creare una tabelle di log/audit Trail blindata per ogni SOS dall'attivazione alla risoluzione (con timestamp millisecondo, ID operatore, e spazio per firma digitale/conferma di 2 operatori, utile ai fini di Polizia Giudiziaria).
6. **Invio Copia Verbale & Rapporto via Email alla Guardia**:
   - Aggiungere il campo email automatico/dispositivo nel modulo Verbali e Rapporti di servizio per inviare istantaneamente una copia conforme PDF/A4 direttamente alla casella email dell'operatore verbalizzante.
7. **Test Chiamata & WhatsApp**: Verificare il comportamento dei pulsanti "Chiama" e "WhatsApp" nei dettagli della mappa. Indagare sul comportamento della chat (discorsi nello stesso colore o "parlare a se stessi") che sorge quando l'utente che clicca apre una sessione con se stesso o se è necessario chiarire i contatti telefonici censiti per ciascuna tesserina.
8. **Stato SOS e Marker**: Certificare la stabilità visiva dei cerchi di allarme sulla mappa interattiva "Naviga" quando c'è un SOS in corso.
9. **Rapporti via Bot**: Implementazione invio rapporti tramite Telegram.
- **Strategia di Rilascio**: Prima di lavorare su funzionalità opzionali, effettueremo un controllo approfondito modulo per modulo (Turni, Verbali, Relazioni di Servizio, ecc.) per assicurarci che tutto ciò che serve nell'immediato sia impeccabile.
- **Step Futuri & Opzionali (In Agenda)**:
  - **Visualizzazione Cause / Richiesta d'Intervento per Guardia (Riservata a Video, Esclusa da Stampa)**: Consultazione a video da parte della guardia sul campo della motivazione della richiesta d'intervento registrata dalla Centrale Operativa. Nota puramente informativa ad uso interno riservato (non inclusa nelle stampe ufficiali o nei verbali cartacei per rigida tutela della privacy e del segreto d'ufficio).
  - **Modulo Controllo Colonie Feline (Convenzione Comunale)**: Rilevazione e monitoraggio geolocalizzato sulla mappa delle colonie feline locali. Funzionalità di scatto foto sul campo, censimento numerico (gatti maschi/femmine, sterilizzazioni fatte/da fare), anagrafica del referente d'area (gattaro/a), storico dei controlli effettuati con data, ora e guardie verbalizzanti, descrizione stato del territorio e pulsante di stampa scheda in formato A4.
  - **Invio Copia Verbale al Controllato via Email**: Aggiungere un campo email nel modulo dei verbali per consentire l'invio telematico immediato di una copia conforme del verbale di sopralluogo direttamente al cittadino/soggetto controllato, sopperendo alla mancanza di una stampante portatile sul campo.
  - **Banca Dati Anagrafica Controlli (Riservato Amministratori)**: Creazione di un archivio centralizzato che estrapola automaticamente i dati dai verbali / rapporti (nome/cognome proprietario, microchip, data di nascita, esito controlli, eventuali prescrizioni). I dati saranno ricercabili con filtri dedicati e accessibili solo agli amministratori.
  - **Integrazione Richieste d'Intervento via Email (Associazioni Partner)**: Inoltro automatico / Webhook / Parsing delle email di richiesta d'intervento ricevute da associazioni esterne partner per la conversione e creazione automatica delle schede d'intervento sulla mappa radar della Centrale Operativa C.O.E.T.A.
  - **Progetto Centrale Unica C.O.E.T.A. (Smistamento Chiamate e Canali Testuali/Vocali)**: Studio e implementazione di un flusso operativo integrato per la gestione centralizzata delle chiamate dei cittadini al numero unico C.O.E.T.A. Integrazione tra deviazione chiamate, segnalazioni WhatsApp/Telegram, trascrizione o smistamento vocale/testuale e ingaggio immediato della squadra di volontari/guardie in turno sulla mappa radar.
  - **Funzioni OSINT ed Evoluzioni Secondarie**.
- **Vincolo Sessione**: La prossima sessione deve iniziare ESCLUSIVAMENTE con questi argomenti. Nessun altro intervento è autorizzato fino a completamento.
