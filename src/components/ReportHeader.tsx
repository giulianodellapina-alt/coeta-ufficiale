import React from "react";
import { EkoclubLogo } from "./EkoclubLogo";

interface ReportHeaderProps {
  numeroVerbale?: string;
  onNumeroVerbaleChange?: (val: string) => void;
  sopralluogoTipo?: string; // "1" o "2" o "1°" o "2°"
  onSopralluogoTipoChange?: (val: string) => void;
  hideTitle?: boolean;
}

export const getOfficialPrintHeaderHtml = (docTitle?: string, docSubtitle?: string) => `
  <div style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; font-family: 'Times New Roman', Times, serif; color: #000;">
    <!-- Intestazione Ministeriale -->
    <div style="text-align: center; font-size: 8pt; margin-bottom: 3px; line-height: 1.2; color: #000;">
      Associazione protezionistica riconosciuta con Decreto del Ministro dell’Ambiente n. 862/SCOC/92
    </div>
    
    <!-- Blocco Logo Aquila + Testo Intestazione Ufficiale -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 2px;">
      <div style="width: 25mm; height: 25mm; flex-shrink: 0;">
        <img src="/logo_operativo.jpg" alt="Logo Ekoclub" style="width: 100%; height: 100%; object-fit: contain;" onError="this.onerror=null; this.src='https://ekoclub.it/wp-content/uploads/2021/04/Logo-Ekoclub-International-300x300.png';" />
      </div>
      <div style="text-align: center; width: 100%;">
        <h1 style="font-size: 15pt; font-weight: 900; text-transform: uppercase; margin: 0; line-height: 1; color: #000; font-family: 'Times New Roman', serif;">
          GUARDIE EKOCLUB
        </h1>
        <p style="font-size: 8.5pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.1; margin-top: 2px; color: #000;">
          Guardie Giurate Zoofile-Venatorie-Ittiche-Ambientali
        </p>
        <p style="font-size: 8.5pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.1; margin-top: 1px; color: #000;">
          Servizio di polizia giudiziaria zoofila
        </p>
        <p style="font-size: 9pt; font-weight: bold; font-style: italic; margin: 0; line-height: 1.1; margin-top: 1px; color: #000;">
          Nucleo Massa-Carrara "Attilio Bertolucci"
        </p>
        <div style="margin-top: 2px;">
          <p style="font-size: 7.5pt; margin: 0; line-height: 1.1; color: #000;">
            ekoclub.massacarrara@gmail.com - pec: ekoclub.massacarrara@pec.it - cell. 3293738118
          </p>
        </div>
      </div>
    </div>

    ${docTitle ? `
      <div style="text-align: center; margin-top: 8px; border-top: 1px solid #000; padding-top: 4px;">
        <h2 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; font-family: sans-serif; letter-spacing: 0.5px; text-decoration: underline;">${docTitle}</h2>
        ${docSubtitle ? `<div style="font-size: 8.5pt; font-weight: bold; margin-top: 2px; color: #333;">${docSubtitle}</div>` : ''}
      </div>
    ` : ''}
  </div>
`;

export const ReportHeader: React.FC<ReportHeaderProps> = ({ 
  numeroVerbale, 
  onNumeroVerbaleChange,
  sopralluogoTipo = "1",
  onSopralluogoTipoChange,
  hideTitle = false
}) => {
  return (
    <div style={{ width: '100%', marginBottom: '1.5mm', fontFamily: '"Times New Roman", Times, serif' }}>
      {/* 1. Testo Ministeriale - All'estremità superiore, centrato */}
      <div style={{ textAlign: 'center', fontSize: '8pt', marginBottom: '1mm', lineHeight: '1.2', color: '#000' }}>
        Associazione protezionistica riconosciuta con Decreto del Ministro dell’Ambiente n. 862/SCOC/92
      </div>

      {/* 2. Blocco Logo (Aquila) + Intestazione Guardie + Contatti */}
      <div style={{ width: '100%', borderBottom: '1.5px solid black', paddingBottom: '3mm', marginBottom: '2mm' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{ width: '22mm', height: '22mm', flexShrink: 0 }}>
            <EkoclubLogo className="w-full h-full object-contain" />
          </div>
          <div style={{ textAlign: 'center', flexGrow: 1 }}>
            <h1 style={{ 
              fontSize: '15pt', 
              fontWeight: '900', 
              textTransform: 'uppercase', 
              margin: '0', 
              lineHeight: '1',
              color: '#000'
            }}>
              GUARDIE EKOCLUB
            </h1>
            <p style={{ fontSize: '8.5pt', fontWeight: 'bold', fontStyle: 'italic', margin: '0', lineHeight: '1.1', marginTop: '2px', color: '#000' }}>
              Guardie Giurate Zoofile-Venatorie-Ittiche-Ambientali
            </p>
            <p style={{ fontSize: '8.5pt', fontWeight: 'bold', fontStyle: 'italic', margin: '0', lineHeight: '1.1', marginTop: '1px', color: '#000' }}>
              Servizio di polizia giudiziaria zoofila
            </p>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', fontStyle: 'italic', margin: '0', lineHeight: '1.1', marginTop: '1px', color: '#000' }}>
              Nucleo Massa-Carrara "Attilio Bertolucci"
            </p>
            <div style={{ marginTop: '2px' }}>
              <p style={{ fontSize: '7.5pt', margin: '0', lineHeight: '1.1', color: '#000' }}>
                ekoclub.massacarrara@gmail.com - pec: ekoclub.massacarrara@pec.it - cell. 3293738118
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Titolo Verbale - Centrato */}
      {!hideTitle && (
        <div style={{ textAlign: 'center', width: '100%', marginTop: '1.5mm' }}>
          <h2 style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '0', letterSpacing: '0.5px' }}>
            VERBALE DI SOPRALLUOGO N°{" "}
            <span className="no-print inline-block relative mx-1 align-baseline">
              <select
                value={sopralluogoTipo || "1"}
                onChange={(e) => onSopralluogoTipoChange?.(e.target.value)}
                className="bg-amber-50/80 text-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11pt] font-extrabold cursor-pointer outline-none transition-all shadow-sm"
                style={{ fontFamily: '"Times New Roman", serif' }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </span>
            <span 
              className="print-only font-bold border-b border-black px-2" 
              style={{ display: 'none' }}
            >
              {sopralluogoTipo || "1"}
            </span>
          </h2>
        </div>
      )}
    </div>
  );
};


