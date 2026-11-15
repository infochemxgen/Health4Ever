import baselineTeeImg from '../assets/images/garment_baseline_tee_1794771301003.jpg';
import thermoOuterwearImg from '../assets/images/garment_thermo_outerwear_1794771301300.jpg';
import recoveryTightsImg from '../assets/images/garment_recovery_leggings_1794771301770.jpg';
import { CapsuleProduct, GarmentItem } from '../types/health4ever';

export const INITIAL_GARMENTS: GarmentItem[] = [
  {
    id: 'g-baseline-tee',
    name: 'Everyday Baseline Tee',
    category: 'Upper Torso Bio-Layer',
    sku: 'H4E-BT-014',
    imageUrl: baselineTeeImg,
    composition: 'Organic Belgian Flax · Tencel Lyocell · Carbon-Nanotube Bio-Yarn',
    sensorZones: ['Thoracic Thermistor Grid', 'Sweat Electrolyte Lattice', 'Scapular TENG Flex'],
    thermalResistanceClo: 0.35,
    washCycles: 0,
    maxOptimalCycles: 250,
    careSteps: [
      'Machine wash cold (30 °C) on delicate cycle inside mesh bag',
      'Use pH-neutral plant-based detergent only; avoid fabric softeners',
      'Air dry flat away from direct heat to preserve conductive yarn alignment',
    ],
  },
  {
    id: 'g-thermo-jacket',
    name: 'Active Thermoregulation Jacket',
    category: 'Outer Climate Shell',
    sku: 'H4E-TJ-082',
    imageUrl: thermoOuterwearImg,
    composition: 'Waxed Organic Flax · Tencel · Articulated Triboelectric Weave',
    sensorZones: ['Deltoid TENG Harvester', 'Spinal Microclimate Array', 'Cuff Pulse Bridge'],
    thermalResistanceClo: 0.65,
    washCycles: 0,
    maxOptimalCycles: 250,
    careSteps: [
      'Spot clean shell or cold gentle wash at 30 °C with zipper closed',
      'Zero bleach, optical brighteners, or silicone water repellents',
      'Hang dry on wide wooden hanger to keep shoulder TENG pleats crisp',
    ],
  },
  {
    id: 'g-recovery-tights',
    name: 'Biometric Recovery Tights',
    category: 'Lower Kinetic Compression',
    sku: 'H4E-RT-209',
    imageUrl: recoveryTightsImg,
    composition: 'Tencel Knit · Fine Flax · Quadriceps Carbon-Yarn sEMG Matrix',
    sensorZones: ['Quadriceps sEMG Grid', 'Gastrocnemius Fatigue Sensor', 'Patellar TENG Zone'],
    thermalResistanceClo: 0.45,
    washCycles: 0,
    maxOptimalCycles: 250,
    careSteps: [
      'Rinse after high-salinity endurance sessions within 4 hours',
      'Cold soak (20–30 °C) with mild botanical surfactant',
      'Retire and return via prepaid circular label after 250 wash cycles',
    ],
  },
];

export const CAPSULE_PRODUCTS: CapsuleProduct[] = [
  {
    id: 'cap-tee',
    name: 'Everyday Baseline Tee',
    subtitle: 'Continuous thermal, sweat electrolyte, and GSR sensing in a breathable flax knit.',
    category: 'Core Capsule',
    imageUrl: baselineTeeImg,
    biodegradablePct: 97,
    sensorsIncluded: 'Core Temp · Sweat Hydration · Scapular TENG',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'cap-jacket',
    name: 'Active Thermoregulation Jacket',
    subtitle: 'High-motion shoulder and elbow TENG weave powers environmental heat-load telemetry passively.',
    category: 'Outerwear Capsule',
    imageUrl: thermoOuterwearImg,
    biodegradablePct: 96,
    sensorsIncluded: 'Microclimate Temp · Dual TENG · Moisture Vapor Flux',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'cap-tights',
    name: 'Biometric Recovery Tights',
    subtitle: 'Woven carbon-nanotube sEMG matrices track muscular fatigue without rigid pods.',
    category: 'Endurance Capsule',
    imageUrl: recoveryTightsImg,
    biodegradablePct: 95,
    sensorsIncluded: 'Quad & Calf sEMG · Patellar TENG · Skin Temp',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
];

export interface TextileLayerSpec {
  id: string;
  name: string;
  material: string;
  signalRole: string;
  description: string;
}

export const TEXTILE_LAYERS: TextileLayerSpec[] = [
  {
    id: 'flax-tencel',
    name: 'Organic Flax & Tencel Matrix',
    material: 'Unbleached organic flax + closed-loop wood-pulp Tencel lyocell',
    signalRole: 'Capillary moisture wicking & zero-plastic biodegradability',
    description:
      'Forms the breathable structural chassis of every garment, maintaining capillary sweat transport across sensor electrodes while eliminating synthetic micro-shedding.',
  },
  {
    id: 'cnt-yarns',
    name: 'Carbon-Nanotube (CNT) Bio-Yarns',
    material: 'Natural cellulose-spun threads infused with conductive carbon nanotubes',
    signalRole: 'Galvanic skin response, thermal micro-climate & sEMG capture',
    description:
      'Conductive threads woven seamlessly along pectoral, scapular, and quadriceps anatomical lines to capture physiological signals without rigid adhesives.',
  },
  {
    id: 'teng-zones',
    name: 'Triboelectric Nanogenerator (TENG) Zones',
    material: 'Articulated natural-fiber triboelectric weave in high-motion joints',
    signalRole: 'Passive kinetic energy harvesting from natural movement',
    description:
      'Embedded in shoulder and knee flex zones to harvest kinetic energy from natural movement, eliminating disposable lithium batteries.',
  },
  {
    id: 'ble-node',
    name: 'Modular BLE Telemetry Bridge',
    material: 'Reusable snap-off Bluetooth Low Energy micro-transponder',
    signalRole: 'Streams garment sensor telemetry to Health4Ever OS',
    description:
      'A featherweight detachable clasp that pairs via Bluetooth Low Energy and unclips cleanly before garment washing or end-of-life composting.',
  },
];
