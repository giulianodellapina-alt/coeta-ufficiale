import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Report } from "../types";
import { formatDateIT } from "./date-utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const parseReportDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (typeof dateStr !== "string") return null;
  
  // Try custom DD/MM/YYYY parsing
  const dmyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try standard Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

export const generateVerbalePDF = (report: Partial<Report>) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(40, 44, 52);
  doc.text("VERBALE DI SOPRALLUOGO", 105, 25, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`N° Verbale: ${report.numeroVerbale || "N.D."}`, 105, 32, { align: "center" });
  
  doc.setDrawColor(200);
  doc.line(20, 38, 190, 38);

  // General Info
  doc.setFont("helvetica", "bold");
  doc.text("DATI GENERALI", 20, 50);
  doc.setFont("helvetica", "normal");
  
  const parsedDate = report.data ? parseReportDate(report.data) : null;
  const formattedDate = parsedDate ? format(parsedDate, "dd/MM/yyyy") : (report.data || "N.D.");

  const generalData = [
    ["Data:", formattedDate],
    ["Ora:", `${report.oraInizio || "--"} - ${report.oraFine || "--"}`],
    ["Settore:", (report.tipoVerbale || "zoofila").toUpperCase()],
    ["Località:", `${report.localita || ""}, ${report.comune || ""} (${report.provincia || ""})`],
    ["Recatisi presso:", report.recatPresso || "N.D."]
  ];

  autoTable(doc, {
    startY: 55,
    body: generalData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
  });

  // Subject Info
  const startYSubject = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("SOGGETTO CONTROLLATO", 20, startYSubject);
  doc.setFont("helvetica", "normal");

  const subjectData = [
    ["Nominativo:", report.soggettoNome || "N.D."],
    ["Dati Nascita:", `${report.soggettoNatoA || ""} il ${formatDateIT(report.soggettoIl)}`],
    ["Residenza:", `${report.soggettoResidenteA || ""} (${report.soggettoProv || ""}), ${report.soggettoIndirizzo || ""}`],
    ["Documento:", `${report.soggettoDocumentoTipo || ""} N° ${report.soggettoDocumentoNumero || ""} Scad: ${report.soggettoDocScadenza || ""}`],
    ["Qualifica:", (report.proprietarioPossessore || "proprietario").toUpperCase()]
  ];

  autoTable(doc, {
    startY: startYSubject + 5,
    body: subjectData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
  });

  // Animals and Chips
  const startYAnimals = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("DETTAGLIO ANIMALI", 20, startYAnimals);
  doc.setFont("helvetica", "normal");

  doc.text(`Specie: ${report.tipoAnimale || "N.D."} - Quantità: ${report.numeroAnimali || "0"}`, 20, startYAnimals + 7);
  doc.text(`Consenso al controllo: ${(report.esito || "consenso").toUpperCase()}`, 20, startYAnimals + 12);

  if (report.chips && report.chips.length > 0) {
    const chipsData = report.chips.map(c => [c.numero, c.nominativo]);
    autoTable(doc, {
      startY: startYAnimals + 16,
      head: [['Numero Microchip', 'Nominativo Animale']],
      body: chipsData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 9 }
    });
  }

  // Findings
  const startYFindings = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("CONSTATATO QUANTO APPRESSO", 20, startYFindings);
  doc.setFont("helvetica", "normal");
  
  const splitText = doc.splitTextToSize(report.constatazioni || "Nessuna annotazione.", 170);
  doc.text(splitText, 20, startYFindings + 7);

  // Conclusion
  const startYFooter = Math.max((doc as any).lastAutoTable.finalY + 40, doc.internal.pageSize.height - 50);
  
  if (report.giorniRegolarizzazione) {
    doc.setFont("helvetica", "bold");
    doc.text(`Prescrizione: Regolarizzare entro ${report.giorniRegolarizzazione} giorni.`, 20, startYFooter - 10);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Firma Soggetto Controllato", 40, startYFooter + 20);
  doc.text("Firma Verbalizzanti", 140, startYFooter + 20);
  
  doc.line(20, startYFooter + 15, 80, startYFooter + 15);
  doc.line(120, startYFooter + 15, 180, startYFooter + 15);

  doc.text(`Matricole: ${report.verbalizzanti || "N.D."}`, 140, startYFooter + 25);

  // Save PDF
  doc.save(`Verbale_${report.numeroVerbale?.replace("/", "-") || report.data || "SenzaNumero"}.pdf`);
};
