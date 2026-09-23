import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Upload, 
  Download, 
  FileAudio, 
  Radio, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AudioRecordData {
  id?: string;
  audioBase64: string;
  durationSeconds: number;
  recordedAt: string;
  operatorName?: string;
  source: "mic_call" | "whatsapp_import" | "file_upload";
  title?: string;
}

interface AudioCallRecorderProps {
  onAudioSaved: (audioData: AudioRecordData) => void;
  existingAudios?: AudioRecordData[];
  onDeleteAudio?: (index: number) => void;
  readOnly?: boolean;
  operatorName?: string;
}

export const AudioCallRecorder: React.FC<AudioCallRecorderProps> = ({
  onAudioSaved,
  existingAudios = [],
  onDeleteAudio,
  readOnly = false,
  operatorName = "Centrale Operativa",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingDisclaimer, setIsPlayingDisclaimer] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSource, setAudioSource] = useState<"mic_call" | "whatsapp_import" | "file_upload">("mic_call");
  
  // Active playback index
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Play legal warning before recording starts
  const playLegalDisclaimer = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve();
        return;
      }

      setIsPlayingDisclaimer(true);
      const text = "Attenzione: comunicazione registrata a fini operativi e di Polizia Giudiziaria.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "it-IT";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setIsPlayingDisclaimer(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsPlayingDisclaimer(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const startRecording = async () => {
    try {
      // 1. Play legal vocal warning
      await playLegalDisclaimer();

      // 2. Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        const blobUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(blobUrl);

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setPendingBase64(base64data);
          setAudioDuration(recordingTime);
          setAudioSource("mic_call");
        };

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert("Impossibile accedere al microfono: " + err.message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if audio
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|ogg|wav|m4a|aac|opus)$/i)) {
      alert("Seleziona un file audio valido (MP3, OGG WhatsApp, WAV, M4A).");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setAudioBlobUrl(blobUrl);

    const isWhatsApp = file.name.toLowerCase().includes("whatsapp") || file.type.includes("ogg") || file.type.includes("opus");
    setAudioSource(isWhatsApp ? "whatsapp_import" : "file_upload");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setPendingBase64(base64data);
      setAudioDuration(0); // will be determined on playback
    };
  };

  const handleConfirmSaveAudio = () => {
    if (!pendingBase64) return;

    const newRecord: AudioRecordData = {
      id: "aud_" + Date.now(),
      audioBase64: pendingBase64,
      durationSeconds: audioDuration || recordingTime || 1,
      recordedAt: new Date().toISOString(),
      operatorName,
      source: audioSource,
      title: audioSource === "whatsapp_import" 
        ? "Nota Vocale WhatsApp" 
        : audioSource === "mic_call" 
          ? "Registrazione Chiamata Centrale" 
          : "Audio Documentale Allegato"
    };

    onAudioSaved(newRecord);
    setPendingBase64(null);
    setAudioBlobUrl(null);
    setRecordingTime(0);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-400">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Registrazione Chiamate & Audio Intervento
            </h4>
            <p className="text-[10px] text-slate-400">
              Registratore vocale con disclaimer di legge & import note vocali WhatsApp
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] bg-slate-900 border-slate-700 text-slate-300">
          PG Legal Rec &bull; {existingAudios.length} File
        </Badge>
      </div>

      {/* Controllo Registrazione e Caricamento */}
      {!readOnly && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={startRecording}
                  disabled={isPlayingDisclaimer}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-2"
                >
                  <Mic className="h-4 w-4" />
                  {isPlayingDisclaimer ? "Avviso Vocale in Corso..." : "Avvia Registrazione Chiamata"}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={stopRecording}
                  className="bg-red-700 hover:bg-red-800 text-white animate-pulse font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Termina Registrazione ({formatSeconds(recordingTime)})
                </Button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*,.ogg,.mp3,.wav,.m4a,.aac,.opus"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 text-xs rounded-xl flex items-center gap-2"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                Importa da WhatsApp / File Audio
              </Button>
            </div>

            {isPlayingDisclaimer && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                <Volume2 className="h-3.5 w-3.5 animate-bounce" />
                <span>Riproduzione messaggio legale di registrazione ai sensi di legge...</span>
              </div>
            )}
          </div>

          {/* Nuova registrazione in sospeso da salvare */}
          {pendingBase64 && (
            <div className="mt-3 p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                  Nuova registrazione pronta per l'allegato
                </span>
                <span className="text-[10px] text-slate-400">
                  {audioSource === "whatsapp_import" ? "WhatsApp Audio" : "Microfono Chiamata"}
                </span>
              </div>

              {audioBlobUrl && (
                <audio controls src={audioBlobUrl} className="w-full h-8 mt-1 rounded-lg" />
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPendingBase64(null);
                    setAudioBlobUrl(null);
                  }}
                  className="text-slate-400 hover:text-red-400 text-xs h-8"
                >
                  Annulla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSaveAudio}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8 rounded-lg"
                >
                  Salva e Allega all'Intervento
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista Audio Registrati / Allegati */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Archivio Tracce Audio & Chiamate ({existingAudios.length})
        </span>

        {existingAudios.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
            Nessuna registrazione o nota vocale allegata a questa scheda.
          </div>
        ) : (
          <div className="space-y-2">
            {existingAudios.map((aud, idx) => (
              <div
                key={aud.id || idx}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                    <FileAudio className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-white">
                        {aud.title || `Traccia Vocale #${idx + 1}`}
                      </h5>
                      <Badge className={cn(
                        "text-[9px] px-1.5 py-0 rounded",
                        aud.source === "whatsapp_import" 
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30" 
                          : "bg-purple-950/60 text-purple-300 border-purple-500/30"
                      )}>
                        {aud.source === "whatsapp_import" ? "WhatsApp" : "Centrale Rec"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{new Date(aud.recordedAt).toLocaleString("it-IT")}</span>
                      <span>&bull;</span>
                      <span>Op: {aud.operatorName || "Centrale"}</span>
                      {aud.durationSeconds > 0 && (
                        <>
                          <span>&bull;</span>
                          <span>{formatSeconds(aud.durationSeconds)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <audio
                    ref={(el) => {
                      audioPlayerRefs.current[idx] = el;
                    }}
                    controls
                    src={aud.audioBase64}
                    className="h-8 max-w-[280px] w-full rounded-lg"
                  />

                  <a
                    href={aud.audioBase64}
                    download={`Registrazione_Intervento_${idx + 1}.webm`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Scarica Audio Ufficiale"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  {!readOnly && onDeleteAudio && (
                    <button
                      type="button"
                      onClick={() => onDeleteAudio(idx)}
                      className="p-2 rounded-lg bg-red-950/30 hover:bg-red-900/60 border border-red-900/40 text-red-400 hover:text-red-200 transition-colors"
                      title="Elimina Traccia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
