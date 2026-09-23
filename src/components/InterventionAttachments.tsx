import React, { useState, useEffect } from "react";
import { 
  FileText, Upload, Download, Trash2, Eye, Loader2, Paperclip, Camera, CheckCircle2 
} from "lucide-react";
import { 
  collection, addDoc, query, where, onSnapshot, getDocs, doc, deleteDoc, orderBy 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";

interface InterventionAttachmentsProps {
  reportId: string;
  db: any;
  userEmail: string;
  isAdmin?: boolean;
  theme?: "light" | "dark";
}

export const InterventionAttachments: React.FC<InterventionAttachmentsProps> = ({
  reportId,
  db,
  userEmail,
  isAdmin = false,
  theme = "light"
}) => {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [chunksCache, setChunksCache] = useState<{
    [attachmentId: string]: { url: string; loading: boolean };
  }>({});

  // Listen to attachments for this reportId
  useEffect(() => {
    if (!db || !reportId) return;

    const q = query(
      collection(db, "intervention_attachments"),
      where("reportId", "==", reportId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // Order by uploadedAt desc
        list.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
        setAttachments(list);
      },
      (error) => {
        console.error("Errore listener allegati:", error);
      }
    );

    return unsubscribe;
  }, [db, reportId]);

  // Load a chunked file from firestore
  const loadChunkedAttachment = async (attachmentId: string): Promise<string> => {
    if (chunksCache[attachmentId]?.url) return chunksCache[attachmentId].url;

    setChunksCache((prev) => ({
      ...prev,
      [attachmentId]: { url: "", loading: true },
    }));

    try {
      const q = query(
        collection(db, "attachment_chunks"),
        where("attachmentId", "==", attachmentId),
        orderBy("chunkIndex", "asc")
      );
      const querySnapshot = await getDocs(q);
      let fullBase64 = "";
      querySnapshot.forEach((doc) => {
        fullBase64 += doc.data().data || "";
      });

      if (!fullBase64) {
        throw new Error("Nessun frammento disponibile.");
      }

      setChunksCache((prev) => ({
        ...prev,
        [attachmentId]: { url: fullBase64, loading: false },
      }));
      return fullBase64;
    } catch (err: any) {
      console.error("Errore nel caricamento del file spezzato:", err);
      setChunksCache((prev) => ({
        ...prev,
        [attachmentId]: { url: "", loading: false },
      }));
      alert(`Impossibile scaricare l'allegato: ${err.message || "errore di rete."}`);
      return "";
    }
  };

  // Convert base64 URI to Blob URL to open PDFs safely in another tab
  const convertDataURIToBlobURL = (dataURI: string): string => {
    if (!dataURI || typeof dataURI !== "string" || !dataURI.startsWith("data:")) return dataURI || "";
    try {
      const parts = dataURI.split(",");
      if (!parts || parts.length < 2) return dataURI;
      const mime = (parts[0] || "").match(/:(.*?);/)?.[1] || "application/octet-stream";
      const byteString = atob(parts[1] || "");
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Errore conversione Blob:", e);
      return dataURI;
    }
  };

  const handleOpenAttachment = async (att: any) => {
    let url = att.url;
    if (att.isChunked) {
      if (chunksCache[att.id]?.url) {
        url = chunksCache[att.id].url;
      } else {
        url = await loadChunkedAttachment(att.id);
      }
    }
    if (!url) return;

    try {
      const blobUrl = convertDataURIToBlobURL(url);
      const newWin = window.open();
      if (newWin) {
        newWin.document.write(`
          <html>
            <head>
              <title>Visualizzatore Allegato - ${att.name}</title>
              <style>
                body { margin: 0; padding: 0; background-color: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; color: white; }
                .container { text-align: center; max-width: 90%; }
                img { max-width: 100%; max-height: 85vh; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); object-fit: contain; }
                iframe { width: 90vw; height: 90vh; border: none; border-radius: 8px; }
                .btn { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="container">
                ${url.startsWith("data:application/pdf") 
                  ? `<iframe src="${blobUrl}"></iframe>`
                  : `<img src="${url}" alt="${att.name}" />`
                }
                <br />
                <a href="${blobUrl}" download="${att.name}" class="btn">Scarica File Originale</a>
              </div>
            </body>
          </html>
        `);
        newWin.document.close();
      } else {
        // Fallback standard redirect
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        link.click();
      }
    } catch (e) {
      console.error("Errore apertura allegato:", e);
      alert("Impossibile aprire il file in una nuova scheda.");
    }
  };

  const handleDownloadAttachment = async (att: any) => {
    let url = att.isChunked ? chunksCache[att.id]?.url : att.url;
    if (att.isChunked && !url) {
      url = await loadChunkedAttachment(att.id);
    }
    if (!url) return;
    try {
      const blobUrl = convertDataURIToBlobURL(url);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Errore download:", err);
      alert("Impossibile scaricare il file.");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, name: string) => {
    if (!window.confirm(`Sei sicuro di voler rimuovere l'allegato "${name}"? Questa operazione è definitiva.`)) {
      return;
    }

    try {
      // 1. Delete chunks if chunked
      const chunksQuery = query(
        collection(db, "attachment_chunks"),
        where("attachmentId", "==", attachmentId)
      );
      const chunksSnap = await getDocs(chunksQuery);
      const chunkDeletes = chunksSnap.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(chunkDeletes);

      // 2. Delete main attachment document
      await deleteDoc(doc(db, "intervention_attachments", attachmentId));
      alert(`Allegato "${name}" rimosso con successo.`);
    } catch (err) {
      console.error("Errore durante la rimozione dell'allegato:", err);
      alert("Errore durante la rimozione dell'allegato.");
    }
  };

  // Compress images using canvas helper
  const compressImageIfNeeded = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxWidth = 1200;
          const maxHeight = 1200;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = (err) => reject(err);
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress("Compressione file...");

    try {
      const base64String = await compressImageIfNeeded(file);
      if (!base64String) {
        throw new Error("Impossibile leggere o comprimere il file.");
      }

      setUploadProgress("Preparazione frammenti...");
      const chunkLength = 500000; // 500KB chunk size
      const isChunked = base64String.length > chunkLength;

      const newAttachment: any = {
        name: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userEmail || "Operatore",
        type: file.type.startsWith("image/") ? "photo" : "document",
        reportId,
        isChunked,
        ...(isChunked
          ? { url: "", totalChunks: Math.ceil(base64String.length / chunkLength) }
          : { url: base64String }),
      };

      setUploadProgress("Salvataggio documento...");
      const docRef = await addDoc(collection(db, "intervention_attachments"), newAttachment);

      if (isChunked) {
        const totalChunks = Math.ceil(base64String.length / chunkLength);
        const chunkPromises = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkData = base64String.substring(
            i * chunkLength,
            (i + 1) * chunkLength
          );
          chunkPromises.push(
            addDoc(collection(db, "attachment_chunks"), {
              attachmentId: docRef.id,
              chunkIndex: i,
              data: chunkData,
              uploadedAt: new Date().toISOString(),
            })
          );
        }
        setUploadProgress("Trasmigrazione frammenti database...");
        await Promise.all(chunkPromises);
      }

      alert(`✓ Allegato "${file.name}" salvato ed archiviato con successo.`);
    } catch (err: any) {
      console.error("Errore salvataggio allegato:", err);
      alert(`Errore di caricamento: ${err.message || "riprovare."}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-850'} mt-4`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-700/30">
        <div className="flex items-center gap-2">
          <Paperclip className={`h-4.5 w-4.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <h5 className="text-xs font-black uppercase tracking-widest">
            Fascicolo Allegati & Scansioni Originali
          </h5>
        </div>
        <div className="text-[10px] font-mono opacity-60">
          {attachments.length} allegat{attachments.length === 1 ? 'o' : 'i'} in archivio
        </div>
      </div>

      {/* Upload button */}
      <div className="mb-4">
        <label className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          isDark 
            ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-purple-500/40' 
            : 'border-slate-300 bg-white hover:bg-slate-100 hover:border-purple-400'
        }`}>
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              <span className="font-mono text-[10px] uppercase tracking-wider">{uploadProgress}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Upload className="h-5 w-5 text-purple-400" />
              <div className="text-xs font-semibold uppercase tracking-wide">
                Trascina o clicca per caricare
              </div>
              <div className="text-[9px] uppercase tracking-wider opacity-60">
                Immagine (JPEG/PNG) o PDF del documento cartaceo / firmato
              </div>
            </div>
          )}
          <input 
            type="file" 
            className="hidden" 
            accept="image/*,application/pdf" 
            onChange={handleUploadFile}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Attachments list */}
      {attachments.length === 0 ? (
        <div className={`p-4 border border-dashed rounded-xl text-center text-xs opacity-60 ${
          isDark ? 'border-slate-850' : 'border-slate-250'
        }`}>
          Nessuna scansione o foto associata. Usa il pulsante sopra per archiviare la copia originale cartacea.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {attachments.map((att) => {
            const isChunkLoading = chunksCache[att.id]?.loading;
            return (
              <div 
                key={att.id} 
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                  isDark 
                    ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/60' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`p-1.5 rounded-md ${
                    att.type === "photo" 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {att.type === "photo" ? <Camera className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="text-left overflow-hidden">
                    <div className="font-semibold truncate max-w-[200px] md:max-w-[400px]">
                      {att.name}
                    </div>
                    <div className="text-[9px] opacity-60 font-mono flex flex-wrap items-center gap-x-2">
                      <span>Caricato il: {new Date(att.uploadedAt).toLocaleDateString("it-IT")}</span>
                      <span>•</span>
                      <span>Da: {att.uploadedBy}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {att.isChunked && !chunksCache[att.id]?.url && (
                    <span className="text-[9px] font-mono opacity-70 animate-pulse">
                      {isChunkLoading ? "Ricomposizione..." : "Spezzato"}
                    </span>
                  )}
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                    title="Visualizza allegato"
                    onClick={() => handleOpenAttachment(att)}
                    disabled={isChunkLoading}
                  >
                    {isChunkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-4 w-4" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                    title="Scarica allegato"
                    onClick={() => handleDownloadAttachment(att)}
                    disabled={isChunkLoading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    title="Elimina definitivo"
                    onClick={() => handleDeleteAttachment(att.id, att.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
