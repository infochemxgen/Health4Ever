export type BioStatus = 'nominal' | 'drift' | 'critical';

export type MetricKey = 'coreTemp' | 'hydrationRate' | 'heatStorage' | 'ambientTemp';

export type TimeframeKey = '24h' | '7d' | 'nasaPower';

export type AppView = 'dashboard' | 'wardrobe' | 'lab' | 'capsules';

export type SpaceAgencyId = 'nasa' | 'esa' | 'jaxa' | 'csa';

export interface StationLocation {
  id: string;
  name: string;
  agencyContext: string;
  lat: number;
  lon: number;
}

export interface SpaceAgencyProfile {
  id: SpaceAgencyId;
  acronym: string;
  fullName: string;
  program: string;
  datasetSource: string;
  portalUrl: string;
  searchQuery: string;
  measuredParameters: string[];
  documentedStandard: string;
  garmentAlignment: string;
}

export interface TelemetryPoint {
  label: string;
  timestamp: string;
  ambientTempC: number;
  apparentTempC: number;
  relativeHumidityPct: number;
  uvIndex: number;
  solarIrradianceKwh?: number;
  projectedCoreTempC: number;
  coreTempDeltaC: number;
  requiredHydrationMlHr: number;
  heatStorageKjKg: number;
  nasaImpairmentTempC: number;
  nasaHydrationFloorMlHr: number;
  nasaHeatStorageCeilingKjKg: number;
}

export interface EnvironmentApiResponse {
  fetchedAt: string;
  coordinates: { lat: number; lon: number };
  stale?: boolean;
  error?: string;
  weather: {
    timezone?: string;
    current?: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      wind_speed_10m: number;
      uv_index: number;
    };
    hourly?: {
      time: string[];
      temperature_2m: number[];
      relative_humidity_2m: number[];
      apparent_temperature: number[];
      wind_speed_10m: number[];
      uv_index: number[];
    };
    daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      apparent_temperature_max: number[];
      uv_index_max: number[];
    };
  } | null;
  airQuality: {
    current?: {
      us_aqi?: number;
      pm2_5?: number;
      ozone?: number;
    };
  } | null;
  nasaPower: {
    properties?: {
      parameter?: {
        T2M?: Record<string, number>;
        RH2M?: Record<string, number>;
        ALLSKY_SFC_SW_DWN?: Record<string, number>;
      };
    };
  } | null;
  sourceStatus: {
    openMeteoWeather: string;
    openMeteoAirQuality: string;
    nasaPower: string;
  };
}

export interface SpaceSourcesApiResponse {
  fetchedAt: string;
  query: string;
  osdrStudies: Array<{
    accession: string;
    title: string;
    center: string;
    flightProgram: string;
    projectType: string;
    materialType: string;
    url: string;
  }>;
  pubmedPapers: Array<{
    pmid: string;
    title: string;
    journal: string;
    pubDate: string;
    firstAuthor: string;
    url: string;
  }>;
  crossrefWorks: Array<{
    doi: string;
    title: string;
    journal: string;
    year: string;
    url: string;
  }>;
  issTelemetry: {
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
    visibility: string;
    timestamp: number;
  } | null;
  sourceStatus: {
    nasaOsdr: string;
    whereTheIss: string;
    ncbiPubmed: string;
    crossref: string;
  };
}

export interface GarmentItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  imageUrl: string;
  composition: string;
  sensorZones: string[];
  thermalResistanceClo: number;
  washCycles: number;
  maxOptimalCycles: number;
  returnLabelIssued?: string;
  careSteps: string[];
}

export interface CapsuleProduct {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  biodegradablePct: number;
  sensorsIncluded: string;
  sizes: string[];
}

export interface CartItem {
  productId: string;
  name: string;
  size: string;
  cadence: 'subscription' | 'one-time';
  quantity: number;
}
