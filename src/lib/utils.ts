import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDateIT } from "./date-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatDateIT };

export function printElementById(elementId: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    window.focus();
    window.print();
    return;
  }

  // Create or reuse top-level print portal element (adjacent to #root)
  let portal = document.getElementById("global-print-portal");
  if (!portal) {
    portal = document.createElement("div");
    portal.id = "global-print-portal";
    document.body.appendChild(portal);
  }

  // Preserve previous document title to restore it after print
  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }

  const cleanTitle = (title || originalTitle).replace(/'/g, "\\'");

  // Load target HTML into print portal
  portal.innerHTML = `
    <!-- Barra Direttivi Stampa d'Ufficio - Esclusa in fase di Stampa Cartacea -->
    <div class="print-preview-header no-print flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 shadow-xl" style="font-family: ui-sans-serif, system-ui, sans-serif; background-color: #0d121f !important; color: white !important; margin-bottom: 24px; border-radius: 12px; padding: 16px; border: 1px solid #1e293b !important; width: 100%; max-width: 800px; margin-left: auto; margin-right: auto; box-sizing: border-box;">
      <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
          <span style="font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px;">
            Anteprima di Stampa A4
          </span>
        </div>
        <span style="font-size: 11px; color: #94a3b8; font-family: ui-sans-serif, system-ui, sans-serif;">
          Verifica il documento qui sotto. Quando sei pronto, premi "Avvia Stampa" o usa Ctrl+P (assicurati che il focus sia su questa pagina).
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button 
          id="start-print-btn"
          onclick="window.focus(); window.print();"
          style="padding: 10px 18px; background-color: #f59e0b; color: #0f172a; border: none; font-family: monospace; font-size: 11px; font-weight: 900; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);"
          onmouseover="this.style.backgroundColor='#d97706'"
          onmouseout="this.style.backgroundColor='#f59e0b'"
        >
          AVVIA STAMPA A4 🖨
        </button>
        <button 
          id="close-print-preview-btn"
          onclick="document.body.classList.remove('is-printing-active'); document.getElementById('global-print-portal').innerHTML = ''; document.title = '${cleanTitle}';"
          style="padding: 10px 18px; background-color: #e11d48; color: white; border: none; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);"
          onmouseover="this.style.backgroundColor='#be123c'"
          onmouseout="this.style.backgroundColor='#e11d48'"
        >
          CHIUDI ANTEPRIMA ✕
        </button>
      </div>
    </div>

    <div class="print-container bg-white text-black p-2 sm:p-4 print:p-0" style="background-color: white !important; color: black !important; font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;">
      ${element.innerHTML}
    </div>
  `;

  // Attach programmatic listener just to be absolutely sure
  const startBtn = portal.querySelector("#start-print-btn");
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.focus();
      window.print();
    });
  }

  // Apply printing CSS rules by marking body as active listing
  document.body.classList.add("is-printing-active");
}
