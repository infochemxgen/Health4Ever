import { useState } from 'react';
import { Check, Droplet, PackageCheck, Recycle } from 'lucide-react';
import { GarmentItem } from '../types/health4ever';
import { ResilientImage } from './ResilientImage';

interface WardrobeManagerViewProps {
  garments: GarmentItem[];
  activeGarmentId: string;
  onSelectActiveGarment: (id: string) => void;
  onLogWashCycle: (id: string) => void;
  onIssueReturnLabel: (id: string) => void;
}

export function WardrobeManagerView({
  garments,
  activeGarmentId,
  onSelectActiveGarment,
  onLogWashCycle,
  onIssueReturnLabel,
}: WardrobeManagerViewProps) {
  const [selectedCareId, setSelectedCareId] = useState<string>(garments[0]?.id ?? '');
  const [returnModalGarment, setReturnModalGarment] = useState<GarmentItem | null>(null);

  const inspectedGarment =
    garments.find((g) => g.id === selectedCareId) ?? garments[0];

  const handleConfirmReturn = (garment: GarmentItem) => {
    onIssueReturnLabel(garment.id);
    setReturnModalGarment(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Zero E-Waste Lifecycle · Organic Flax &amp; Tencel Care Ledger (Saved Locally)
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1 text-balance">
            Garment &amp; Wardrobe Manager
          </h1>
        </div>
        <p className="text-xs font-mono text-slate-600 tabular-nums">
          {garments.length} Blueprint Garments · Zero Disposable Batteries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {garments.map((garment) => {
          const isActive = garment.id === activeGarmentId;
          const lifeRemainingPct = Math.max(
            0,
            Math.round(
              ((garment.maxOptimalCycles - garment.washCycles) / garment.maxOptimalCycles) * 100
            )
          );
          const nearEndOfLife = garment.washCycles >= 220;

          return (
            <div
              key={garment.id}
              className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-colors ${
                isActive ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <ResilientImage
                    src={garment.imageUrl}
                    alt={`${garment.name} biometric garment`}
                    className="w-full h-full object-cover"
                    fallbackLabel={garment.name}
                  />
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {garment.category} · {garment.sku}
                      {isActive ? ' · Active in Thermal Model' : ''}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 mt-1">{garment.name}</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {garment.composition}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Optimal Lifecycle Remaining</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {lifeRemainingPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          lifeRemainingPct >= 30
                            ? 'bg-emerald-600'
                            : lifeRemainingPct >= 12
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${lifeRemainingPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <p className="text-slate-500">Logged Washes</p>
                        <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                          {garment.washCycles} / {garment.maxOptimalCycles}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Insulation Factor</p>
                        <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                          {garment.thermalResistanceClo.toFixed(2)} clo
                        </p>
                      </div>
                    </div>

                    {nearEndOfLife && !garment.returnLabelIssued && (
                      <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ▲ Approaching 250-cycle threshold. Circular return label ready.
                      </p>
                    )}

                    {garment.returnLabelIssued && (
                      <p className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        ● Return Label Active: {garment.returnLabelIssued}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectActiveGarment(garment.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[40px] ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {isActive ? 'Active in Model' : 'Select Garment'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onLogWashCycle(garment.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[40px]"
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    <span>Log Wash (+1)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCareId(garment.id)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[40px]"
                  >
                    Care Protocol
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnModalGarment(garment)}
                    disabled={Boolean(garment.returnLabelIssued)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap min-h-[40px] ${
                      garment.returnLabelIssued
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    <Recycle className="w-3.5 h-3.5" />
                    <span>{garment.returnLabelIssued ? 'Label Issued' : 'Return Label'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {inspectedGarment && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Conductivity-Preserving Care Protocol · {inspectedGarment.name}
              </p>
              <h2 className="text-xl font-semibold text-slate-900 mt-1">
                Maintaining Bio-Yarn Sensor Fidelity
              </h2>
            </div>

            <div className="space-y-3">
              {inspectedGarment.careSteps.map((step, i) => (
                <div
                  key={step}
                  className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-xs font-mono font-semibold text-slate-400 mt-0.5 tabular-nums">
                    0{i + 1}.
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Closed-Loop Circularity</p>
              <h3 className="text-base font-semibold text-slate-900 mt-1">
                One-Tap End-of-Life Return Request
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Unclip the reusable Bluetooth Low Energy bridge prior to mailing so the biodegradable natural-fiber textile can be recovered without electronic waste.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReturnModalGarment(inspectedGarment)}
              disabled={Boolean(inspectedGarment.returnLabelIssued)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:bg-emerald-100 disabled:text-emerald-800 transition-colors min-h-[44px]"
            >
              {inspectedGarment.returnLabelIssued
                ? `Prepaid Label Issued (${inspectedGarment.returnLabelIssued})`
                : `Request Prepaid Return Label for ${inspectedGarment.sku}`}
            </button>
          </div>
        </div>
      )}

      {returnModalGarment && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Issue Circular Return Label"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-emerald-700">Zero E-Waste Circular Return</p>
                <h3 className="text-lg font-semibold text-slate-900 mt-1">
                  Confirm Prepaid Recycling Label
                </h3>
              </div>
              <PackageCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <p className="font-semibold text-slate-900">{returnModalGarment.name}</p>
              <p className="text-slate-600 font-mono">
                SKU: {returnModalGarment.sku} · {returnModalGarment.washCycles} Washes Logged
              </p>
              <p className="text-slate-600 pt-1">
                Detach your modular BLE transponder before mailing the textile for closed-loop fiber recovery.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReturnModalGarment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReturn(returnModalGarment)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 min-h-[40px]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Generate Return Reference</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
