"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge, StatCard, EmptyState } from "@/components/ui/primitives";
import { formatMoney, formatDateTime } from "@/lib/format";
import { startShift, closeShift, listShifts, getOpenShift, recordShiftActivity, listCashDrawer, cashInOut, getCashDrawerBalance } from "@/services/shift";
import { toast } from "sonner";
import { Play, Square, ArrowDownToLine, ArrowUpFromLine, Wallet, Clock } from "lucide-react";
import type { Shift as ShiftT } from "@/types/pim";

export default function ShiftsPage() {
  const db = useDb();
  const user = useAuthStore((s) => s.user);
  const { currencySymbol } = useUIStore();
  const shifts = useLiveQuery(() => (db ? listShifts(db) : Promise.resolve([])), [db]) ?? [];
  const open = useLiveQuery(() => (db ? getOpenShift(db) : Promise.resolve(null)), [db]);
  const balance = useLiveQuery(() => (db ? getCashDrawerBalance(db) : Promise.resolve(0)), [db]);
  const drawer = useLiveQuery(() => (db ? listCashDrawer(db, open?.id) : Promise.resolve([])), [db, open?.id]) ?? [];

  const [startOpen, setStartOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [cashOpen, setCashOpen] = React.useState(false);

  const userName = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? user?.email ?? "Cashier";

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Shifts & Cash Drawer" subtitle={open ? `Shift open — ${userName}` : "No active shift"} actions={
        open ? <><Button variant="outline" onClick={() => setCashOpen(true)}><ArrowUpFromLine className="h-4 w-4" /> Cash In/Out</Button><Button variant="danger" onClick={() => setCloseOpen(true)}><Square className="h-4 w-4" /> Close Shift</Button></>
              : <Button onClick={() => setStartOpen(true)}><Play className="h-4 w-4" /> Start Shift</Button>
      } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Cash Drawer Balance" value={formatMoney(balance ?? 0, currencySymbol)} icon={Wallet} tone="success" />
        <StatCard label="Open Shift Sales" value={formatMoney(open?.salesTotal ?? 0, currencySymbol)} icon={Clock} tone="info" />
        <StatCard label="Open Shift Invoices" value={String(open?.invoiceCount ?? 0)} icon={Clock} tone="purple" />
        <StatCard label="Total Shifts" value={String(shifts.length)} icon={Clock} tone="neutral" />
      </div>

      {open && (
        <div className="rounded-[20px] bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-700 mb-3">Current Shift Cash Drawer</h3>
          {drawer.length === 0 ? <EmptyState title="No entries yet" /> : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {drawer.map((e) => (
                <div key={e.id} className="flex justify-between py-2 text-sm">
                  <div><span className="font-medium text-slate-700">{e.type.replace(/_/g, " ")}</span><span className="text-xs text-slate-400 ml-2">{formatDateTime(e.createdAt)}</span></div>
                  <span className={e.type === "OPEN" || e.type === "CASH_IN" || e.type === "SALE" ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>{formatMoney(e.amount, currencySymbol)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-[20px] bg-white border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-700">Shift History</h3></div>
        {shifts.length === 0 ? <div className="p-8"><EmptyState title="No shifts recorded" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60"><tr><th className="p-3 text-left text-xs text-slate-500">Cashier</th><th className="p-3 text-left text-xs text-slate-500">Started</th><th className="p-3 text-left text-xs text-slate-500">Closed</th><th className="p-3 text-right text-xs text-slate-500">Opening</th><th className="p-3 text-right text-xs text-slate-500">Sales</th><th className="p-3 text-right text-xs text-slate-500">Closing</th><th className="p-3 text-right text-xs text-slate-500">Diff</th><th className="p-3 text-left text-xs text-slate-500">Status</th></tr></thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-t border-slate-50">
                    <td className="p-3">{s.cashierName ?? "—"}</td>
                    <td className="p-3 text-xs text-slate-500">{formatDateTime(s.startedAt)}</td>
                    <td className="p-3 text-xs text-slate-500">{s.closedAt ? formatDateTime(s.closedAt) : "—"}</td>
                    <td className="p-3 text-right">{formatMoney(s.openingCash, currencySymbol)}</td>
                    <td className="p-3 text-right">{formatMoney(s.salesTotal, currencySymbol)}</td>
                    <td className="p-3 text-right">{s.closingCash !== undefined ? formatMoney(s.closingCash, currencySymbol) : "—"}</td>
                    <td className={`p-3 text-right ${s.difference === undefined ? "" : s.difference >= 0 ? "text-emerald-600" : "text-red-500"}`}>{s.difference !== undefined ? formatMoney(s.difference, currencySymbol) : "—"}</td>
                    <td className="p-3"><Badge tone={s.status === "OPEN" ? "success" : "neutral"}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {startOpen && db && <StartShiftForm userName={userName} cashierId={user?.id} onClose={() => setStartOpen(false)} onStart={async (cash) => { await startShift(db, { cashierId: user?.id ?? null, cashierName: userName, openingCash: cash }); toast.success("Shift started"); setStartOpen(false); }} />}
      {closeOpen && open && db && <CloseShiftForm shift={open} currencySymbol={currencySymbol} onClose={() => setCloseOpen(false)} onCloseShift={async (cash) => { await closeShift(db, open.id, cash); toast.success("Shift closed"); setCloseOpen(false); }} />}
      {cashOpen && db && <CashIOForm onClose={() => setCashOpen(false)} onApply={async (type, amount, note) => { await cashInOut(db, type, amount, note); toast.success(`${type.replace(/_/g, " ")} recorded`); setCashOpen(false); }} />}
    </div>
  );
}

function StartShiftForm({ userName, onClose, onStart }: { userName: string; cashierId?: string | null; onClose: () => void; onStart: (cash: number) => Promise<void> }) {
  const [cash, setCash] = React.useState("0");
  return <Modal open onClose={onClose} title={`Start Shift — ${userName}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onStart(Number(cash) || 0)}>Start</Button></>}><div><Label>Opening Cash</Label><Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} /></div></Modal>;
}

function CloseShiftForm({ shift, currencySymbol, onClose, onCloseShift }: { shift: ShiftT; currencySymbol: string; onClose: () => void; onCloseShift: (cash: number) => Promise<void> }) {
  const [cash, setCash] = React.useState(String(shift.openingCash + shift.salesTotal - shift.refundsTotal - shift.expensesTotal));
  const expected = shift.openingCash + shift.salesTotal - shift.refundsTotal - shift.expensesTotal;
  const diff = (Number(cash) || 0) - expected;
  return <Modal open onClose={onClose} title="Close Shift" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => onCloseShift(Number(cash) || 0)}>Close Shift</Button></>}>
    <div className="space-y-3 text-sm">
      <div className="flex justify-between"><span className="text-slate-500">Expected Cash</span><strong>{formatMoney(expected, currencySymbol)}</strong></div>
      <div><Label>Counted Closing Cash</Label><Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} /></div>
      <div className="flex justify-between"><span className="text-slate-500">Difference</span><strong className={diff >= 0 ? "text-emerald-600" : "text-red-500"}>{formatMoney(diff, currencySymbol)}</strong></div>
    </div>
  </Modal>;
}

function CashIOForm({ onClose, onApply }: { onClose: () => void; onApply: (type: "CASH_IN" | "CASH_OUT", amount: number, note?: string) => Promise<void> }) {
  const [type, setType] = React.useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  return <Modal open onClose={onClose} title="Cash In / Out" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(type, Number(amount) || 0, note || undefined)}>Apply</Button></>}>
    <div className="space-y-3">
      <div className="flex gap-2"><Button size="sm" variant={type === "CASH_IN" ? "primary" : "outline"} onClick={() => setType("CASH_IN")}><ArrowDownToLine className="h-4 w-4" /> Cash In</Button><Button size="sm" variant={type === "CASH_OUT" ? "primary" : "outline"} onClick={() => setType("CASH_OUT")}><ArrowUpFromLine className="h-4 w-4" /> Cash Out</Button></div>
      <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
    </div>
  </Modal>;
}
