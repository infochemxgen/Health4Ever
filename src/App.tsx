import { useCallback, useEffect, useState } from 'react';
import { Activity, FlaskConical, Shirt, ShoppingBag } from 'lucide-react';
import { BioDashboardView } from './components/BioDashboardView';
import { BleSyncModal } from './components/BleSyncModal';
import { CapsulesPlansView } from './components/CapsulesPlansView';
import { NasaHrpLabView } from './components/NasaHrpLabView';
import { WardrobeManagerView } from './components/WardrobeManagerView';
import { MONITORING_STATIONS } from './data/spaceAgencyData';
import { INITIAL_GARMENTS } from './data/telemetryData';
import { fetchEnvironmentResilient } from './utils/directApiFallback';
import {
  AppView,
  BioStatus,
  EnvironmentApiResponse,
  GarmentItem,
  SpaceAgencyId,
} from './types/health4ever';

const NAV_ITEMS: { id: AppView; label: string; icon: typeof Activity }[] = [
  { id: 'dashboard', label: 'Bio-Dashboard', icon: Activity },
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
  { id: 'lab', label: 'Space Data Lab', icon: FlaskConical },
  { id: 'capsules', label: 'Capsules', icon: ShoppingBag },
];

const GARMENT_STORAGE_KEY = 'health4ever_garments_v1';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [manualOverride, setManualOverride] = useState<BioStatus | null>(null);
  const [agencyId, setAgencyId] = useState<SpaceAgencyId>('nasa');
  const [stationId, setStationId] = useState<string>(MONITORING_STATIONS[0].id);

  const [envData, setEnvData] = useState<EnvironmentApiResponse | null>(null);
  const [envLoading, setEnvLoading] = useState<boolean>(true);
  const [envError, setEnvError] = useState<string | null>(null);

  const [garments, setGarments] = useState<GarmentItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(GARMENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GarmentItem[];
        if (Array.isArray(parsed) && parsed.length === INITIAL_GARMENTS.length) {
          return parsed;
        }
      }
    } catch {
      // Fall back to initial blueprint garments
    }
    return INITIAL_GARMENTS;
  });

  const [activeGarmentId, setActiveGarmentId] = useState<string>(INITIAL_GARMENTS[0].id);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [garmentModalOpen, setGarmentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(GARMENT_STORAGE_KEY, JSON.stringify(garments));
    } catch {
      // Ignore storage quota errors
    }
  }, [garments]);

  const fetchEnvironment = useCallback(async (targetStationId: string) => {
    const station =
      MONITORING_STATIONS.find((s) => s.id === targetStationId) ?? MONITORING_STATIONS[0];
    setEnvLoading(true);
    setEnvError(null);
    try {
      const json = await fetchEnvironmentResilient(station.lat, station.lon);
      setEnvData(json);
    } catch (err) {
      setEnvError(
        err instanceof Error ? err.message : 'Unable to fetch live environmental telemetry.'
      );
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironment(stationId);
  }, [stationId, fetchEnvironment]);

  const activeGarment =
    garments.find((g) => g.id === activeGarmentId) ?? garments[0];

  const isCriticalLocked = manualOverride === 'critical' && activeView === 'dashboard';

  const handleLogWashCycle = (id: string) => {
    setGarments((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        return {
          ...g,
          washCycles: Math.min(g.maxOptimalCycles + 25, g.washCycles + 1),
        };
      })
    );
  };

  const handleIssueReturnLabel = (id: string) => {
    const rma = `RMA-H4E-${Math.floor(10000 + Math.random() * 89999)}`;
    setGarments((prev) =>
      prev.map((g) => (g.id === id ? { ...g, returnLabelIssued: rma } : g))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              if (!isCriticalLocked) setActiveView('dashboard');
            }}
            className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            Health4Ever
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isCriticalLocked && item.id !== 'dashboard'}
                  onClick={() => setActiveView(item.id)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                    active
                      ? 'text-slate-900 border-slate-900'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={isCriticalLocked}
              onClick={() => setGarmentModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
            >
              Garment Layer
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
        {activeView === 'dashboard' && (
          <BioDashboardView
            stationId={stationId}
            onChangeStation={setStationId}
            envData={envData}
            envLoading={envLoading}
            envError={envError}
            onRefreshEnv={() => fetchEnvironment(stationId)}
            activeGarment={activeGarment}
            isPro={isPro}
            onNavigateToPlans={() => setActiveView('capsules')}
            onNavigateToSpaceLab={() => setActiveView('lab')}
            onOpenGarmentSelect={() => setGarmentModalOpen(true)}
            manualOverride={manualOverride}
            onChangeManualOverride={setManualOverride}
          />
        )}

        {activeView === 'wardrobe' && (
          <WardrobeManagerView
            garments={garments}
            activeGarmentId={activeGarmentId}
            onSelectActiveGarment={setActiveGarmentId}
            onLogWashCycle={handleLogWashCycle}
            onIssueReturnLabel={handleIssueReturnLabel}
          />
        )}

        {activeView === 'lab' && (
          <NasaHrpLabView agencyId={agencyId} onChangeAgency={setAgencyId} />
        )}

        {activeView === 'capsules' && (
          <CapsulesPlansView isPro={isPro} onTogglePro={setIsPro} />
        )}
      </main>

      <footer className="hidden md:block border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between gap-6 text-xs text-slate-500">
          <p>
            Health4Ever · Autonomous Biometric Apparel &amp; Planetary Health Fashion
          </p>
          <p>
            Live Sources: Open-Meteo · NASA POWER · NASA OSDR · WhereTheISS · NCBI PubMed · Crossref
          </p>
        </div>
      </footer>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-4 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isCriticalLocked && item.id !== 'dashboard'}
                onClick={() => setActiveView(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  active ? 'text-slate-900 font-semibold' : 'text-slate-500'
                } disabled:opacity-40`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.75} />
                <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <BleSyncModal
        isOpen={garmentModalOpen}
        onClose={() => setGarmentModalOpen(false)}
        garments={garments}
        activeGarmentId={activeGarmentId}
        onSelectGarment={(id) => setActiveGarmentId(id)}
      />
    </div>
  );
}
