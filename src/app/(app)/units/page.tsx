"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal, PageHeader, EmptyState } from "@/components/ui/primitives";
import { generateId, nowIso } from "@/lib/utils";
import { listUnits, saveUnit, convertUnits } from "@/services/pim";
import { toast } from "sonner";
import { Plus, Trash2, Ruler } from "lucide-react";
import type { Unit } from "@/types/pim";

const PRESET_UNITS: Omit<Unit, "id" | "createdAt">[] = [
  { name: "Piece", symbol: "pc", baseUnitId: null, factor: 1 },
  { name: "Box", symbol: "box", baseUnitId: null, factor: 24 },
  { name: "Carton", symbol: "ctn", baseUnitId: null, factor: 288 },
  { name: "Pack", symbol: "pk", baseUnitId: null, factor: 6 },
  { name: "Bottle", symbol: "btl", baseUnitId: null, factor: 1 },
  { name: "Kg", symbol: "kg", baseUnitId: null, factor: 1 },
  { name: "Gram", symbol: "g", baseUnitId: null, factor: 0.001 },
  { name: "Liter", symbol: "L", baseUnitId: null, factor: 1 },
  { name: "Meter", symbol: "m", baseUnitId: null, factor: 1 },
  { name: "Roll", symbol: "roll", baseUnitId: null, factor: 1 },
  { name: "Bundle", symbol: "bdl", baseUnitId: null, factor: 1 },
  { name: "Dozen", symbol: "dz", baseUnitId: null, factor: 12 },
];

export default function UnitsPage() {
  const db = useDb();
  const units = useLiveQuery(() => (db ? listUnits(db) : Promise.resolve([])), [db]) ?? [];
  const [open, setOpen] = React.useState(false);

  const seedPresets = async () => {
    if (!db) return;
    for (const u of PRESET_UNITS) await saveUnit(db, { ...u, id: generateId(), createdAt: nowIso() });
    toast.success("Preset units added");
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Units & Conversions" subtitle={`${units.length} units`} actions={<>
        {units.length === 0 && <Button variant="outline" onClick={seedPresets}>Add Preset Units</Button>}
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Unit</Button>
      </>} />

      {units.length === 0 ? (
        <div className="rounded-[20px] bg-white border border-slate-100 p-8"><EmptyState icon={Ruler} title="No units yet" description="Add preset units or create a custom one." /></div>
      ) : (
        <div className="rounded-[20px] bg-white border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60"><tr><th className="p-3 text-left text-xs text-slate-500">Name</th><th className="p-3 text-left text-xs text-slate-500">Symbol</th><th className="p-3 text-right text-xs text-slate-500">Factor (→ base)</th><th className="p-3 text-left text-xs text-slate-500">Base Unit</th><th className="p-3"></th></tr></thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-t border-slate-50">
                  <td className="p-3 font-medium text-slate-800">{u.name}</td>
                  <td className="p-3 text-slate-500">{u.symbol}</td>
                  <td className="p-3 text-right">{u.factor}</td>
                  <td className="p-3 text-slate-500">{units.find((x) => x.id === u.baseUnitId)?.name ?? (u.factor === 1 ? "Base" : "—")}</td>
                  <td className="p-3 text-right"><button onClick={() => db && db.units.delete(u.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && db && <UnitForm units={units} onClose={() => setOpen(false)} onSave={async (u) => { await saveUnit(db, u); toast.success("Unit saved"); setOpen(false); }} />}
    </div>
  );
}

function UnitForm({ units, onClose, onSave }: { units: Unit[]; onClose: () => void; onSave: (u: Unit) => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [symbol, setSymbol] = React.useState("");
  const [factor, setFactor] = React.useState("1");
  const [baseUnitId, setBaseUnitId] = React.useState("");
  return (
    <Modal open onClose={onClose} title="Add Unit" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ id: generateId(), name, symbol, factor: Number(factor) || 1, baseUnitId: baseUnitId || null, isCustom: true, createdAt: nowIso() })}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Box" /></div><div><Label>Symbol</Label><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="box" /></div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Factor (1 unit = ? base)</Label><Input type="number" step="0.001" value={factor} onChange={(e) => setFactor(e.target.value)} /></div>
          <div><Label>Base Unit</Label><select value={baseUnitId} onChange={(e) => setBaseUnitId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">— None —</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        </div>
        <p className="text-xs text-slate-400">Example: 1 Box = 24 Pieces. Set base = Piece, factor = 24.</p>
      </div>
    </Modal>
  );
}
