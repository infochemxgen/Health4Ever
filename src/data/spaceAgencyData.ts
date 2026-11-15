import { SpaceAgencyId, SpaceAgencyProfile, StationLocation } from '../types/health4ever';

// Documented NASA-STD-3001 Vol. 2 Published Operational Thresholds
export const NASA_STD_3001 = {
  standardCode: 'NASA-STD-3001 Vol. 2',
  restingCoreTempC: 37.0,
  coreTempRiseImpairmentC: 0.6, // +0.6 °C (+1.0 °F) performance impairment threshold
  coreTempImpairmentC: 37.6,
  heatStorageMaxKjKg: 3.0, // +3.0 kJ/kg upper heat storage limit
  heatStorageMinKjKg: -1.9, // -1.9 kJ/kg lower heat storage limit
  skinTempRiseLimitC: 1.4, // +1.4 °C (+2.5 °F) skin temp threshold
  heartRateLimitBpm: 140, // 140 bpm impairment threshold
  minHydrationMlPerHour: 240, // 240 mL (8 fl oz) per hour minimum standard
  metabolicRangeWatts: { min: 147, max: 617 }, // 528 to 2220 kJ/hr nominal range
};

export const MONITORING_STATIONS: StationLocation[] = [
  {
    id: 'houston-jsc',
    name: 'Houston, TX',
    agencyContext: 'NASA Johnson Space Center',
    lat: 29.5593,
    lon: -95.09,
  },
  {
    id: 'cologne-envihab',
    name: 'Cologne, DE',
    agencyContext: 'ESA / DLR :envihab',
    lat: 50.8543,
    lon: 7.1225,
  },
  {
    id: 'tsukuba-jaxa',
    name: 'Tsukuba, JP',
    agencyContext: 'JAXA Space Center',
    lat: 36.0658,
    lon: 140.1286,
  },
  {
    id: 'montreal-csa',
    name: 'Saint-Hubert, QC',
    agencyContext: 'CSA Headquarters',
    lat: 45.5194,
    lon: -73.4,
  },
  {
    id: 'concordia-antarctica',
    name: 'Concordia Station',
    agencyContext: 'ESA / IPEV / PNRA Polar Analog',
    lat: -75.1,
    lon: 123.3333,
  },
  {
    id: 'san-francisco',
    name: 'San Francisco, CA',
    agencyContext: 'Urban Field Baseline',
    lat: 37.7749,
    lon: -122.4194,
  },
];

export const SPACE_AGENCY_PROFILES: Record<SpaceAgencyId, SpaceAgencyProfile> = {
  nasa: {
    id: 'nasa',
    acronym: 'NASA',
    fullName: 'National Aeronautics and Space Administration',
    program: 'NASA-STD-3001 Vol. 2 · OSDR & Human Research Program (HRP)',
    datasetSource: 'NASA Open Science Data Repository (osdr.nasa.gov) & NASA POWER',
    portalUrl: 'https://osdr.nasa.gov/',
    searchQuery: 'spaceflight human physiology',
    measuredParameters: [
      'Body Heat Storage (−1.9 to +3.0 kJ/kg)',
      'Core Temp Delta (+0.6 °C impairment onset)',
      'Skin Temp Delta (+1.4 °C)',
      'Potable Hydration Floor (240 mL/hr)',
      'Heart Rate Strain (140 bpm)',
    ],
    documentedStandard:
      'NASA-STD-3001 limits body heat storage between −1.9 and +3.0 kJ/kg, identifies performance impairment at +0.6 °C core rise or >140 bpm HR, and recommends ≥240 mL/hr potable water during suited/active operations.',
    garmentAlignment:
      'Health4Ever torso CNT thermistors and sweat lattices map directly to NASA-STD-3001 thermal storage and 240 mL/hr fluid-replacement thresholds.',
  },
  esa: {
    id: 'esa',
    acronym: 'ESA',
    fullName: 'European Space Agency',
    program: 'DLR :envihab Bed-Rest & Concordia Station Analog Studies',
    datasetSource: 'ESA Erasmus Experiment Archive & PubMed AGBRESA / Concordia Studies',
    portalUrl: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration',
    searchQuery: 'spaceflight bed rest',
    measuredParameters: [
      'Circadian Core Temperature Telemetry',
      '6° Head-Down Tilt Fluid Redistribution',
      'Heart Rate Variability (HRV) & Hemodynamics',
      'Sleep EEG Architecture',
      'Hypobaric Polar Autonomic Stress',
    ],
    documentedStandard:
      'DLR :envihab (Cologne) and Concordia Station (Antarctica) track continuous core temperature circadian rhythms, hemodynamic fluid shifts, and autonomic stress under confinement and polar hypoxia.',
    garmentAlignment:
      'Health4Ever multi-day longitudinal charts mirror :envihab circadian temperature curves to distinguish normal diurnal variation from early physiological drift.',
  },
  jaxa: {
    id: 'jaxa',
    acronym: 'JAXA',
    fullName: 'Japan Aerospace Exploration Agency',
    program: 'ISS Kibo Biomedical & Musculoskeletal Adaptation Research',
    datasetSource: 'JAXA Human Spaceflight Research & NCBI PubMed Open Records',
    portalUrl: 'https://humans-in-space.jaxa.jp/en/',
    searchQuery: 'skeletal muscle spaceflight',
    measuredParameters: [
      'Lower-Limb Muscle Volume & Fatigue',
      'Autonomic Cardiovascular HRV',
      'Bone & Fluid Balance Biomarkers',
      'Postural Neuromuscular Loading',
    ],
    documentedStandard:
      'JAXA Kibo biomedical experiments investigate long-duration musculoskeletal fatigue, lower-limb deconditioning, and autonomic balance aboard the International Space Station.',
    garmentAlignment:
      'Health4Ever Biometric Recovery Tights integrate woven quadriceps and calf carbon-nanotube sEMG matrices aligned with lower-limb neuromuscular loading research.',
  },
  csa: {
    id: 'csa',
    acronym: 'CSA',
    fullName: 'Canadian Space Agency',
    program: 'ISS Bio-Monitor Wearable Smart Garment System',
    datasetSource: 'CSA Bio-Monitor Program & Crossref Peer-Reviewed Proceedings',
    portalUrl: 'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp',
    searchQuery: 'wearable physiological spaceflight',
    measuredParameters: [
      'Continuous Thoracic ECG (HR & Rhythm)',
      'Arterial Blood Pressure Estimation',
      'Respiratory Rate & Minute Volume',
      'Skin Surface Temperature',
      '3-Axis Physical Activity Accelerometry',
    ],
    documentedStandard:
      'CSA Bio-Monitor validates continuous garment-embedded thoracic monitoring of astronauts aboard the ISS during sleep, routine work, and exercise without bulky cuffs.',
    garmentAlignment:
      'Validates Health4Ever’s core architecture: embedding zero-discomfort biometric sensors directly into breathable everyday shirts instead of rigid wrist wearables.',
  },
};

export const SPACE_AGENCY_LIST: SpaceAgencyProfile[] = [
  SPACE_AGENCY_PROFILES.nasa,
  SPACE_AGENCY_PROFILES.esa,
  SPACE_AGENCY_PROFILES.jaxa,
  SPACE_AGENCY_PROFILES.csa,
];
