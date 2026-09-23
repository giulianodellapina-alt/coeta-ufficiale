import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Printer,
  CheckCircle2,
  Shield,
  FileText,
  AlertTriangle,
  Siren,
  Camera,
  Users,
  Clock,
  Database,
  Cpu,
  Truck,
  Send,
  MapPin,
  Lock,
  Layers,
  FileSearch,
  Eye
} from "lucide-react";

interface ManualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handlePrint: (contentSelector: string) => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ open, onOpenChange, handlePrint }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl bg-[#131b2e] border border-slate-700/60 text-slate-100 max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <DialogTitle className="text-2xl font-bold text-white flex items-center justify-between gap-2">
            <span className="flex items-center gap-2.5">
              <BookOpen className="h-6 w-6 text-cyan-400" />
              Manuale Operativo e di Gestione Amministrativa Integrale (Dalla A alla Z)
            </span>
            <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-900/60 px-3 py-1 rounded-full font-mono uppercase tracking-widest hidden sm:inline-block">
              RISERVATO: Comandante Giuliano Della Pina & Consuelo
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-4 py-4 overflow-y-auto">
          <div className="printable-manual-content space-y-10 text-xs text-slate-300 leading-relaxed font-sans print:bg-white print:text-black print:p-8 print:text-xs">
            
            {/* INTESTAZIONE STAMPABILE UFFICIALE */}
            <div className="hidden print:block text-center border-b-2 border-black pb-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono text-slate-600 uppercase">NUCLEO MASSA-CARRARA "ATTILIO BERTOLUCCI"</span>
                <span className="text-[10px] font-mono text-slate-600 uppercase">DOCUMENTO UFFICIALE D'UFFICIO</span>
              </div>
              <h1 className="text-2xl font-extrabold uppercase tracking-widest text-black">NUCLEO GUARDIE ECO-ZOOFILE ATTILIO BERTOLUCCI</h1>
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 mt-1">MANUALE MASTER DI GESTIONE AMMINISTRATIVA, GIURIDICA ED OPERATIVA</h2>
              <p className="text-xs uppercase tracking-widest font-mono text-slate-600 mt-2">
                Guida Integrale d'Ufficio, Procedura dei Verbali, Attività Forense, SOS & Catena di Custodia
              </p>
              <div className="mt-4 pt-2 border-t border-slate-300 text-[11px] text-slate-700 flex justify-between">
                <span>Redatto per: <strong>Comandante Giuliano Della Pina</strong> e <strong>Responsabile Consuelo</strong></span>
                <span>Data Revisione: <strong>Agosto 2026</strong></span>
              </div>
            </div>

            {/* SOMMARIO / INDICE ANALITICO */}
            <section className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl print:bg-slate-100 print:border-black print:text-black space-y-3">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4" /> INDICE ANALITICO DEI CAPITOLI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-300 print:text-black">
                <div>• CAPITOLO 1: Architettura Cloud Real-Time & Valore Legale</div>
                <div>• CAPITOLO 2: Filtro Competenze & Livelli di Accesso (I, II, III)</div>
                <div>• CAPITOLO 3: Gestione Turni, Orari & Regola Ittica/Venatoria</div>
                <div>• CAPITOLO 4: Registro Controlli Territoriali (A4 Landscape)</div>
                <div>• CAPITOLO 5: Verbali Sopralluogo, Sanzionatori & Relazioni</div>
                <div>• CAPITOLO 6: La "Cartella Unica Intervento" (Dossier HQ)</div>
                <div>• CAPITOLO 7: Attività Forense AI & Analisi Cineto-Veterinaria</div>
                <div>• CAPITOLO 8: Protocollo SOS d'Emergenza & Audit Trail</div>
                <div>• CAPITOLO 9: Telecamere Pubbliche, Radar & "Time Travel"</div>
                <div>• CAPITOLO 10: Segnalazione Ambientale Rapida & Rifiuti</div>
                <div>• CAPITOLO 11: Parco Mezzi, Bot Telegram & Guida alla Stampa</div>
              </div>
            </section>

            {/* CAPITOLO 1: ARCHITETTURA CLOUD REAL-TIME & VALORE LEGALE */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 shrink-0" />
                CAPITOLO 1: ARCHITETTURA CLOUD REAL-TIME, MARCA TEMPORALE & CATENA DI CUSTODIA DIGITALE
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>1.1 Dove finiscono i dati ed i verbali compilati sul campo?</strong><br />
                  Quando le guardie operative effettuano un sopralluogo sul territorio di Massa-Carrara (o nei Comuni convenzionati), scattano le foto dei cani o delle irregolarità e compilano il verbale da tablet o smartphone, <strong>nessun dato rimane memorizzato sul dispositivo della guardia</strong>.
                </p>
                <p>
                  Nel momento esatto in cui la pattuglia preme "Salva" o "Associa", l'intero pacchetto informativo viene cifrato e trasmesso in tempo reale all'archivio cloud di <strong>Google Firebase (Cloud Firestore & Firebase Storage)</strong> gestito direttamente dalla Centrale Operativa. Questa architettura garantisce che, anche nell'ipotesi di rottura, furto, smarrimento o sequestro del telefono della guardia, tutti gli atti rimangano intatti, blindati e non alterabili.
                </p>
                <p>
                  <strong>1.2 Marca Temporale e Progressivo di Polizia Giudiziaria:</strong><br />
                  Ad ogni verbale o relazione salvata viene assegnata dal server centrale una marca temporale con millisecondo ed un numero progressivo unico e sequenziale (non modificabile dalle pattuglie). Questo blinda la cronologia degli accertamenti ed impedisce qualsiasi contestazione di manomissione ex post in sede legali o penali.
                </p>
                <p>
                  <strong>1.3 Stabilizzazione Multi-Dispositivo (Isolamento Cache):</strong><br />
                  Per eliminare alla radice gli errori di sincronizzazione tra più computer o tablet dell'ufficio collegate contemporaneamente, il sistema adotta l'inizializzazione della memoria locale a scheda singola (<code>memoryLocalCache()</code>). Ogni computer lavora su una connessione pulita in tempo reale senza sovrascrivere o mandare in blocco gli altri terminali d'ufficio.
                </p>
                <p>
                  <strong>1.4 Notifiche Telegram Bot (@VigilanzaBertolucciBot):</strong><br />
                  Il Bot Telegram d'istituto invia aggiornamenti strutturati sui canali d'ufficio dedicati. Come espressamente richiesto per tutelare la vostra tranquillità d'ufficio ed evitare un continuo trillo di notifiche sui cellulari personali, <strong>l'invio automatico delle notifiche per ogni singolo verbale di routine è stato disabilitato</strong>: i verbali affluiscono silenziosamente e rigorosamente dentro la dashboard HQ.
                </p>
              </div>
            </section>

            {/* CAPITOLO 2: FILTRO COMPETENZE & LIVELLI DI ACCESSO */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                CAPITOLO 2: FILTRO COMPETENZE E LIVELLI DI ACCESSO (CHI FA COSA)
              </h3>
              <p className="text-slate-300 print:text-black">
                Per garantire la massima sicurezza e la netta separazione dei compiti burocratici dalle attività stradali, il programma divide gli utenti in tre livelli rigidi di autorizzazione:
              </p>
              <div className="space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-400">
                  <h4 className="font-bold text-cyan-400 print:text-black text-xs uppercase tracking-wider mb-2">
                    LIVELLO I: GUARDIA OPERATIVA (Pattuglie sul Campo)
                  </h4>
                  <p className="text-slate-300 print:text-black text-xs leading-relaxed">
                    Le guardie sul campo hanno un'interfaccia snella studiata per l'uso stradale in mobilità. Non devono gestire l'archivio burocratico d'ufficio.
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 print:text-black text-xs">
                    <li>Compilazione dei Verbali di 1° Sopralluogo e prescrizioni iniziali.</li>
                    <li>Lettura ed inserimento del codice Microchip con riscontro immediato sull'Anagrafe Canina.</li>
                    <li>Acquisizione di rilievi fotografici con geotag GPS di precisione e marca oraria.</li>
                    <li>Invio della Segnalazione Ambientale Rapida (rifiuti, discariche, animali in pericolo).</li>
                    <li>Attivazione del pulsante SOS di Emergenza (pressione prolungata di 3 secondi).</li>
                    <li>Consultazione del proprio orario di turno, invio disponibilità e segnalazione assenze con motivazione.</li>
                  </ul>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-400">
                  <h4 className="font-bold text-emerald-400 print:text-black text-xs uppercase tracking-wider mb-2">
                    LIVELLO II: RESPONSABILE DI SERVIZIO (Coordinatori di Pattuglia)
                  </h4>
                  <p className="text-slate-300 print:text-black text-xs leading-relaxed">
                    I responsabili coordinano la turnazione sul territorio, verificano l'equipaggiamento e redigono i report ufficiali di fine giornata.
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 print:text-black text-xs">
                    <li>Inserimento e convalida dei turni di servizio sul calendario condiviso.</li>
                    <li>Composizione degli equipaggi (Capo Pattuglia, Conducente, Guardia affiancata) ed assegnazione del veicolo.</li>
                    <li>Redazione delle Relazioni di Servizio di fine turno e invio del sommario al Bot Telegram.</li>
                    <li>Gestione delle chiamate d'intervento e smistamento sulla mappa d'area.</li>
                  </ul>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-400">
                  <h4 className="font-bold text-yellow-400 print:text-black text-xs uppercase tracking-wider mb-2">
                    LIVELLO III: AMMINISTRATORI SUPREMI (Centrale HQ - Giuliano Della Pina & Consuelo)
                  </h4>
                  <p className="text-slate-300 print:text-black text-xs leading-relaxed">
                    Voi possedete il controllo totale e blindato di tutto l'archivio, dei faldoni legali e delle configurazioni. Nessun altro può modificare o eliminare i dati da voi archiviati.
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 print:text-black text-xs">
                    <li>Gestione e creazione della <strong>"Cartella Unica Intervento"</strong> (accorpamento 1° e 2° Sopralluogo).</li>
                    <li>Ricerca multivocale sui faldoni (Microchip, Indirizzo/Località, Specie/Razza, Numero Verbale).</li>
                    <li>Caricamento e associazione di certificati ASL, riscontri della Polizia Municipale e scansioni cartacee (Chunked Upload).</li>
                    <li>Cancellazione protetta degli allegati mediante conferma a doppio click di salvaguardia.</li>
                    <li>Visualizzazione Mappa Radar Live GPS con posizione di tutte le pattuglie e telecamere pubbliche.</li>
                    <li>Modulo Forense AI per analisi cineto-veterinarie, lesioni e riscontri di razza.</li>
                    <li>Procedura di chiusura protetta degli allarmi SOS mediante doppia firma personale di due coordinatori.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* CAPITOLO 3: GESTIONE TURNI & REGOLA ITTICA/VENATORIA */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                CAPITOLO 3: GESTIONE TURNI, REGOLA DELLE 24 ORE & PRIORITÀ ITTICA E VENATORIA
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>3.1 Preavviso d'inserimento turno (Regola delle 24 ore):</strong><br />
                  È stata rimossa la vecchia e rigida regola delle 48 ore. La prassi operativa aziendale prevede di inserire e convalidare i turni sul calendario con <strong>almeno 24 ore di preavviso</strong>. Questo intervallo consente alla Centrale Operativa ed al Bot Telegram di sincronizzare gli orari e notificare tempestivamente gli equipaggi abbinati.
                </p>
                <p>
                  <strong>3.2 Regola di Priorità Ittica e Venatoria (Responsabile Baratta Andrea):</strong><br />
                  Per la specificità tecnica e normativa dei servizi di vigilanza in materia di pesca nelle acque interne e caccia (settore "Ittica e Venatoria"), è stabilita la seguente regola di autorizzazione:
                </p>
                <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl print:bg-amber-50 print:border-amber-400 text-slate-200 print:text-black">
                  <p className="font-bold text-amber-300 print:text-amber-900 mb-1">
                    ⚠️ REGOLA DI CONVALIDA TURNI "ITTICA E VENATORIA":
                  </p>
                  <p className="text-xs leading-relaxed">
                    Il responsabile <strong>Baratta Andrea</strong> possiede la <strong>priorità assoluta</strong> per l'approvazione, la modifica e la convalida di tutti i turni di servizio ricadenti nel settore "Ittica e Venatoria". <br />
                    <em>Procedura di Riserva Operativa:</em> Qualora vi sia un'impossibilità oggettiva, ritardo prolungato o assenza del responsabile Baratta Andrea in prossimità dell'avvio del servizio, il sistema consente l'<strong>intervento sostitutivo di convalida d'urgenza</strong> da parte degli Amministratori Generali o del Comandante, al fine esclusivo di non paralizzare i controlli antibracconaggio sul territorio.
                  </p>
                </div>
                <p>
                  <strong>3.3 Composizione degli Equipaggi e Mezzo Assegnato:</strong><br />
                  In fase di programmazione del turno, il responsabile seleziona obbligatoriamente il Capo Pattuglia (responsabile dell'atto), il Conducente ed il veicolo di servizio (es. Fiat Panda 4x4, Subaru, ecc.). Il sistema impedisce di assegnare il medesimo veicolo a due turni sovrapposti nello stesso quadrante orario.
                </p>
              </div>
            </section>

            {/* CAPITOLO 4: REGISTRO CONTROLLI TERRITORIALI (A4 LANDSCAPE) */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                CAPITOLO 4: REGISTRO CONTROLLI TERRITORIALI CONTINUATIVI & STAMPA A4 LANDSCAPE (ORIZZONTALE)
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>4.1 Cos'è il Registro dei Controlli sul Territorio?</strong><br />
                  A differenza del Verbale di Sopralluogo (utilizzato quando si contesta un'infrazione o si emette una prescrizione formale), il <strong>Registro Controlli Territoriali</strong> serve per documentare le attività continuative di pattugliamento ordinario e prevenzione in aree fisse ad alta frequenza (es. Passeggiata a Mare, Molo di Ponente, Parchi Comunali, spiagge).
                </p>
                <p>
                  <strong>4.2 Separazione dalle Statistiche e Stampa A4 Orizzontale (Stile Excel):</strong><br />
                  Per evitare lo spreco continuo di carta e toner, il registro è stato nettamente separato dalle statistiche grafiche ed è dotato di una specifica funzione di **Stampa A4 Landscape (Orizzontale)**.
                </p>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 print:bg-white print:border-black text-xs leading-relaxed space-y-2">
                  <p className="font-bold text-cyan-300 print:text-black">
                    📄 CARATTERISTICHE DELLA STAMPA ORIZZONTALE A4:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 print:text-black">
                    <li>Intestazione Ufficiale dell'Aquila e del Comune di riferimento (es. "Controlli nel Comune di Carrara").</li>
                    <li>Griglia a righe compatte stile foglio di calcolo Excel con: Data/Ora, Località, Specie/Razza, Microchip, Proprietario/Detentore, Esito e Guardie Operanti.</li>
                    <li>Permette di stampare fino a <strong>25-30 controlli singoli su un unico foglio A4</strong> anziché un foglio per ogni cane, tagliando del 90% i costi di stampa.</li>
                  </ul>
                </div>
                <p>
                  <strong>4.3 Sincronizzazione Automatica Microchip nell'Anagrafe Canina:</strong><br />
                  Ogni volta che la guardia inserisce un cane controllato sul territorio nel registro, il sistema estrapola all'istante l'ID Microchip e la razza, memorizzandoli o aggiornandoli automaticamente nell'<strong>Archivio Anagrafe Canina centralizzato (`canine_certificates`)</strong>.
                </p>
              </div>
            </section>

            {/* CAPITOLO 5: VERBALI DI SOPRALLUOGO, SANZIONATORI & RELAZIONI */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                CAPITOLO 5: VERBALI DI SOPRALLUOGO, SANZIONATORI, RELAZIONI & INVIO EMAIL
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>5.1 Verbale di Primo Sopralluogo (Accertamento & Prescrizioni):</strong><br />
                  Viene redatto dalla pattuglia quando riscontra un'irregolarità sanabile (es. detenzione cane a catena corta, mancanza di cuccia idonea, mancata registrazione all'anagrafe). La guardia descrive i fatti e fissa una **Prescrizione Operativa con termine temporale** (es. "10 giorni per l'adeguamento delle strutture").
                </p>
                <p>
                  <strong>5.2 Verbale di Secondo Sopralluogo (Verifica Adempimenti):</strong><br />
                  Alla scadenza dei termini, la pattuglia torna sul posto per effettuare il secondo sopralluogo e verificare se il proprietario ha adempiuto alle prescrizioni. Se ha adempiuto, il verbale si chiude positivamente; se l'irregolarità persiste, il verbale viene trasformato in Verbale Sanzionatorio.
                </p>
                <p>
                  <strong>5.3 Verbali Sanzionatori (Sanzioni Amministrative):</strong><br />
                  Formato dedicato all'applicazione delle sanzioni pecuniarie per violazioni di leggi regionali, regolamenti comunali o norme sulla tutela animale. Contiene gli articoli violati, l'importo della sanzione in misura ridotta, le coordinate di pagamento ed i termini per presentare scritti difensivi al Sindaco o al Prefetto.
                </p>
                <p>
                  <strong>5.4 Relazioni di Servizio:</strong><br />
                  Rapporto riassuntivo compilato dal Capo Pattuglia al termine del quadrante orario. Riporta il chilometraggio iniziale e finale del mezzo, l'itinerario seguito, le persone ed i cani controllati e gli eventuali eventi rilevanti.
                </p>
                <p>
                  <strong>5.5 Invio Automatico Copia Conforme PDF/A4 via Email alla Guardia Verbalizzante:</strong><br />
                  Per garantire la disponibilità immediata del documento senza bisogno di stampanti portatili nel veicolo, alla chiusura del verbale il sistema invia automaticamente una **copia conforme in formato PDF A4** direttamente alla casella di posta elettronica della guardia verbalizzante.
                </p>
              </div>
            </section>

            {/* CAPITOLO 6: LA "CARTELLA UNICA INTERVENTO" (DOSSIER HQ) */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <FileSearch className="h-4 w-4 shrink-0" />
                CAPITOLO 6: LA "CARTELLA UNICA INTERVENTO" (DOSSIER UNIFICATO HQ)
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>6.1 Cos'è il Dossier Unificato e perché risolve il disordine d'ufficio?</strong><br />
                  In passato, il primo ed il secondo sopralluogo restavano due schede separate e difficili da collegare. La <strong>Cartella Unica Intervento</strong> accorpa automaticamente il 1° ed il 2° Sopralluogo, compresi gli allegati fotografici ed i riscontri di verifica prescrizioni, dentro un unico fascicolo digitale continuo.
                </p>
                <p>
                  <strong>6.2 Filtri di Ricerca Multivocale Blindata:</strong><br />
                  La ricerca e la filtrazione nell'Archivio HQ avvengono su **quattro voci chiave stabili**:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 print:text-black text-xs">
                  <li><strong>ID Microchip dell'Animale</strong> (chiave primaria univoca biologica).</li>
                  <li><strong>Località / Indirizzo preciso dell'intervento</strong>.</li>
                  <li><strong>Specie e Razza dell'animale</strong>.</li>
                  <li><strong>Numero del Verbale Iniziale</strong>.</li>
                </ul>
                <p className="text-amber-300 print:text-amber-900 text-xs italic bg-amber-950/30 print:bg-amber-50 p-2 rounded border border-amber-800/40">
                  ⚠️ <strong>MOTIVAZIONE GIURIDICA:</strong> La ricerca primaria per nome del proprietario/custode del cane è stata disabilitata poiché la persona controllata o chi detiene materialmente l'animale può variare tra il primo ed il secondo controllo (es. subentro di un familiare o passaggio di custodia). La ricerca su Microchip e Indirizzo garantisce di non perdere mai il fascicolo.
                </p>
                <p>
                  <strong>6.3 Divisione dei Compiti: Guardia sul Campo vs Amministrazione HQ:</strong><br />
                  • <em>In Campo:</em> La guardia non perde tempo a compilare schede complesse. Se il cittadino mostra un documento ASL o certificato, la guardia fa una foto nitida col tablet e la invia con geotag automatico.<br />
                  • <em>In Sede (HQ - Giuliano & Consuelo):</em> L'amministratore dal computer dell'ufficio apre la Cartella Unica, carica le scansioni ufficiali (modulo iscrizione ASL, verbali Polizia Municipale) e le associa definitivamente al dossier.
                </p>
                <p>
                  <strong>6.4 Gestione Tecnica degli Allegati (Chunked Upload & Blob URL):</strong><br />
                  - <em>Caricamento a Blocchi (Chunked Upload):</em> Permette di caricare PDF pesanti o scansioni ad alta risoluzione senza far bloccare il programma o rallentare la connessione.<br />
                  - <em>Visualizzatore "Blob URL":</em> Converte all'istante i documenti protetti in indirizzi temporanei sicuri per eludere i blocchi popup dei browser e mostrare l'anteprima del foglio in sovraimpressione.<br />
                  - <em>Cancellazione Protetta (Doppio Click):</em> Il pulsante di eliminazione degli allegati erronei richiede un doppio click di sicurezza (bottone rosso lampeggiante "Rimuovi?" ed "Annulla") per evitare cancellazioni accidentali.
                </p>
              </div>
            </section>

            {/* CAPITOLO 7: ATTIVITÀ FORENSE AI */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Cpu className="h-4 w-4 shrink-0" />
                CAPITOLO 7: ATTIVITÀ FORENSE AI & ANALISI CINETO-VETERINARIA
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>7.1 Cos'è il Modulo di Analisi Forense AI?</strong><br />
                  È lo strumento di supporto diagnostico ed investigativo avanzato che utilizza il modello di intelligenza artificiale <strong>Gemini 3.5 Flash / Vision</strong>. Consente all'amministratore ed agli operatori qualificati di analizzare fotografie di cani, lesioni cutanee, condizioni di malnutrizione, strutture detentive o documenti identificativi dubbi.
                </p>
                <p>
                  <strong>7.2 Come funziona la perizia visiva informatica:</strong><br />
                  L'operatore carica l'immagine nell'area Forense e seleziona il tipo di analisi richiesta (es. "Identificazione Razza & Morfologia", "Verifica Lesioni e Stato Nutrizionale", "Analisi Idoneità Struttura Detentiva"). Il motore elabora il fotogramma e fornisce un referto analitico dettagliato con riferimenti normativi e cinofili.
                </p>
                <div className="bg-red-950/40 border border-red-800/60 p-4 rounded-xl print:bg-red-50 print:border-red-400 text-slate-200 print:text-black">
                  <p className="font-bold text-red-300 print:text-red-900 mb-1">
                    ⚖️ DISCLAIMER LEGALE FORENSE (Da conoscere ed allegare agli atti):
                  </p>
                  <p className="text-xs leading-relaxed italic">
                    "Questa analisi è generata da un motore di Intelligenza Artificiale per finalità analitiche d'ufficio e supporto investigativo interno. Trattandosi di riscontri digitali dedotti telematicamente, non rivestono valore di perizia medico-legale autografa né sostituiscono il sopralluogo reale ed il referto clinico di un medico veterinario iscritto all'albo. Trovano applicazione per orientare le indagini di Polizia Giudiziaria e fondare richieste di ispezione urgente alla ASL competente."
                  </p>
                </div>
              </div>
            </section>

            {/* CAPITOLO 8: PROTOCOLLO SOS D'EMERGENZA & AUDIT TRAIL */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Siren className="h-4 w-4 shrink-0" />
                CAPITOLO 8: PROTOCOLLO SOS D'EMERGENZA BLINDATO, MAPPA RADAR & AUDIT TRAIL
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  L'allarme SOS rappresenta la procedura più delicata per la sicurezza fisica degli operatori sul campo. L'interfaccia adotta un pulsante fluttuante a destra ad effetto radar ed un flusso operativo **anti-panico provvisto di registro legale cieco (Audit Trail)**.
                </p>
                <h4 className="font-bold text-red-400 print:text-black text-xs uppercase tracking-wider">
                  FLUSSO DI CENTRALE OPERATIVA PASSO-PASSO:
                </h4>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300 print:text-black text-xs">
                  <li>
                    <strong>Fase 1: Presa in carico visiva (Radar).</strong> All'attivazione dell'SOS, sul monitor dell'ufficio appare il segnale ad effetto radar rosso e sulla mappa viene tracciato il cerchio di pericolo attorno al marker GPS della pattuglia.
                  </li>
                  <li>
                    <strong>Fase 2: Contatto di Riscontro e Registro Audit Trail Automatico.</strong> L'operatore HQ apre la scheda SOS e clicca sui pulsanti rapidi "Chiama" o "WhatsApp".<br />
                    <span className="text-cyan-300 print:text-black font-semibold">
                      ⚠️ REGISTRAZIONE AUTOMATICA (Auto-Logger): Il sistema registra istantaneamente nel registro cieco non modificabile una riga di Audit Trail (es. "L'operatore Giuliano Della Pina ha avviato chiamata di verifica alle ore 14:32:01"). Questo registro ha valore di prova in sede penale per dimostrare la tempestività dei soccorsi.
                    </span>
                  </li>
                  <li>
                    <strong>Fase 3: Selezione Falso Allarme vs Allerta Globale.</strong><br />
                    • <em>Falso Allarme (Pressione Accidentale):</em> Se la guardia conferma telefonicamente l'assenza di pericolo, si seleziona "Falso Allarme / Risolvi".<br />
                    • <em>Allerta Globale Reale (Aggressione/Pericolo):</em> Se la situazione è grave, l'operatore chiama il 112 (Carabinieri/Polizia) e clicca su <strong>"ATTIVA ALLERTA GLOBALE"</strong>. Questa azione sblocca la sirena visiva/acustica su tutti i terminali delle guardie della provincia per farle convergere sul posto.
                  </li>
                  <li>
                    <strong>Fase 4: Chiusura Legale con Doppia Firma Personale.</strong> Per congedare definitivamente l'SOS dallo schermo, occorre compilare il resoconto scritto ed inserire le matricole/chiavi personali di **due Coordinatori/Amministratori d'ufficio** per la sottoscrizione digitale su Firebase.
                  </li>
                </ol>
              </div>
            </section>

            {/* CAPITOLO 9: TELECAMERE PUBBLICHE & "TIME TRAVEL" */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Eye className="h-4 w-4 shrink-0" />
                CAPITOLO 9: TELECAMERE PUBBLICHE, MAPPA RADAR & FUNZIONE "TIME TRAVEL"
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>9.1 Mappatura delle Webcam e Varchi Stradali Comunali:</strong><br />
                  Sulla Mappa Radar della Centrale Operativa sono censiti i punti di ripresa pubblici legali e le webcam meteo stradali della provincia di Massa-Carrara (es. Ponti di Anderlino, Marina di Carrara, centro storico, varchi Targasystem). Cliccando sul marker della telecamera, l'amministratore visualizza il proprietario dell'impianto ed il flusso streaming diretto.
                </p>
                <p>
                  <strong>9.2 Come funziona il tasto "Time Travel" (Viaggio nel Tempo):</strong><br />
                  In caso di abbandono di animale, sversamento abusivo o sinistro avvenuto in un orario pregresso, l'amministratore sposta il selettore orario sull'ora esatta del fatto.
                </p>
                <p className="bg-slate-900 print:bg-slate-100 p-3 rounded-lg border border-slate-800 print:border-slate-400 text-xs">
                  <strong>📜 GENERAZIONE AUTOMATICA PEC PER SEQUESTRO FOTOGRAMMI:</strong><br />
                  Il sistema calcola il tempo residuo di sovrascrittura delle immagini del varco comunale (di norma da 24 a 72 ore) e **compila automaticamente la richiesta formale d'urgenza di estrapolazione fotogrammi già intestata** alla Polizia Municipale competente ed alla Procura della Repubblica, pronta per essere inviata via PEC prima della cancellazione automatica dei nastri.
                </p>
              </div>
            </section>

            {/* CAPITOLO 10: SEGNALAZIONE AMBIENTALE RAPIDA */}
            <section className="space-y-4 py-2 border-b border-slate-800/60 print:border-b-2 print:border-black">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                CAPITOLO 10: SEGNALAZIONE AMBIENTALE RAPIDA & RIFIUTI
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  Strumento ad utilizzo immediato presente sia nella dashboard che nei sottomenu, rinominato **"Segnalazione Ambientale Rapida"** per evitare confusioni con gli allarmi SOS.
                </p>
                <p>
                  Permette alle pattuglie di geolocalizzare istantaneamente discariche abusive, sversamenti di sostanze tossiche, carcasse o situazioni di degrado urbano. L'amministratore HQ dalla mappa può aggiornare lo stato di avanzamento della segnalazione tra: <em>"In Attesa"</em>, <em>"In Corso di Bonifica"</em> e <em>"Risolto / Archivio"</em>.
                </p>
              </div>
            </section>

            {/* CAPITOLO 11: PARCO MEZZI, TELEGRAM BOT & GUIDA PRATICA ALLA STAMPA A4 */}
            <section className="space-y-4 py-2">
              <h3 className="text-sm font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-2">
                <Printer className="h-4 w-4 shrink-0" />
                CAPITOLO 11: PARCO MEZZI, BOT TELEGRAM & GUIDA PRATICA ALLA STAMPA (RISMA & TONER)
              </h3>
              <div className="space-y-3 text-slate-300 print:text-black leading-relaxed">
                <p>
                  <strong>11.1 Registro Parco Mezzi di Servizio:</strong><br />
                  Sezione dedicata all'inserimento dei veicoli del Nucleo. Per ciascun mezzo si registrano la targa, il chilometraggio ultimo, la data di revisione/assicurazione, la presenza della dotazione di bordo (lettore microchip, gabbia di contenzione, kit primo soccorso) e le segnalazioni di guasti meccanici.
                </p>
                <p>
                  <strong>11.2 Istruzioni del Bot Telegram (@VigilanzaBertolucciBot):</strong><br />
                  Il Bot d'istituto gestisce il canale operativo interno inviando i promemoria dei turni e la ricezione delle relazioni di servizio.
                </p>
                
                {/* GUIDA PRATICA ALLA STAMPA CARTACEA */}
                <div className="bg-cyan-950/40 border border-cyan-800/60 p-5 rounded-xl print:bg-slate-100 print:border-black text-slate-200 print:text-black space-y-3">
                  <h4 className="font-bold text-cyan-300 print:text-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Printer className="h-4 w-4" /> GUIDA PRATICA D'UFFICIO ALLA STAMPA DEL MANUALE (1000 STAMPE):
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Per stampare questo manuale in modo impeccabile utilizzando la vostra risma di carta ed il toner nuovo:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                    <li>Clicca sul pulsante azzurro in basso <strong>"Stampa Manuale Completo"</strong>.</li>
                    <li>Nella finestra di stampa del browser (Chrome o Edge), seleziona la tua stampante laser.</li>
                    <li>Verifica che il formato foglio sia impostato su <strong>A4 (210 x 297 mm)</strong> ed orientamento <strong>Verticale (Portrait)</strong>.</li>
                    <li>Abilita l'opzione <strong>"Stampa Fronte-Retro"</strong> (sul lato lungo) per dimezzare l'uso dei fogli.</li>
                    <li>Nelle impostazioni avanzate della finestra di stampa, spunta la casella <strong>"Grafica di Sfondo" (Background Graphics)</strong> se desideri mantenere attive le linee di divisione ed i box colorati.</li>
                    <li>Fai clic su <strong>Stampa</strong>. Il documento è formattato per impaginarsi automaticamente in modo pulito e senza sovrapposizioni.</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* PIE DI PAGINA CONCLUSIVO */}
            <div className="pt-6 border-t-2 border-slate-800 print:border-black text-center text-[10px] text-slate-400 print:text-black font-mono">
              <p>NUCLEO GUARDIE ECO-ZOOFILE ATTILIO BERTOLUCCI - SISTEMA GESTIONALE E OPERATIVO CENTRALE HQ</p>
              <p className="mt-1">Documento redatto ad esclusivo uso d'ufficio e consultazione del Comandante Giuliano Della Pina e Consuelo.</p>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-4 mt-2">
          <span className="text-[10px] text-amber-400 italic text-center sm:text-left">
            Nota: In caso di problemi di impaginazione nella finestra di stampa, abilita la modalità schermo intero.
          </span>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              onClick={() => handlePrint(".printable-manual-content")}
              className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg active:scale-95 transition-all text-xs font-semibold px-5 h-10 rounded-xl cursor-pointer"
            >
              <Printer className="h-4 w-4 mr-2" /> Stampa Manuale Completo
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-5 h-10 rounded-xl cursor-pointer"
            >
              Chiudi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
