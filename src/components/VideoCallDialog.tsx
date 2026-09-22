import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Shield,
  MessageCircle,
  ExternalLink,
  Camera,
  Maximize2,
  RefreshCw,
  Clock,
  Sparkles,
  Phone
} from "lucide-react";
import { Guard } from "../types";

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetGuard: Guard | null;
  currentOperator?: Guard | null;
  onLogAudit?: (entry: { timestamp: string; action: string; operator: string }) => void;
}

export const VideoCallDialog: React.FC<VideoCallDialogProps> = ({
  open,
  onOpenChange,
  targetGuard,
  currentOperator,
  onLogAudit,
}) => {
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const guardName = targetGuard 
    ? `${targetGuard.surname || targetGuard.privateInfo?.surname || ""} ${targetGuard.name || targetGuard.privateInfo?.name || ""}`.trim()
    : "Guardia sul Campo";
  
  const guardPhone = targetGuard?.phone || targetGuard?.privateInfo?.cellulare || "";
  const cleanPhone = guardPhone.replace(/[^0-9]/g, "");
  const waVideoUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith("39") ? cleanPhone : `39${cleanPhone}`}?text=${encodeURIComponent("Richiesta videochiamata operativa dalla Centrale C.O.E.T.A.")}` : "";

  // Handle stream cleanup
  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsVideoActive(false);
    setCallDuration(0);
  };

  useEffect(() => {
    if (!open) {
      stopStream();
    } else {
      // Log video call initiation
      if (onLogAudit && targetGuard) {
        onLogAudit({
          timestamp: new Date().toISOString(),
          operator: currentOperator ? `${currentOperator.name} ${currentOperator.surname || ""}`.trim() : "Centrale Operativa",
          action: `Avvio sessione videochiamata / streaming operativo con ${guardName} (Matr. ${targetGuard.matricola || "N.D."})`
        });
      }
    }
    return () => stopStream();
  }, [open, targetGuard]);

  const startLocalCamera = async () => {
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoActive(true);

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert("Impossibile avviare la telecamera: " + err.message);
    }
  };

  const toggleCameraFacing = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (isVideoActive) {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newMode },
          audio: true,
        });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoActive(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = !track.enabled));
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = !track.enabled));
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-white p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <Video className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Videochiamata & Streaming Operativo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Collegamento video in tempo reale con la pattuglia sul campo
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="bg-slate-900 border-blue-500/40 text-blue-300 text-[11px] px-2.5 py-1">
              {targetGuard?.matricola ? `Matr. ${targetGuard.matricola}` : "Pattuglia Operativa"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Scheda Guardia Destinataria */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {guardName}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Ruolo: <span className="text-emerald-400 capitalize">{targetGuard?.role || "Guardia"}</span> &bull; Sezione: <span className="text-slate-300">{targetGuard?.section || "Massa-Carrara"}</span> &bull; Tel: <span className="text-slate-200">{guardPhone || "N.D."}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cleanPhone && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.open(`tel:${cleanPhone}`, "_self")}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 h-9"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Chiama GSM
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.open(waVideoUrl, "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 h-9"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp Video
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Streaming Video / Bodycam Box */}
        <div className="relative aspect-video w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
          {isVideoActive ? (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur border border-red-500/40 text-red-400 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                LIVE STREAMING &bull; {formatSeconds(callDuration)}
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={toggleCameraFacing}
                  className="h-8 w-8 rounded-full bg-slate-950/80 border border-slate-700 text-white"
                  title="Cambia Telecamera (Frontale/Posteriore)"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Controlli durante la chiamata */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/90 backdrop-blur border border-slate-700/80 px-4 py-2 rounded-full shadow-2xl">
                <Button
                  type="button"
                  size="icon"
                  onClick={toggleAudio}
                  className={`h-10 w-10 rounded-full ${isAudioMuted ? "bg-red-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                >
                  {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                  type="button"
                  size="icon"
                  onClick={toggleVideo}
                  className={`h-10 w-10 rounded-full ${isVideoMuted ? "bg-red-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                >
                  {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>

                <Button
                  type="button"
                  size="icon"
                  onClick={stopStream}
                  className="h-10 w-10 rounded-full bg-red-700 hover:bg-red-800 text-white"
                  title="Termina Videochiamata"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-950/50 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Camera className="h-6 w-6" />
              </div>
              <div className="max-w-md">
                <h5 className="text-sm font-bold text-white">Canale Video Bodycam / Guardia Pronto</h5>
                <p className="text-xs text-slate-400 mt-1">
                  Puoi attivare lo streaming video diretto per visionare la situazione sul campo oppure aprire WhatsApp Video con un click.
                </p>
              </div>
              <Button
                type="button"
                onClick={startLocalCamera}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl px-5 h-10 shadow-lg shadow-blue-950/50 flex items-center gap-2 mx-auto"
              >
                <Video className="h-4 w-4" />
                Attiva Bodycam / Telecamera Live
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            Canale protetto & tracciato per atti di Polizia Giudiziaria
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
