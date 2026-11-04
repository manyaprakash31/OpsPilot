import React, { useState, useEffect } from 'react';
import { InventoryItem, Supplier } from '../types';
import { api } from '../api/client';
import { Database, Truck, Package, ShieldCheck, Check } from 'lucide-react';

export const ReferenceView: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invData, supData] = await Promise.all([
          api.getInventory(),
          api.getSuppliers(),
        ]);
        setInventory(invData);
        setSuppliers(supData);
      } catch (err) {
        console.error('Failed to fetch reference data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-paper-border pb-6">
        <div className="font-mono text-xs uppercase tracking-widest text-ink-faint font-semibold flex items-center gap-2">
          <span>OPERATIONAL GROUND TRUTH</span>
          <span>•</span>
          <span className="text-sage font-bold">VERIFIED REPOSITORIES</span>
        </div>
        <h2 className="font-serif text-3xl font-bold text-ink mt-1">
          Master Warehouse & Supplier Reference Data
        </h2>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl font-sans">
          The verified database against which incoming operational claims and inventory quantities are strictly cross-checked.
        </p>
      </div>

      {/* Verified Inventory Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-paper-border pb-2">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-xl font-bold text-ink">
              Verified Warehouse Inventory Ledger
            </h3>
          </div>
          <span className="font-mono text-xs text-opstatus-success font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Ledger Validated
          </span>
        </div>

        <div className="bg-paper-card border border-paper-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-paper-border bg-paper-surface font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="py-2.5 px-4 font-semibold">SKU Code</th>
                <th className="py-2.5 px-4 font-semibold">Item Description</th>
                <th className="py-2.5 px-4 font-semibold">Physical Location</th>
                <th className="py-2.5 px-4 font-semibold text-right">Available Stock</th>
                <th className="py-2.5 px-4 font-semibold text-right">Reserved Stock</th>
                <th className="py-2.5 px-4 font-semibold text-right">Unit Value</th>
                <th className="py-2.5 px-4 font-semibold">Last Audit Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border text-xs font-mono">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-paper-hover transition-colors">
                  <td className="py-3 px-4 font-bold text-ink">{item.sku}</td>
                  <td className="py-3 px-4 font-sans font-medium text-ink">{item.name}</td>
                  <td className="py-3 px-4 text-ink-muted">{item.location}</td>
                  <td className="py-3 px-4 text-right font-bold text-ink text-sm tabular-nums">
                    {item.current_stock} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right text-ink-faint tabular-nums">
                    {item.reserved_stock} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-ink-muted">
                    INR {item.unit_cost.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-ink-faint tabular-nums text-[11px]">
                    {new Date(item.last_verified_at).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified Suppliers Directory */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-paper-border pb-2">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-sage-dark" />
            <h3 className="font-serif text-xl font-bold text-ink">
              Contracted Suppliers & Logistics Carriers
            </h3>
          </div>
          <span className="font-mono text-xs text-ink-faint">Active SLAs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-paper-card border border-paper-border p-4 shadow-subtle space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-ink-faint uppercase font-bold">{sup.code}</span>
                  <h4 className="font-serif font-bold text-ink text-base mt-0.5">{sup.name}</h4>
                </div>
                <span className="px-2 py-0.5 bg-sage-light text-sage-dark font-mono text-[10px] font-bold uppercase rounded border border-sage">
                  {sup.reliability_tier}
                </span>
              </div>

              <div className="pt-2 border-t border-paper-line text-xs font-mono space-y-1">
                <div><span className="text-ink-faint">Dispatch Email:</span> <span className="text-ink font-semibold">{sup.contact_email}</span></div>
                <div><span className="text-ink-faint">Lead Time:</span> <span className="text-ink">{sup.lead_time_days} days</span></div>
                <div><span className="text-ink-faint">Quality Rating:</span> <span className="text-accent font-bold">{sup.rating} / 5.0</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
