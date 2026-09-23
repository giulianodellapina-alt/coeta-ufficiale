import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function printElementById(elementId: string, title?: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    // Fallback
    window.print();
    return;
  }

  // Create clean modern hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  // Retrieve current styles
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((s) => s.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${title || "Stampa Documento"}</title>
        ${styles}
        <style>
          @media print {
            @page { 
              size: A4 portrait; 
              margin: 15mm 15mm 15mm 15mm; 
            }
            body { 
              background-color: white !important; 
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, .print\\:hidden, button, .DialogFooter {
              display: none !important;
            }
          }
          body { 
            background-color: white !important; 
            color: black !important; 
            padding: 20px;
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          }
          /* Custom overrides for printing */
          .bg-slate-950, .bg-zinc-950, .bg-slate-900, .bg-black {
            background-color: white !important;
            color: black !important;
          }
          .text-white, .text-zinc-200, .text-slate-300 {
            color: black !important;
          }
          /* Hide scroll areas default layouts height limits */
          .max-h-[95vh], .max-h-[85vh], .overflow-y-auto {
            max-h: none !important;
            overflow: visible !important;
          }
          .custom-scrollbar {
            overflow: visible !important;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  }, 600);
}
