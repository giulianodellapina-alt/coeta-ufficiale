
export interface Shift {
  id: string;
  guardName: string;
  guardId: string;
  matricola?: string;
  sector: 'ittica' | 'venatoria' | 'zoofila' | 'ambientale';
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  createdBy: string;
  createdAt?: any;
  status: 'pending' | 'approved' | 'cancelled' | 'cancellation_request';
  approvedBy?: string;
  approvedAt?: any;
  cancelledAt?: any;
  cancelledBy?: string;
  cancellationReason?: string;
  archivedAt?: any;
  archivedBy?: string;
}

export interface Guard {
  id: string;
  name: string;
  surname?: string;
  matricola: string;
  photo?: string;
  email?: string;
  phone?: string;
  emergencyPhone?: string;
  rank?: string;
  role: 'guardia' | 'responsabile' | 'admin';
  qualifications: string[];
  uid?: string;
  isDisabled?: boolean;
  isNotActive?: boolean;
  banReason?: string;
  section?: string;
  privateInfo?: GuardPrivateInfo;
  isTracingAuthorized?: boolean;
  isAvailable?: boolean;
  statusMessage?: string;
  telegramChatId?: string;
  lastLocation?: {
    lat: number;
    lng: number;
    updatedAt: any;
  };
}

export interface GuardPrivateInfo {
  name?: string;
  surname?: string;
  birthDate?: string;
  birthPlace?: string;
  codiceFiscale?: string;
  photo?: string;
  address?: string;
  city?: string;
  cap?: string;
  comune?: string;
  province?: string;
  phone?: string;
  cellulare?: string;
  email?: string;
  titoloStudio?: string;
  linguaConosciuta?: string;
  // Physical features
  statura?: string;
  tipoCapelli?: string;
  coloreCapelli?: string;
  coloreOcchi?: string;
  // Clothing (Vestiario)
  tagliaCalzoni?: string;
  tagliaCamicia?: string;
  misuraScarponi?: string;
  tagliaMaglione?: string;
  // Operational History
  grado?: string;
  settore?: string;
  passaggioGrado?: string;
  gradoAssunto?: string;
  dataSospensione?: string;
  motivoSospensione?: string;
  matricolaOperativa?: string;
  dataAllontanamento?: string;
  dataRiammissione?: string;
  motivoAllontanamento?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  telegramChatId?: string;
  notes?: string;
  idCardFront?: string;
  idCardBack?: string;
  scadenzaIttica?: string;
  scadenzaVenatoria?: string;
  scadenzaZoofila?: string;
  scadenzaAmbientale?: string;
  notifiedExpirations?: string[];
}

export interface Alert {
  id: string;
  guardName: string;
  guardId: string;
  location?: { lat: number; lng: number };
  timestamp: any;
  status: 'active' | 'resolved';
  isGlobal?: boolean;
  contactAttempts?: number;
  contactNotes?: string[];
  resolvedBy?: string;
  matricola?: string;
  signatures?: Array<{
    operatorId: string;
    operatorName: string;
    signedAt: string;
    msTimestamp: number;
  }>;
  auditTrail?: Array<{
    msTimestamp: number;
    timestamp: string;
    operatorId: string;
    operatorName: string;
    eventType: string;
    description: string;
  }>;
}

export interface Report {
  id: string;
  numeroVerbale: string;
  data: string;
  oraInizio: string;
  oraFine: string;
  tipoVerbale: 'zoofila' | 'ittica' | 'venatoria';
  verbalizzanti: string; 
  comune: string;
  provincia: string;
  latitude?: number;
  longitude?: number;
  localita: string;
  recatPresso: string;
  soggettoNome: string;
  soggettoNatoA?: string;
  soggettoIl?: string;
  soggettoResidenteA?: string;
  soggettoProv?: string;
  soggettoIndirizzo?: string;
  soggettoDocumentoTipo?: string;
  soggettoDocumentoNumero?: string;
  soggettoDocScadenza?: string;
  soggettoEmail?: string;
  tipoAnimale: string;
  numeroAnimali?: string;
  proprietarioPossessore?: 'proprietario' | 'detentore' | 'possessore';
  esito: 'rifiuto' | 'consenso';
  constatazioni: string;
  chips: { numero: string; nominativo: string }[];
  giorniRegolarizzazione?: number;
  creatoAl: any;
  creatoDa: string;
  creatoDaNome: string;
  firmaGuardia?: string;
  firmaTrasgressore?: string;
  rifiutaFirma?: boolean;
  sopralluogoTipo?: string; // "1" o "2" (es. 1° o 2° sopralluogo)
  isFollowUp?: boolean; // Modulo 2: Verifica prescrizioni
  parentReportId?: string;
  emergencyCallId?: string;
  scannedImageBase64?: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
    type: 'document' | 'photo';
    latitude?: number;
    longitude?: number;
  }[];
  fI?: string;
  fSottoscritt?: string;
  fDa?: string;
  fSi?: string;
  fE?: string;
  fRecat?: string;
  fPresso?: string;
  fDe?: string;
  fAnimal?: string;
  fDescritt?: string;
  fVerbalizzant?: string;
  fInteressat?: string;
  fH?: string;
  fHa?: string;
  fChiesto?: string;
  fEsser?: string;
  fQualificat?: string;
  fNat?: string;
  fResident?: string;
  fRiconosciut?: string;
  fProprietari?: string;
  fPossessor?: string;
  signatureData?: string;
  dossierStato?: 'aperto' | 'chiuso';
  dossierChiusoAl?: string | null;
  dossierChiusoDa?: string | null;
  risoluzione?: string;
}

export interface ServiceReport {
  id: string;
  numeroRapporto: string;
  data: string;
  oraInizio: string;
  oraFine: string;
  settore: ("ittica" | "venatoria" | "zoofila" | "VIGILANZA AMBIENTALE" | "GUARDIA ITTICA" | "GUARDIA VENATORIA" | "PROTEZIONE CIVILE" | "GUARDIA ZOOFILA" | "ALTRO")[];
  guardie: string; 
  guardia1?: string;
  guardia2?: string;
  guardia3?: string;
  localita: string;
  comune: string;
  provincia: string;
  veicoloTarga: string;
  veicoloProprieta: string;
  note: string;
  firmaGuardia?: string;
  creatoAl: any;
  creatoDa: string;
  creatoDaNome: string;
}

export interface SanctionArticle {
  id: string;
  legge: string;
  articolo: string;
  comma?: string;
  descrizione: string;
  paroleChiave?: string[];
  sanzioneMin: number;
  sanzioneMax: number;
  sanzioneRidotta: number;
  settore: 'zoofila' | 'ittica' | 'venatoria' | 'ambientale';
  ambito: 'regionale' | 'comunale' | 'nazionale';
  comune?: string; // Es: "CARRARA", "MASSA", "AULLA", "PONTREMOLI"...
  noteOperative?: string;
}

export interface VehicleMaintenanceRecord {
  id: string;
  type: 'officina' | 'elettrauto' | 'carrozzeria' | 'gommista';
  reason: string;
  sentDate: string;
  returnDate?: string;
  paymentRef?: string;
  workDescription?: string;
  cost?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: 'available' | 'maintenance' | 'in_use';
  fuelType: 'benzina' | 'diesel' | 'gpl' | 'metano' | 'ibrida' | 'elettrica' | string;
  registrationDate: string;
  revisionExpiry: string;
  insuranceExpiry: string;
  lastOilChangeKm: number;
  nextOilChangeKm: number;
  lastTyreChangeDate: string;
  lastService?: any;
  notes?: string;
  assignedTo?: string; // Guard ID
  assignedToName?: string;
  maintenanceReason?: string;
  maintenanceHistory?: VehicleMaintenanceRecord[];
  damageMap?: string; 
  engineStatus?: string;
  electricalStatus?: string;
  tyresStatus?: string;
  lastCheckup?: any;
}

export interface VehicleLog {
  id: string;
  vehicleId: string;
  vehicleName: string;
  guardId: string;
  guardName: string;
  matricola: string;
  date: string;
  startTime: string;
  endTime: string;
  startKm: number;
  endKm: number;
  fuelAmount?: number; // Litri
  fuelCost?: number; // Euro
  anomalies?: string;
  location?: string; // Località intervento
  damagePoints?: Record<string, string>; // ID componente -> descrizione danno
  timestamp: any;
}

export interface EnvironmentalReport {
  id: string;
  type: 'discarica' | 'scarico' | 'bracconaggio' | 'altro';
  description: string;
  location?: { lat: number; lng: number };
  address?: string;
  reporterId: string;
  reporterName: string;
  timestamp: any;
  status: 'new' | 'investigating' | 'reported_to_authorities' | 'resolved';
  externalAuthority?: string; // Chi allertare
  images?: string[];
  notes?: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  url: string; // Can be a link or raw text content
  category: 'normativa' | 'procedure' | 'modulistica' | 'comunicazioni';
  createdAt: any;
  createdBy: string;
}

export interface Mission {
  id: string;
  guardId: string;
  guardMatricola?: string;
  guardName: string;
  address: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'rejected';
  assignedBy: string;
  assignedByName: string;
  createdAt: any;
  acceptedAt?: any;
  completedAt?: any;
  rejectedAt?: any;
  rejectionReason?: string;
  routeSent?: boolean;
  routeSentAt?: any;
  notes?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface UsefulContact {
  id: string;
  municipality: string;
  category: 'Emergenza' | 'Veterinari' | 'Farmacie Veterinarie' | 'Forze dell\'Ordine' | 'Pet Friendly (Hotel/B&B)' | 'Servizi Comunità' | 'Toelettatura' | 'Altro';
  title: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface SosDutyShift {
  id: string;
  guardId: string;
  guardName: string;
  matricola: string;
  date: string; // ISO string YYYY-MM-DD
  order: number; // 1 = first responder, 2 = backup, etc.
}

export interface CanineCertificate {
  id: string;
  // Owner/Detentore
  proprietarioCognome: string;
  proprietarioNome: string;
  proprietarioLuogoNascita?: string;
  proprietarioDataNascita?: string;
  proprietarioCodiceFiscale?: string;
  proprietarioIndirizzo?: string;
  proprietarioTelefono?: string;
  // Dog details
  caneNome: string;
  caneDataNascita?: string;
  caneSesso: string; // 'M' | 'F' | 'Maschio' | 'Femmina'
  caneRazza: string;
  caneMantello?: string;
  caneTaglia?: string;
  canePelo?: string;
  caneSegniParticolari?: string;
  caneNote?: string;
  caneMicrochip: string; // The primary database ID / Search index!
  caneImpiantatoIl?: string;
  caneSitoImpianto?: string;
  // Document details 
  rifArchivioFisico?: string;
  matricolaCertificato?: string;
  luogoDetenzione?: string;
  veterinarioNome?: string;
  dataRilascio?: string;
  dataMovimento?: string;
  // Metadata
  createdAt: any;
  createdBy?: string;
  createdByGuardName?: string;
}

export interface TerritoryControl {
  id: string;
  numeroControllo: string;
  data: string;
  ora: string;
  comune: string;
  localita: string;
  guardie: string;
  settore: 'zoofila' | 'ittica' | 'venatoria' | 'ambientale';
  specieRazza?: string;
  microchip?: string;
  nomeCane?: string;
  proprietario?: string;
  nomeSoggetto?: string;
  documentoEsibito?: string;
  esito: 'regolare' | 'con_prescrizioni' | 'violazione';
  prescrizioneTesto?: string;
  giorniAdeguamento?: number;
  note?: string;
  image?: string;
  creatoAl: any;
  creatoDa: string;
  creatoDaNome: string;
}

export interface ForbiddenDrug {
  id?: string;
  name: string;
  category: string;
  dangerLevel: string;
  notes: string;
  updatedAt: any;
  updatedBy: string;
}

export interface SanctionReport {
  id: string;
  numeroVerbale: string;
  data: string;
  oraInizio: string;
  verbalizzantiMatricole: string;
  verbalizzantiQualifica: string;
  dataAccertamento: string;
  oraAccertamento: string;
  localita: string;
  comune: string;
  provincia: string;
  gpsRef?: string;
  
  // Trasgressore
  soggettoNome: string;
  soggettoNatoA: string;
  soggettoNatoProv: string;
  soggettoNatoIl: string;
  soggettoResidenteA: string;
  soggettoResidenteProv: string;
  soggettoResidenteIndirizzo: string;
  soggettoResidenteCivico: string;
  soggettoDocumentoTipo: string;
  soggettoDocumentoNumero: string;
  soggettoDocumentoRilasciatoDa: string;
  soggettoDocumentoRilasciatoIl: string;
  
  // Obbligato in solido (eventuale)
  obbligatoNome?: string;
  obbligatoNatoA?: string;
  obbligatoNatoProv?: string;
  obbligatoNatoIl?: string;
  obbligatoResidenteA?: string;
  obbligatoResidenteProv?: string;
  obbligatoResidenteIndirizzo?: string;
  obbligatoResidenteCivico?: string;
  obbligatoQualita?: string;
  obbligatoDocumentoTipo?: string;
  obbligatoDocumentoNumero?: string;
  obbligatoDocumentoRilasciatoDa?: string;
  obbligatoDocumentoRilasciatoIl?: string;

  // Violazione
  trasgreditoLeggeRegolamento: string;
  trasgreditoArt: string;
  sanzionatoLeggeRegolamento: string;
  sanzionatoArt: string;
  altreDisposizioni?: string;
  sanzioneMin: number;
  sanzioneMax: number;
  sanzioneMinLettere?: string;
  sanzioneMaxLettere?: string;
  motiviFatti: string;

  // Contestazione
  contestazioneTipo: 'immediata' | 'differita';
  dichiarazioniSpontanee?: string;
  motivoMancataContestazione?: string;
  sequestroAmministrativo: boolean;
  sequestroVerbaleNumero?: string;
  sequestroVerbaleDel?: string;

  // Pagamento ridotto
  pagamentoMisuraRidotta: number;
  pagamentoMisuraRidottaLettere: string;
  speseNotifica: number;
  pagamentoTotale: number;
  metodoPagamento: 'regione_toscana' | 'comune_carrara' | 'altro_comune';
  
  regioneIban?: string;
  regioneCcPostale?: string;
  regioneIntestatario?: string;
  comuneNome?: string;
  comuneIban?: string;
  comuneCcPostale?: string;
  comuneIntestatario?: string;
  comuneLinkPagoPa?: string;

  // Ricorso
  ricorsoAutorita: 'regione_toscana' | 'comune';
  ricorsoComuneNome?: string;
  ricorsoComunePec?: string;

  // Sottoscrizione
  accettaContenutoERitira: boolean;
  rifiutaFirmareMaRitira: boolean;
  firmaTrasgressore?: string;
  firmaObbligato?: string;
  firmaGuardie?: string;

  // Metadata
  creatoAl: any;
  creatoDa: string;
  creatoDaNome: string;
  settore?: string;
}

export interface AnimalSymptom {
  id?: string;
  title: string;
  type: 'malattia' | 'maltrattamento';
  description: string;
  whatToDo: string;
  updatedAt: any;
  updatedBy: string;
}

export interface PublicCamera {
  id: string;
  name: string;
  type: 'targasystem' | 'webcam_security' | 'varchi_ztl' | 'webcam_comune';
  lat: number;
  lng: number;
  owner: string;
  locality: 'Massa' | 'Carrara' | 'Marina di Carrara' | 'Anderlino' | 'Marina di Massa';
  description: string;
  streamingUrl?: string;
  isLive: boolean;
  transitCount?: number;
  pgProtocol: {
    retentionTime: string;
    requestEnte: string;
    contactPec: string;
    howToExtract: string;
  };
}

export interface AudioRecordItem {
  id: string;
  audioBase64: string;
  durationSeconds: number;
  recordedAt: string;
  operatorName?: string;
  operatorMatricola?: string;
  source: "mic_call" | "whatsapp_import" | "file_upload";
  title?: string;
  transcription?: string;
  transcribedBy?: string;
  transcribedAt?: string;
}

export interface DossierIntegrationEvent {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorMatricola: string;
  type: "nota" | "vocale_whatsapp" | "assegnazione" | "riscontro_pg" | "variazione_stato";
  title: string;
  content: string;
  attachmentAudioId?: string;
}

export interface EmergencyCall {
  id: string;
  protocolCode?: string;
  callerName: string;
  callerPhone: string;
  comune: string;
  localita: string;
  lat: number;
  lng: number;
  sector?: "zoofila" | "ittica" | "venatoria" | "ambientale" | "altro";
  description: string;
  priority: "bassa" | "media" | "alta" | "emergenza";
  status: "in_attesa" | "richiesta_inviata" | "pattuglia" | "inoltrata" | "risolto" | "annullata";
  assignedGuardId: string;
  assignedGuardName: string;
  assignedGuardPhone: string;
  createdAt: string;
  callStartTime?: string;
  callEndTime?: string;
  operatorName?: string;
  operatorMatricola?: string;
  notes: string;
  auditTrail: Array<{
    timestamp: string;
    operatorMatricola: string;
    operatorName: string;
    action: string;
  }>;
  audioRecordings?: AudioRecordItem[];
  dossierEvents?: DossierIntegrationEvent[];
  isNonUrgent?: boolean;
  deadlineAt?: string;
  lastReminderSentAt?: string;
  lastReminderPhase?: 1 | 2 | 3;
  isExpiredArchive?: boolean;
}




