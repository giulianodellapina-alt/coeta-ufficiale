import React, { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen, Check, Building2, Landmark, Tag, AlertCircle } from 'lucide-react';
import { SanctionArticle } from '../types';
import { SANCTION_ARTICLES } from '../data/laws';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProntuarioSearchWidgetProps {
  selectedComune?: string;
  activeSector?: string;
  onSelectArticle: (article: SanctionArticle) => void;
  selectedArticleId?: string;
}

export const ProntuarioSearchWidget: React.FC<ProntuarioSearchWidgetProps> = ({
  selectedComune = '',
  activeSector,
  onSelectArticle,
  selectedArticleId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const comuneUpper = (selectedComune || '').toUpperCase().trim();

  // Quick search keywords
  const quickTags = [
    { label: 'Cuccia / Ricovero', keyword: 'cuccia' },
    { label: 'Recinto / Spazio', keyword: 'recinto' },
    { label: 'Microchip / Anagrafe', keyword: 'microchip' },
    { label: 'Catena (Vietata)', keyword: 'catena' },
    { label: 'Deiezioni', keyword: 'deiezioni' },
    { label: 'Guinzaglio', keyword: 'guinzaglio' },
    { label: 'Vagabondaggio', keyword: 'vagante' },
    { label: 'Pesca / Licenza', keyword: 'pesca' },
    { label: 'Caccia / Distanze', keyword: 'caccia' },
    { label: 'Rifiuti', keyword: 'rifiuti' },
  ];

  // Filtering & Smart Ranking
  const filteredArticles = useMemo(() => {
    let list = [...SANCTION_ARTICLES];

    // Filter by sector if provided and not "all"
    if (activeSector && activeSector !== 'all') {
      const secLower = activeSector.toLowerCase();
      // Allow general or sector-matching
      list = list.filter(art => !art.settore || art.settore.toLowerCase() === secLower || secLower === 'zoofila');
    }

    const query = (selectedTag || searchQuery).toLowerCase().trim();

    if (query) {
      list = list.filter(art => {
        const inLegge = art.legge.toLowerCase().includes(query);
        const inArt = art.articolo.toLowerCase().includes(query);
        const inDesc = art.descrizione.toLowerCase().includes(query);
        const inComune = (art.comune || '').toLowerCase().includes(query);
        const inKeywords = (art.paroleChiave || []).some(k => k.toLowerCase().includes(query));
        const inNotes = (art.noteOperative || '').toLowerCase().includes(query);

        return inLegge || inArt || inDesc || inComune || inKeywords || inNotes;
      });
    }

    // Sort/Rank:
    // 1. Municipal regulations matching selectedComune come FIRST
    // 2. Regional laws come SECOND (official fallback)
    // 3. Other municipal regulations come LAST
    return list.sort((a, b) => {
      const aIsComune = a.ambito === 'comunale' && comuneUpper && (a.comune || '').toUpperCase() === comuneUpper;
      const bIsComune = b.ambito === 'comunale' && comuneUpper && (b.comune || '').toUpperCase() === comuneUpper;

      if (aIsComune && !bIsComune) return -1;
      if (!aIsComune && bIsComune) return 1;

      const aIsRegional = a.ambito === 'regionale' || a.ambito === 'nazionale';
      const bIsRegional = b.ambito === 'regionale' || b.ambito === 'nazionale';

      if (aIsRegional && !bIsRegional) return -1;
      if (!aIsRegional && bIsRegional) return 1;

      return 0;
    });
  }, [searchQuery, selectedTag, selectedComune, activeSector]);

  // Check if current search has a specific municipal regulation for selectedComune
  const hasSpecificMunicipalRegulation = useMemo(() => {
    if (!comuneUpper) return false;
    return filteredArticles.some(a => a.ambito === 'comunale' && (a.comune || '').toUpperCase() === comuneUpper);
  }, [filteredArticles, comuneUpper]);

  return (
    <div className="space-y-4 bg-[#050914] border border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Prontuario Sanzionatorio Smart Beta
            </h3>
            <p className="text-[10px] text-slate-400">
              Ricerca rapida per illecito, parola chiave (es. cuccia, recinto) o articolo
            </p>
          </div>
        </div>

        {comuneUpper && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">
            <Building2 className="h-3 w-3 text-emerald-400" />
            <span>Territorio: <strong className="text-white uppercase">{comuneUpper}</strong></span>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (selectedTag) setSelectedTag(null);
          }}
          placeholder="Digita illecito o parola chiave (es. cuccia, recinto, microchip, catena, deiezioni, guinzaglio, licenza, caccia)..."
          className="bg-slate-950 border-slate-800 text-white pl-10 pr-10 h-11 text-sm font-sans rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-500"
        />
        {(searchQuery || selectedTag) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTag(null);
            }}
            className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-md transition-all"
          >
            Azzera
          </button>
        )}
      </div>

      {/* Quick Tag Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold shrink-0 flex items-center gap-1">
          <Tag className="h-3 w-3" /> Rapidi:
        </span>
        {quickTags.map(tag => {
          const isSelected = selectedTag === tag.keyword || searchQuery.toLowerCase() === tag.keyword;
          return (
            <button
              key={tag.keyword}
              type="button"
              onClick={() => {
                if (isSelected) {
                  setSelectedTag(null);
                  setSearchQuery('');
                } else {
                  setSelectedTag(tag.keyword);
                  setSearchQuery(tag.keyword);
                }
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                isSelected
                  ? "bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-500/20"
                  : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* Info Notice about Municipal vs Regional Fallback */}
      {comuneUpper && (
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
          {hasSpecificMunicipalRegulation ? (
            <>
              <Building2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-300 uppercase">Regolamento Comunale Presente per {comuneUpper}:</strong> Il sistema evidenzia prima la norma regolamentare del Comune e successivamente la legge quadro regionale.
              </div>
            </>
          ) : (
            <>
              <Landmark className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sky-300 uppercase">Norma Regionale Toscana (Fallback):</strong> Per {comuneUpper} si applica direttamente la Legge Regionale Toscana in vigore.
              </div>
            </>
          )}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-slate-900 text-slate-500 space-y-1">
            <AlertCircle className="h-6 w-6 mx-auto text-slate-600 mb-1" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nessuna norma trovata per la ricerca</p>
            <p className="text-[11px]">Prova a cercare con parole chiave generali come "cuccia", "recinto", "microchip" o "anagrafe".</p>
          </div>
        ) : (
          filteredArticles.map(art => {
            const isComuneDedicato = art.ambito === 'comunale' && comuneUpper && (art.comune || '').toUpperCase() === comuneUpper;
            const isRegionalFallback = art.ambito === 'regionale' || art.ambito === 'nazionale';
            const isSelected = selectedArticleId === art.id;

            return (
              <div
                key={art.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-3 group",
                  isSelected
                    ? "bg-sky-950/40 border-sky-500 text-white ring-1 ring-sky-500/50"
                    : isComuneDedicato
                    ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400/80 text-slate-200"
                    : isRegionalFallback
                    ? "bg-slate-900/60 border-slate-800 hover:border-sky-500/50 text-slate-200"
                    : "bg-slate-950/40 border-slate-900 opacity-75 hover:opacity-100 text-slate-300"
                )}
              >
                <div className="space-y-1.5 flex-1">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {isComuneDedicato ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Regolamento Comunale {art.comune}
                      </span>
                    ) : isRegionalFallback ? (
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Landmark className="h-3 w-3" /> Legge Regionale Toscana
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 uppercase tracking-wider">
                        Comune di {art.comune}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                      {art.legge} - {art.articolo} {art.comma || ''}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs font-medium text-slate-100 leading-relaxed">
                    {art.descrizione}
                  </p>

                  {/* Amounts breakdown */}
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      P.M.R. (Ridotta): € {art.sanzioneRidotta.toFixed(2)}
                    </span>
                    <span className="text-slate-400">
                      Min: € {art.sanzioneMin.toFixed(2)}
                    </span>
                    <span className="text-slate-400">
                      Max: € {art.sanzioneMax.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Apply Button */}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSelectArticle(art)}
                  className={cn(
                    "shrink-0 h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider gap-1.5 transition-all cursor-pointer",
                    isSelected
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                      : "bg-sky-600 hover:bg-sky-500 text-white shadow-md active:scale-95"
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  {isSelected ? "Selezionato" : "Applica"}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
