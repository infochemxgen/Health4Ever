import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';
import { SPACE_AGENCY_LIST, SPACE_AGENCY_PROFILES } from '../data/spaceAgencyData';
import { TEXTILE_LAYERS } from '../data/telemetryData';
import { SpaceAgencyId, SpaceSourcesApiResponse } from '../types/health4ever';

interface NasaHrpLabViewProps {
  agencyId: SpaceAgencyId;
  onChangeAgency: (id: SpaceAgencyId) => void;
}

export function NasaHrpLabView({ agencyId, onChangeAgency }: NasaHrpLabViewProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string>(TEXTILE_LAYERS[0].id);
  const [searchInput, setSearchInput] = useState<string>(
    SPACE_AGENCY_PROFILES[agencyId].searchQuery
  );
  const [activeQuery, setActiveQuery] = useState<string>(
    SPACE_AGENCY_PROFILES[agencyId].searchQuery
  );
  const [spaceData, setSpaceData] = useState<SpaceSourcesApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const agency = SPACE_AGENCY_PROFILES[agencyId];
  const selectedLayer =
    TEXTILE_LAYERS.find((l) => l.id === selectedLayerId) ?? TEXTILE_LAYERS[0];

  const loadSpaceSources = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/space-sources?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = (await res.json()) as SpaceSourcesApiResponse;
      setSpaceData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach space agency data endpoints.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaceSources(activeQuery);
  }, [activeQuery]);

  const handleSelectAgency = (id: SpaceAgencyId) => {
    onChangeAgency(id);
    const nextQ = SPACE_AGENCY_PROFILES[id].searchQuery;
    setSearchInput(nextQ);
    setActiveQuery(nextQ);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = searchInput.trim();
    if (cleaned) {
      setActiveQuery(cleaned);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-slate-500">
          Live Open Science APIs · NASA OSDR · WhereTheISS · NCBI PubMed · Crossref DOI
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1 text-balance">
          Space Agency Open Data Lab &amp; Bio-Yarn Stack
        </h1>
      </div>

      {/* Live International Space Station Telemetry Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Live Orbital Research Platform (WhereTheISS API · NORAD ID 25544)
            </p>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">
              International Space Station — Active Lab for NASA HRP, CSA Bio-Monitor, ESA Columbus &amp; JAXA Kibo
            </h2>
          </div>

          <button
            type="button"
            onClick={() => loadSpaceSources(activeQuery)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center min-h-[36px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Feeds</span>
          </button>
        </div>

        {spaceData?.issTelemetry ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div>
              <p className="text-xs text-slate-500">Orbital Coordinates</p>
              <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-1">
                {spaceData.issTelemetry.latitude.toFixed(2)}°,{' '}
                {spaceData.issTelemetry.longitude.toFixed(2)}°
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Altitude</p>
              <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-1">
                {spaceData.issTelemetry.altitude.toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Velocity</p>
              <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-1">
                {Math.round(spaceData.issTelemetry.velocity).toLocaleString()} km/h
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Solar Exposure</p>
              <p className="text-sm font-mono font-semibold text-slate-900 capitalize mt-1">
                {spaceData.issTelemetry.visibility}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs font-mono text-slate-500 pt-4">
            {loading ? 'Loading live ISS orbital coordinates...' : 'ISS orbital API temporarily unavailable.'}
          </p>
        )}
      </div>

      {/* Space Agency Explorer & Live Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Documented International Spaceflight Programs
            </p>
            <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
              Select Agency Program or Query Live Repositories
            </h2>
          </div>

          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start"
            role="group"
            aria-label="Select space agency program"
          >
            {SPACE_AGENCY_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectAgency(item.id)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                  agencyId === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.acronym}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-mono text-emerald-700">
                {agency.acronym} · {agency.program}
              </p>
              <a
                href={agency.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                <span>Official Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{agency.fullName}</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{agency.documentedStandard}</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Garment Alignment: {agency.garmentAlignment}
            </p>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-medium text-slate-500">
              Verified Tracked Physiological Parameters
            </p>
            <ul className="space-y-1.5 text-xs text-slate-800">
              {agency.measuredParameters.map((param) => (
                <li key={param} className="font-mono">
                  · {param}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Live Search Form across NASA OSDR, PubMed, and Crossref */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search live NASA OSDR, PubMed & Crossref (e.g. triboelectric textile, bed rest, Bio-Monitor)"
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 min-h-[42px]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
          >
            Query Live Repositories
          </button>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-4">
            {error}
          </div>
        )}

        {/* 3 Live Data Feeds: NASA OSDR Studies, NCBI PubMed Papers, Crossref DOIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed 1: NASA OSDR Studies */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">NASA OSDR Datasets</h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {spaceData?.sourceStatus.nasaOsdr ?? 'loading'}
                </span>
              </div>

              {loading ? (
                <p className="text-xs text-slate-500 py-4 font-mono">Querying osdr.nasa.gov...</p>
              ) : !spaceData || spaceData.osdrStudies.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No matching OSDR studies found for "{activeQuery}". Try "spaceflight" or "muscle".
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {spaceData.osdrStudies.slice(0, 5).map((study) => (
                    <a
                      key={study.accession}
                      href={study.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-emerald-700">
                          {study.accession}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-xs font-medium text-slate-900 mt-1 line-clamp-2">
                        {study.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {study.center || 'NASA OSDR'} · {study.flightProgram || study.projectType}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feed 2: NCBI PubMed Biomedical Literature */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">NCBI PubMed Literature</h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {spaceData?.sourceStatus.ncbiPubmed ?? 'loading'}
                </span>
              </div>

              {loading ? (
                <p className="text-xs text-slate-500 py-4 font-mono">
                  Querying eutils.ncbi.nlm.nih.gov...
                </p>
              ) : !spaceData || spaceData.pubmedPapers.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No PubMed records matched "{activeQuery}".
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {spaceData.pubmedPapers.slice(0, 5).map((paper) => (
                    <a
                      key={paper.pmid}
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-700">
                          PMID {paper.pmid}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-xs font-medium text-slate-900 mt-1 line-clamp-2">
                        {paper.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {paper.firstAuthor} · {paper.journal} · {paper.pubDate}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feed 3: Crossref DOI Records */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Crossref DOI Registry</h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {spaceData?.sourceStatus.crossref ?? 'loading'}
                </span>
              </div>

              {loading ? (
                <p className="text-xs text-slate-500 py-4 font-mono">Querying api.crossref.org...</p>
              ) : !spaceData || spaceData.crossrefWorks.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No Crossref works matched "{activeQuery}".
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {spaceData.crossrefWorks.slice(0, 5).map((work) => (
                    <a
                      key={work.doi}
                      href={work.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-700 truncate">
                          {work.doi}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-xs font-medium text-slate-900 mt-1 line-clamp-2">
                        {work.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {work.journal} {work.year ? `· ${work.year}` : ''}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conductive Bio-Yarn & TENG Cross-Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Smart Textile Architecture</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-1">
              Four-Layer Biodegradable Sensor Weave
            </h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <svg
              viewBox="0 0 480 250"
              className="w-full h-auto"
              aria-label="Health4Ever textile cross-section diagram"
            >
              <g onClick={() => setSelectedLayerId('flax-tencel')} className="cursor-pointer">
                <rect
                  x="24"
                  y="24"
                  width="432"
                  height="46"
                  rx="8"
                  fill={selectedLayerId === 'flax-tencel' ? '#ECFDF5' : '#FFFFFF'}
                  stroke={selectedLayerId === 'flax-tencel' ? '#059669' : '#CBD5E1'}
                  strokeWidth={selectedLayerId === 'flax-tencel' ? '2' : '1'}
                />
                <text x="42" y="45" className="fill-slate-900 text-[12px] font-semibold">
                  01. Organic Flax &amp; Tencel Capillary Matrix
                </text>
                <text x="42" y="61" className="fill-slate-500 text-[10px] font-mono">
                  Biodegradable plant-based substrate · Zero synthetic micro-shedding
                </text>
              </g>

              <g onClick={() => setSelectedLayerId('cnt-yarns')} className="cursor-pointer">
                <rect
                  x="24"
                  y="80"
                  width="432"
                  height="46"
                  rx="8"
                  fill={selectedLayerId === 'cnt-yarns' ? '#ECFDF5' : '#FFFFFF'}
                  stroke={selectedLayerId === 'cnt-yarns' ? '#059669' : '#CBD5E1'}
                  strokeWidth={selectedLayerId === 'cnt-yarns' ? '2' : '1'}
                />
                <text x="42" y="101" className="fill-slate-900 text-[12px] font-semibold">
                  02. Carbon-Nanotube (CNT) Conductive Threads
                </text>
                <text x="42" y="117" className="fill-slate-500 text-[10px] font-mono">
                  Galvanic skin response, thermal micro-climate &amp; sEMG sensing
                </text>
              </g>

              <g onClick={() => setSelectedLayerId('teng-zones')} className="cursor-pointer">
                <rect
                  x="24"
                  y="136"
                  width="432"
                  height="46"
                  rx="8"
                  fill={selectedLayerId === 'teng-zones' ? '#ECFDF5' : '#FFFFFF'}
                  stroke={selectedLayerId === 'teng-zones' ? '#059669' : '#CBD5E1'}
                  strokeWidth={selectedLayerId === 'teng-zones' ? '2' : '1'}
                />
                <text x="42" y="157" className="fill-slate-900 text-[12px] font-semibold">
                  03. Triboelectric Nanogenerator (TENG) Flex Zones
                </text>
                <text x="42" y="173" className="fill-slate-500 text-[10px] font-mono">
                  Passive kinetic energy harvesting · Eliminates disposable batteries
                </text>
              </g>

              <g onClick={() => setSelectedLayerId('ble-node')} className="cursor-pointer">
                <rect
                  x="24"
                  y="192"
                  width="432"
                  height="46"
                  rx="8"
                  fill={selectedLayerId === 'ble-node' ? '#ECFDF5' : '#FFFFFF'}
                  stroke={selectedLayerId === 'ble-node' ? '#059669' : '#CBD5E1'}
                  strokeWidth={selectedLayerId === 'ble-node' ? '2' : '1'}
                />
                <text x="42" y="213" className="fill-slate-900 text-[12px] font-semibold">
                  04. Modular Bluetooth Low Energy Telemetry Bridge
                </text>
                <text x="42" y="229" className="fill-slate-500 text-[10px] font-mono">
                  Detachable reusable clasp · Streams garment metrics to Health4Ever OS
                </text>
              </g>
            </svg>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap gap-2">
            {TEXTILE_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelectedLayerId(layer.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap min-h-[36px] ${
                  selectedLayerId === layer.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {layer.name.split(' ')[0]} {layer.name.split(' ')[1]}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 flex-1">
            <div>
              <p className="text-xs font-mono text-emerald-700">{selectedLayer.signalRole}</p>
              <h3 className="text-lg font-semibold text-slate-900 mt-1">{selectedLayer.name}</h3>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                {selectedLayer.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs">
              <p className="text-slate-500">Material Composition</p>
              <p className="font-medium text-slate-900 mt-0.5">{selectedLayer.material}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blue Ocean Shift Comparison */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto">
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500">Category Positioning</p>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            The Blue Ocean Shift: Autonomous Biometric Apparel
          </h2>
        </div>

        <table className="w-full text-left border-collapse text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-3 pr-4 font-medium">Dimension</th>
              <th className="py-3 px-4 font-medium">Traditional Eco-Fashion</th>
              <th className="py-3 px-4 font-medium">Plastic Fitness Wearables</th>
              <th className="py-3 pl-4 font-semibold text-slate-900">Health4Ever ABA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            <tr>
              <td className="py-3.5 pr-4 font-medium text-slate-900">E-Waste Footprint</td>
              <td className="py-3.5 px-4 text-slate-600">Recycled cotton, zero electronics</td>
              <td className="py-3.5 px-4 text-slate-600">Rigid plastic housing &amp; lithium cells</td>
              <td className="py-3.5 pl-4 text-emerald-800 font-medium">
                Biodegradable natural-fiber sensors · Zero disposable batteries
              </td>
            </tr>
            <tr>
              <td className="py-3.5 pr-4 font-medium text-slate-900">Power Source</td>
              <td className="py-3.5 px-4 text-slate-600">None</td>
              <td className="py-3.5 px-4 text-slate-600">External charging cable</td>
              <td className="py-3.5 pl-4 text-emerald-800 font-medium">
                Passive Triboelectric Nanogenerator (TENG) joint zones
              </td>
            </tr>
            <tr>
              <td className="py-3.5 pr-4 font-medium text-slate-900">Reference Standards</td>
              <td className="py-3.5 px-4 text-slate-600">None</td>
              <td className="py-3.5 px-4 text-slate-600">Proprietary consumer heuristics</td>
              <td className="py-3.5 pl-4 text-emerald-800 font-medium">
                Grounded in NASA-STD-3001, OSDR, ESA :envihab, JAXA Kibo &amp; CSA Bio-Monitor
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
