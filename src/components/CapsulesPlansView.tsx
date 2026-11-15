import { useState } from 'react';
import { Check, ShoppingBag, Trash2 } from 'lucide-react';
import { CAPSULE_PRODUCTS } from '../data/telemetryData';
import { CartItem } from '../types/health4ever';
import { ResilientImage } from './ResilientImage';

interface CapsulesPlansViewProps {
  isPro: boolean;
  onTogglePro: (pro: boolean) => void;
}

export function CapsulesPlansView({ isPro, onTogglePro }: CapsulesPlansViewProps) {
  const [cadence, setCadence] = useState<'subscription' | 'one-time'>('subscription');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({
    'cap-tee': 'M',
    'cap-jacket': 'M',
    'cap-tights': 'M',
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);

  const handleAddToCart = (productId: string) => {
    const prod = CAPSULE_PRODUCTS.find((p) => p.id === productId);
    if (!prod) return;
    const size = selectedSizes[productId] || 'M';

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === productId && item.size === size && item.cadence === cadence
      );
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId,
          name: prod.name,
          size,
          cadence,
          quantity: 1,
        },
      ];
    });
    setOrderPlaced(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    const refId = `H4E-DROP-${Math.floor(100000 + Math.random() * 899999)}`;
    setOrderPlaced(refId);
    setCart([]);
  };

  return (
    <div className="space-y-10">
      {/* Section 1: Circular Apparel Capsule Drops */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Circular Apparel Blueprint · Closed-Loop Seasonal Drops
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1 text-balance">
              Seasonal Biometric Capsules &amp; OS Tiers
            </h1>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start">
            <button
              type="button"
              onClick={() => setCadence('subscription')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[34px] ${
                cadence === 'subscription'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Seasonal Capsule Drop
            </button>
            <button
              type="button"
              onClick={() => setCadence('one-time')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[34px] ${
                cadence === 'one-time'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Garment Kit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CAPSULE_PRODUCTS.map((product) => {
            const activeSize = selectedSizes[product.id] || 'M';

            return (
              <div
                key={product.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <ResilientImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      fallbackLabel={product.name}
                    />
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-xs text-slate-500">
                      {product.category} · {product.biodegradablePct}% Compostable
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">{product.subtitle}</p>
                    <p className="text-xs font-mono text-slate-500 pt-1">
                      Sensors: {product.sensorsIncluded}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Size</span>
                    <div className="flex items-center gap-1">
                      {product.sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            setSelectedSizes((prev) => ({ ...prev, [product.id]: sz }))
                          }
                          className={`w-8 h-8 text-xs font-mono font-medium rounded-md border transition-colors ${
                            activeSize === sz
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors min-h-[44px]"
                  >
                    Add Size {activeSize} to Capsule Bag
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Capsule Bag Summary */}
        {(cart.length > 0 || orderPlaced) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            {orderPlaced ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    ● Capsule Request Recorded ({orderPlaced})
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Your biodegradable garment kit and modular BLE telemetry bridge selection have been logged.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderPlaced(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 self-start sm:self-center"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-900">Capsule Selection Bag</h3>
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                    {totalItems} {totalItems === 1 ? 'Garment' : 'Garments'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.productId}-${item.size}-${item.cadence}`}
                      className="py-3 flex items-center justify-between gap-4 text-xs sm:text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.name} · Size {item.size} · Qty {item.quantity}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.cadence === 'subscription'
                            ? 'Seasonal Capsule Drop Cadence'
                            : 'Single Garment Kit'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        aria-label={`Remove ${item.name}`}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors min-h-[44px]"
                  >
                    Confirm Capsule Selection
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Health4Ever OS Intelligence Tiers */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Telemetry Capabilities</p>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            Health4Ever OS Intelligence Tiers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Essential Tier */}
          <div
            className={`bg-white rounded-2xl border p-6 flex flex-col justify-between space-y-6 ${
              !isPro ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Core Companion Layer</p>
                <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                  Essential Telemetry
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Real-time Tri-Color Hero Status Ring &amp; Emergency Alert Lock</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Live Open-Meteo environmental feed &amp; NASA-STD-3001 thresholds</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Wardrobe wash cycle tracking &amp; circular return label workflow</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onTogglePro(false)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ${
                !isPro
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {!isPro ? 'Current Active Tier' : 'Switch to Essential Tier'}
            </button>
          </div>

          {/* Health4Ever Pro Tier */}
          <div
            className={`bg-white rounded-2xl border p-6 flex flex-col justify-between space-y-6 ${
              isPro ? 'border-emerald-700' : 'border-slate-200'
            }`}
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs text-emerald-700 font-medium">
                  Full NASA OSDR / HRP Modeling &amp; Export
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                  Health4Ever Pro
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>10-Day NASA POWER satellite climatology &amp; longitudinal correlation</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Multi-agency aerospace open-science dataset comparisons</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>One-click Bio-Sync CSV Digital Twin telemetry exports</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onTogglePro(true)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ${
                isPro
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isPro ? 'Health4Ever Pro Active' : 'Enable Health4Ever Pro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
