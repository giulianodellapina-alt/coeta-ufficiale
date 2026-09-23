import { SanctionArticle } from '../types';

export const SANCTION_ARTICLES: SanctionArticle[] = [
  // ==========================================
  // --- LEGGI REGIONALI TOSCANA (SETTORE ZOOFILA) ---
  // ==========================================
  {
    id: 'lr-59-2009-art-5-c1',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 5',
    comma: 'Comma 1',
    descrizione: 'Mancata iscrizione del cane all\'anagrafe canina regionale entro il 60° giorno di vita o entro 30 giorni dal possesso.',
    paroleChiave: ['anagrafe', 'iscrizione', 'microchip', 'anagrafica', 'cane', 'possesso'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'regionale',
    noteOperative: 'Applicabile a tutti i comuni della Toscana in assenza di specifica sanzione comunale.'
  },
  {
    id: 'lr-59-2009-art-5-c3',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 5',
    comma: 'Comma 3',
    descrizione: 'Mancata identificazione ed applicazione del microchip al cane nei termini prescritti.',
    paroleChiave: ['microchip', 'identificazione', 'chip', 'marcatura', 'applicazione'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'regionale'
  },
  {
    id: 'lr-59-2009-art-18-cuccia',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 18',
    comma: 'Comma 1',
    descrizione: 'Cuccia non regolamentare, priva di idoneo riparo dalle intemperie, umida, con dimensioni insufficienti o sprovvista di isolamento dal suolo.',
    paroleChiave: ['cuccia', 'ricovero', 'casotto', 'intemperie', 'riparo', 'spazio', 'umidita', 'protezione', 'isolamento', 'fango', 'freddo'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'regionale',
    noteOperative: 'Legge quadro regionale per le caratteristiche igienico-sanitarie dei ricoveri animali.'
  },
  {
    id: 'lr-59-2009-art-18-recinto',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 18',
    comma: 'Comma 2',
    descrizione: 'Recinto non idoneo, di dimensioni inferiori a quelle minime garantite per la razza e stazza o privo di zona ombreggiata ed abbeverata.',
    paroleChiave: ['recinto', 'gabbia', 'spazio', 'dimensione', 'angusto', 'buio', 'recinzione', 'ombra', 'acqua'],
    sanzioneMin: 150,
    sanzioneMax: 900,
    sanzioneRidotta: 300,
    settore: 'zoofila',
    ambito: 'regionale'
  },
  {
    id: 'lr-59-2009-art-18-catena',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 18',
    comma: 'Comma 3',
    descrizione: 'Detenzione dell\'animale a catena o con altri strumenti di contenzione fissa, dolorosa o permanentemente restrittiva.',
    paroleChiave: ['catena', 'legare', 'contenzione', 'collare a strozzo', 'catenella', 'bloccato', 'fune'],
    sanzioneMin: 300,
    sanzioneMax: 1800,
    sanzioneRidotta: 600,
    settore: 'zoofila',
    ambito: 'regionale'
  },
  {
    id: 'lr-59-2009-art-21-vagabondaggio',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 21',
    comma: 'Comma 1',
    descrizione: 'Omessa custodia di cane, lasciato libero di vagare su suolo pubblico o aperto al pubblico senza adeguata sorveglianza.',
    paroleChiave: ['vagante', 'libero', 'omessa custodia', 'sciolto', 'vagabondaggio', 'custodia', 'incustodito'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'regionale'
  },
  {
    id: 'lr-59-2009-art-21-guinzaglio',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 21',
    comma: 'Comma 2',
    descrizione: 'Conduzione del cane nei luoghi pubblici o aperti al pubblico senza l\'uso del guinzaglio (lunghezza max 1.50m) o sprovvisto di museruola al seguito.',
    paroleChiave: ['guinzaglio', 'museruola', 'conduzione', 'luoghi pubblici', 'parco', 'passeggiata', 'sciolto'],
    sanzioneMin: 80,
    sanzioneMax: 480,
    sanzioneRidotta: 160,
    settore: 'zoofila',
    ambito: 'regionale'
  },
  {
    id: 'lr-59-2009-art-22-deiezioni',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 22',
    comma: 'Comma 1',
    descrizione: 'Mancata asportazione immediata delle deiezioni solide o mancata pulizia con acqua delle deiezioni liquide sul suolo pubblico o ad uso pubblico.',
    paroleChiave: ['deiezioni', 'feci', 'cacca', 'minzione', 'pulizia', 'sacchetto', 'bottiglietta', 'marciapiede', 'strada'],
    sanzioneMin: 80,
    sanzioneMax: 480,
    sanzioneRidotta: 160,
    settore: 'zoofila',
    ambito: 'regionale'
  },
  {
    id: 'lr-59-2009-art-8-comunicazioni',
    legge: 'L.R.T. 59/2009',
    articolo: 'Art. 8',
    comma: 'Comma 2',
    descrizione: 'Omessa comunicazione alla banca dati regionale di variazione di residenza, cessione, smarrimento o decesso del cane entro i termini stabiliti.',
    paroleChiave: ['cessione', 'morte', 'decesso', 'smarrimento', 'cambio residenza', 'trasferimento', 'comunicazione'],
    sanzioneMin: 50,
    sanzioneMax: 300,
    sanzioneRidotta: 100,
    settore: 'zoofila',
    ambito: 'regionale'
  },

  // ==========================================
  // --- REGOLAMENTI COMUNALI SPECIFICI (MASSA-CARRARA & LUNIGIANA) ---
  // ==========================================
  
  // CARRARA
  {
    id: 'reg-com-carrara-cuccia',
    legge: 'Regolamento Tutela Animali Carrara',
    articolo: 'Art. 18',
    comma: 'Comma 1',
    descrizione: 'Cuccia non a norma o ricovero per cane privo dei requisiti dimensionali e di coibentazione previsti dal Regolamento Comunale di Carrara.',
    paroleChiave: ['cuccia', 'ricovero', 'casotto', 'riparo', 'carrara', 'dimensione'],
    sanzioneMin: 150,
    sanzioneMax: 900,
    sanzioneRidotta: 300,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'CARRARA',
    noteOperative: 'Prevale sulla norma regionale nel territorio del Comune di Carrara.'
  },
  {
    id: 'reg-com-carrara-deiezioni',
    legge: 'Regolamento Polizia Urbana Carrara',
    articolo: 'Art. 15',
    comma: 'Comma 2',
    descrizione: 'Mancata raccolta delle deiezioni canine e mancata dotazione di idonei strumenti (sacchetto e contenitore d\'acqua) nel territorio di Carrara.',
    paroleChiave: ['deiezioni', 'feci', 'sacchetto', 'carrara', 'bottiglietta', 'pulizia'],
    sanzioneMin: 100,
    sanzioneMax: 500,
    sanzioneRidotta: 100,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'CARRARA'
  },
  {
    id: 'reg-com-carrara-guinzaglio',
    legge: 'Regolamento Polizia Urbana Carrara',
    articolo: 'Art. 24',
    comma: 'Comma 1',
    descrizione: 'Conduzione di cane senza guinzaglio nei centri abitati o nelle zone turistiche del Comune di Carrara.',
    paroleChiave: ['guinzaglio', 'museruola', 'sciolto', 'carrara', 'centro abitato'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'CARRARA'
  },

  // MASSA
  {
    id: 'reg-com-massa-cuccia-recinto',
    legge: 'Regolamento Tutela Animali Massa',
    articolo: 'Art. 19',
    comma: 'Comma 1-2',
    descrizione: 'Cuccia non idonea o recinto sprovvisto di pavimentazione drenante, riparo solare e costante erogazione di acqua potabile nel Comune di Massa.',
    paroleChiave: ['cuccia', 'recinto', 'riparo', 'massa', 'acqua', 'pavimento'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'MASSA',
    noteOperative: 'Sanzione specifica stabilita dal Sindaco del Comune di Massa.'
  },
  {
    id: 'reg-com-massa-guinzaglio',
    legge: 'Regolamento Tutela Animali Massa',
    articolo: 'Art. 12',
    comma: 'Comma 3',
    descrizione: 'Conduzione di cane in aree pubbliche o giardini comunali senza l\'uso del guinzaglio nel Comune di Massa.',
    paroleChiave: ['guinzaglio', 'museruola', 'massa', 'parco', 'sciolto'],
    sanzioneMin: 80,
    sanzioneMax: 480,
    sanzioneRidotta: 160,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'MASSA'
  },
  {
    id: 'reg-com-massa-deiezioni',
    legge: 'Regolamento Polizia Urbana Massa',
    articolo: 'Art. 33',
    comma: 'Comma 1',
    descrizione: 'Omessa pulizia e lavaggio delle deiezioni canine con liquido igienizzante/acqua sul suolo pubblico di Massa.',
    paroleChiave: ['deiezioni', 'feci', 'sacchetto', 'massa', 'lavaggio', 'bottiglietta'],
    sanzioneMin: 100,
    sanzioneMax: 500,
    sanzioneRidotta: 100,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'MASSA'
  },

  // MONTIGNOSO
  {
    id: 'reg-com-montignoso-cuccia',
    legge: 'Regolamento Benessere Animali Montignoso',
    articolo: 'Art. 10',
    comma: 'Comma 1',
    descrizione: 'Detenzione di cane in cuccia non conforme o spazi restrittivi/angusti nel Comune di Montignoso.',
    paroleChiave: ['cuccia', 'catena', 'recinto', 'montignoso', 'riparo'],
    sanzioneMin: 150,
    sanzioneMax: 900,
    sanzioneRidotta: 300,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'MONTIGNOSO'
  },
  {
    id: 'reg-com-montignoso-deiezioni',
    legge: 'Regolamento Benessere Animali Montignoso',
    articolo: 'Art. 14',
    comma: 'Comma 2',
    descrizione: 'Mancata asportazione deiezioni e mancato uso del guinzaglio nel Comune di Montignoso.',
    paroleChiave: ['guinzaglio', 'deiezioni', 'montignoso', 'feci'],
    sanzioneMin: 80,
    sanzioneMax: 480,
    sanzioneRidotta: 160,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'MONTIGNOSO'
  },

  // AULLA (LUNIGIANA)
  {
    id: 'reg-com-aulla-norme',
    legge: 'Regolamento Comunale Aulla',
    articolo: 'Art. 8',
    comma: 'Comma 1',
    descrizione: 'Inosservanza delle prescrizioni comunali per la custodia, cuccia e conduzione di cani nel Comune di Aulla.',
    paroleChiave: ['cuccia', 'microchip', 'guinzaglio', 'aulla', 'recinto', 'lunigiana'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'AULLA'
  },

  // PONTREMOLI (LUNIGIANA)
  {
    id: 'reg-com-pontremoli-norme',
    legge: 'Regolamento Polizia Locale Pontremoli',
    articolo: 'Art. 11',
    comma: 'Comma 2',
    descrizione: 'Violazione delle norme igienico-sanitarie sulla custodia e ricovero degli animali da affezione nel Comune di Pontremoli.',
    paroleChiave: ['cuccia', 'deiezioni', 'guinzaglio', 'pontremoli', 'lunigiana'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'PONTREMOLI'
  },

  // FIVIZZANO (LUNIGIANA)
  {
    id: 'reg-com-fivizzano-norme',
    legge: 'Regolamento Tutela Animali Fivizzano',
    articolo: 'Art. 9',
    comma: 'Comma 1',
    descrizione: 'Mancata messa a norma della cuccia e del recinto di contenzione canina nel Comune di Fivizzano.',
    paroleChiave: ['cuccia', 'recinto', 'fivizzano', 'lunigiana', 'riparo'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'zoofila',
    ambito: 'comunale',
    comune: 'FIVIZZANO'
  },

  // ==========================================
  // --- SETTORE ITTICA (Pesca Acque Interne - L.R.T. 7/2005) ---
  // ==========================================
  {
    id: 'lrt-7-2005-licenza',
    legge: 'L.R.T. 7/2005',
    articolo: 'Art. 15',
    comma: 'Comma 1',
    descrizione: 'Esercizio della pesca dilettantistico-sportiva nelle acque interne della Toscana senza regolare licenza o ricevuta di versamento regionale.',
    paroleChiave: ['pesca', 'licenza', 'versamento', 'fiume', 'torrente', 'canna', 'senza licenza'],
    sanzioneMin: 100,
    sanzioneMax: 600,
    sanzioneRidotta: 200,
    settore: 'ittica',
    ambito: 'regionale'
  },
  {
    id: 'lrt-7-2005-divieto',
    legge: 'L.R.T. 7/2005',
    articolo: 'Art. 18',
    comma: 'Comma 3',
    descrizione: 'Pesca in periodo di divieto biologico o con l\'ausilio di attrezzi/nasse vietate o pesca di fauna ittica sottomisura.',
    paroleChiave: ['pesca', 'divieto', 'nassa', 'rete', 'misura minima', 'trota', 'sottomisura'],
    sanzioneMin: 200,
    sanzioneMax: 1200,
    sanzioneRidotta: 400,
    settore: 'ittica',
    ambito: 'regionale'
  },

  // ==========================================
  // --- SETTORE VENATORIA (Caccia - L.R.T. 3/1994 & L. 157/92) ---
  // ==========================================
  {
    id: 'lrt-3-1994-distanze',
    legge: 'L.R.T. 3/1994',
    articolo: 'Art. 28',
    comma: 'Comma 1',
    descrizione: 'Esercizio venatorio a distanza inferiore a 150 metri da fabbricati, abitazioni o strade carrozzabili.',
    paroleChiave: ['caccia', 'focolare', 'distanza', 'fabbricato', 'strada', 'fucile', 'abitazione', 'sparo'],
    sanzioneMin: 206,
    sanzioneMax: 1239,
    sanzioneRidotta: 412,
    settore: 'venatoria',
    ambito: 'regionale'
  },
  {
    id: 'lrt-3-1994-tesserino',
    legge: 'L.R.T. 3/1994',
    articolo: 'Art. 35',
    comma: 'Comma 2',
    descrizione: 'Mancata o errata annotazione sul tesserino venatorio regionale della giornata di caccia o della fauna abbattuta.',
    paroleChiave: ['tesserino', 'caccia', 'annotazione', 'capi', 'abbattimento', 'fagiano', 'cinghiale'],
    sanzioneMin: 77,
    sanzioneMax: 464,
    sanzioneRidotta: 154,
    settore: 'venatoria',
    ambito: 'regionale'
  },

  // ==========================================
  // --- SETTORE AMBIENTALE (D.Lgs. 152/2006 & L.R.T. 39/2000) ---
  // ==========================================
  {
    id: 'dlgs-152-2006-rifiuti',
    legge: 'D.Lgs. 152/2006',
    articolo: 'Art. 255',
    comma: 'Comma 1',
    descrizione: 'Abbandono o deposito incontrollato di rifiuti non pericolosi sul suolo ad opera di privati cittadini.',
    paroleChiave: ['rifiuti', 'abbandono', 'immondizia', 'spazzatura', 'sacchetto', 'rottami', 'plastica', 'ambiente'],
    sanzioneMin: 300,
    sanzioneMax: 3000,
    sanzioneRidotta: 600,
    settore: 'ambientale',
    ambito: 'nazionale'
  },
  {
    id: 'lrt-39-2000-abbruciamenti',
    legge: 'L.R.T. 39/2000',
    articolo: 'Art. 76',
    comma: 'Comma 4',
    descrizione: 'Accensione fuochi ed abbruciamento di residui vegetali nei periodi a rischio incendio o senza le dovute distanze di sicurezza dal bosco.',
    paroleChiave: ['fuoco', 'abbruciamento', 'rogo', 'fumo', 'incendio', 'vegetali', 'sterpaglie', 'bosco'],
    sanzioneMin: 240,
    sanzioneMax: 2400,
    sanzioneRidotta: 480,
    settore: 'ambientale',
    ambito: 'regionale'
  }
];
