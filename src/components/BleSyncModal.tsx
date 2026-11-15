import { CheckCircle2, Shirt, X } from 'lucide-react';
import { GarmentItem } from '../types/health4ever';

interface BleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  garments: GarmentItem[];
  activeGarmentId: string;
  onSelectGarment: (id: string) => void;
}

export function BleSyncModal({
  isOpen,
  onClose,
  garments,
  activeGarmentId,
  onSelectGarment,
}: BleSyncModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select Active Garment Layer"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Thermal Insulation (clo) &amp; Sensor Zone Profile
            </p>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
              Select Active Garment Layer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close garment selector"
            className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Selecting a garment updates the thermal resistance factor (clo) used in the NASA-STD-3001 body heat storage projection on the Bio-Dashboard.
        </p>

        <div className="space-y-2.5">
          {garments.map((g) => {
            const active = g.id === activeGarmentId;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  onSelectGarment(g.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors min-h-[60px] ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-600'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                    {g.sku} · {g.thermalResistanceClo.toFixed(2)} clo · {g.sensorZones.join(' · ')}
                  </p>
                </div>
                {active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <Shirt className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
