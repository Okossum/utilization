import React from 'react';

interface ScopeFilterDropdownProps {
  lobOptions: string[];
  bereichOptions: string[];
  ccOptions: string[];
  teamOptions: string[];
  selectedLoB: string;
  setSelectedLoB: (v: string) => void;
  selectedBereich: string;
  setSelectedBereich: (v: string) => void;
  selectedCC: string;
  setSelectedCC: (v: string) => void;
  selectedTeam: string;
  setSelectedTeam: (v: string) => void;
  showAllData: boolean;
  setShowAllData: (v: boolean) => void;
  onPersist?: (next: { lob?: string; bereich?: string; competenceCenter?: string; team?: string; showAll?: boolean }) => void;
}

export default function ScopeFilterDropdown(props: ScopeFilterDropdownProps) {
  const {
    lobOptions, bereichOptions, ccOptions, teamOptions,
    selectedLoB, setSelectedLoB,
    selectedBereich, setSelectedBereich,
    selectedCC, setSelectedCC,
    selectedTeam, setSelectedTeam,
    showAllData, setShowAllData,
    onPersist,
  } = props;

  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const labelParts = [
    selectedCC,
    selectedTeam,
  ].filter(Boolean);
  const buttonLabel = labelParts.length > 0 ? labelParts.join(' › ') : 'Daten-Auswahl';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        title="Daten-Auswahl"
      >
        {buttonLabel}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-40">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={showAllData} onChange={(e) => setShowAllData(e.target.checked)} />
              <span>Alle Daten anzeigen</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-600 mb-1">CC</div>
                <select value={selectedCC} onChange={e => setSelectedCC(e.target.value)} className="w-full px-2 py-2 text-xs bg-white border border-gray-300 rounded">
                  <option value="">Alle</option>
                  {ccOptions.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Team</div>
                <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="w-full px-2 py-2 text-xs bg-white border border-gray-300 rounded">
                  <option value="">Alle</option>
                  {teamOptions.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" className="px-2 py-1.5 text-xs text-gray-600 hover:text-gray-800" onClick={() => {
                setSelectedCC(''); setSelectedTeam('');
                onPersist?.({ lob: selectedLoB, bereich: selectedBereich, competenceCenter: '', team: '', showAll: showAllData });
              }}>Zurücksetzen</button>
              <button type="button" className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700" onClick={() => { setOpen(false); onPersist?.({ lob: selectedLoB, bereich: selectedBereich, competenceCenter: selectedCC, team: selectedTeam, showAll: showAllData }); }}>Fertig</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


