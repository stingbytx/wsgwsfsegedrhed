"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, Badge, statusTone, EmptyState, StatCard } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, formatDateTime, formatDate } from "@/lib/format";
import { generateId, nowIso } from "@/lib/utils";
import {
  computeCustomerAnalytics, getCustomerOrders, listCommunicationLogs, addCommunicationLog,
  listCustomerDocuments, addCustomerDocument, deleteCustomerDocument,
} from "@/services/crm";
import { recordCreditPayment, listCreditPayments, creditAlert, availableCredit } from "@/services/credit";
import { getLoyaltyLedger, redeemPoints, TIER_BENEFITS, birthdayDiscountEligible, BIRTHDAY_DISCOUNT_PCT } from "@/services/loyalty";
import { printReceipt } from "@/services/print";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Wallet, Star, ShoppingCart, MessageSquare, FileText, BarChart3,
  Plus, Trash2, Printer, Gift,
} from "lucide-react";
import type { Customer, Order } from "@/types";
import type { CustomerCrmExtension, CommunicationType, CustomerDocumentType, CommunicationLog, CustomerDocument } from "@/types/crm";

type CrmCustomer = Customer & Partial<CustomerCrmExtension>;

const TABS = ["Overview", "Credit", "Loyalty", "Purchase History", "Communication", "Documents", "Analytics"] as const;
type Tab = (typeof TABS)[number];

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const id = params.id as string;

  const customer = useLiveQuery(() => db?.customers.get(id), [db, id]);
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [analytics, setAnalytics] = React.useState<Awaited<ReturnType<typeof computeCustomerAnalytics>> | null>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    if (!db || !customer) return;
    computeCustomerAnalytics(db, id).then(setAnalytics);
    getCustomerOrders(db, id).then(setOrders);
  }, [db, id, customer]);

  if (!db) return <div className="p-6 text-slate-400">Loading…</div>;
  if (!customer) return <div className="p-6"><EmptyState icon={Users} title="Customer not found" /></div>;

  const c = customer as CrmCustomer;
  const alert = creditAlert(c);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/crm")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            {c.name}
            {c.isVip && <Badge tone="purple">VIP</Badge>}
          </h1>
          <p className="text-sm text-slate-500">{c.code ?? "—"} • {c.type ?? "RETAIL"} • {c.city ?? "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-100">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-[#0070E0] text-[#0070E0]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t}</button>)}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-[20px] bg-white border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Basic Information</h3>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <Info label="Code" value={c.code ?? "—"} />
              <Info label="Type" value={c.type ?? "RETAIL"} />
              <Info label="Phone" value={c.phone ?? "—"} />
              <Info label="Email" value={c.email ?? "—"} />
              <Info label="City" value={c.city ?? "—"} />
              <Info label="Country" value={c.country ?? "—"} />
              <Info label="Company" value={c.companyName ?? "—"} />
              <Info label="Birthday" value={c.birthday ? formatDate(c.birthday) : "—"} />
              <Info label="Tax ID" value={c.taxId ?? "—"} />
              <Info label="VAT Number" value={c.vatNumber ?? "—"} />
              <Info label="Website" value={c.website ?? "—"} />
              <Info label="Member Since" value={c.memberSince ? formatDate(c.memberSince) : "—"} />
            </dl>
            {c.notes && <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">{c.notes}</p>}
            {(c.tags ?? []).length > 0 && <div className="mt-3 flex gap-1 flex-wrap">{(c.tags ?? []).map((t) => <Badge key={t} tone="info">{t.replace(/_/g, " ")}</Badge>)}</div>}
          </div>
          <div className="space-y-3">
            <StatCard label="Total Purchases" value={formatMoney(analytics?.totalPurchases ?? 0, currencySymbol)} icon={ShoppingCart} tone="info" />
            <StatCard label="Outstanding Balance" value={formatMoney(c.creditBalance ?? 0, currencySymbol)} icon={Wallet} tone={alert.level === "OK" ? "success" : "warning"} />
            <StatCard label="Loyalty Points" value={String(c.loyaltyPoints ?? 0)} icon={Star} tone="purple" />
            <StatCard label="Lifetime Value" value={formatMoney(analytics?.lifetimeValue ?? 0, currencySymbol)} icon={BarChart3} tone="success" />
          </div>
        </div>
      )}

      {tab === "Credit" && <CreditTab customer={c} currencySymbol={currencySymbol} />}
      {tab === "Loyalty" && <LoyaltyTab customer={c} currencySymbol={currencySymbol} />}
      {tab === "Purchase History" && <PurchaseHistoryTab orders={orders} currencySymbol={currencySymbol} />}
      {tab === "Communication" && <CommunicationTab customerId={id} />}
      {tab === "Documents" && <DocumentsTab customerId={id} />}
      {tab === "Analytics" && analytics && <AnalyticsTab analytics={analytics} currencySymbol={currencySymbol} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <><dt className="text-slate-400">{label}</dt><dd className="text-slate-700 font-medium">{value}</dd></>;
}

function CreditTab({ customer, currencySymbol }: { customer: CrmCustomer; currencySymbol: string }) {
  const db = useDb();
  const payments = useLiveQuery(() => (db ? listCreditPayments(db, customer.id) : Promise.resolve([])), [db, customer.id]) ?? [];
  const [open, setOpen] = React.useState(false);
  const alert = creditAlert(customer);
  const avail = availableCredit(customer);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Credit Status" value={(customer.creditStatus ?? "NO_CREDIT").replace(/_/g, " ")} icon={Wallet} tone={customer.creditStatus === "CREDIT" ? "success" : customer.creditStatus === "BLACKLISTED" ? "danger" : "neutral"} />
        <StatCard label="Credit Limit" value={formatMoney(customer.creditLimit ?? 0, currencySymbol)} icon={Wallet} tone="info" />
        <StatCard label="Outstanding" value={formatMoney(customer.creditBalance ?? 0, currencySymbol)} icon={Wallet} tone="warning" />
        <StatCard label="Available Credit" value={formatMoney(avail, currencySymbol)} icon={Wallet} tone="success" />
      </div>
      {alert.level !== "OK" && (
        <div className={`rounded-xl p-3 text-sm ${alert.level === "BLACKLISTED" || alert.level === "OVER_LIMIT" || alert.level === "REACHED" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
          {alert.level === "BLACKLISTED" && "This customer is blacklisted."}
          {alert.level === "APPROACHING" && `Approaching credit limit (${alert.pct.toFixed(0)}%).`}
          {alert.level === "REACHED" && "Credit limit reached."}
          {alert.level === "OVER_LIMIT" && `Over credit limit by ${formatMoney((customer.creditBalance ?? 0) - (customer.creditLimit ?? 0), currencySymbol)}.`}
        </div>
      )}
      <div className="rounded-[20px] bg-white border border-slate-100 p-5">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Credit Payment History</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Record Payment</Button></div>
        {payments.length === 0 ? <EmptyState title="No payments recorded" /> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Date</th><th className="p-2">Method</th><th className="p-2">Note</th><th className="p-2 text-right">Amount</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id} className="border-t border-slate-50"><td className="p-2">{formatDate(p.date)}</td><td className="p-2">{p.method}</td><td className="p-2 text-slate-500">{p.note ?? "—"}</td><td className="p-2 text-right font-medium text-emerald-600">{formatMoney(p.amount, currencySymbol)}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      {open && db && <PaymentForm customerId={customer.id} onClose={() => setOpen(false)} onPay={async (amount, method, note) => { await recordCreditPayment(db, { customerId: customer.id, amount, method, note }); toast.success("Payment recorded"); setOpen(false); }} />}
    </div>
  );
}

function PaymentForm({ customerId, onClose, onPay }: { customerId: string; onClose: () => void; onPay: (amount: number, method: string, note?: string) => Promise<void> }) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [note, setNote] = React.useState("");
  return <Modal open onClose={onClose} title="Record Credit Payment" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onPay(Number(amount) || 0, method, note || undefined)}>Record</Button></>}>
    <div className="space-y-3">
      <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div><Label>Method</Label><Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK">Bank Transfer</option><option value="CHEQUE">Cheque</option></Select></div>
      <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
    </div>
  </Modal>;
}

function LoyaltyTab({ customer, currencySymbol }: { customer: CrmCustomer; currencySymbol: string }) {
  const db = useDb();
  const ledger = useLiveQuery(() => (db ? getLoyaltyLedger(db, customer.id) : Promise.resolve([])), [db, customer.id]) ?? [];
  const [redeemOpen, setRedeemOpen] = React.useState(false);
  const tier = customer.loyaltyTier ?? "BRONZE";
  const benefits = TIER_BENEFITS[tier];
  const birthdayEligible = birthdayDiscountEligible(customer.birthday);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tier" value={benefits.label} icon={Star} tone="purple" />
        <StatCard label="Points" value={String(customer.loyaltyPoints ?? 0)} icon={Star} tone="info" />
        <StatCard label="Tier Discount" value={`${benefits.discountPct}%`} icon={Gift} tone="success" />
        <StatCard label="Rewards Redeemed" value={String(customer.rewardsRedeemed ?? 0)} icon={Gift} tone="neutral" />
      </div>
      <div className="rounded-[20px] bg-white border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-700 mb-2">Tier Benefits</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• POS discount: <strong>{benefits.discountPct}%</strong></li>
          <li>• Free shipping: <strong>{benefits.freeShipping ? "Yes" : "No"}</strong></li>
          <li>• Priority support: <strong>{benefits.prioritySupport ? "Yes" : "No"}</strong></li>
          {birthdayEligible && <li className="text-emerald-600">• Birthday discount this month: <strong>{BIRTHDAY_DISCOUNT_PCT}%</strong></li>}
        </ul>
      </div>
      <div className="rounded-[20px] bg-white border border-slate-100 p-5">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Loyalty Ledger</h3><Button size="sm" onClick={() => setRedeemOpen(true)}>Redeem Points</Button></div>
        {ledger.length === 0 ? <EmptyState title="No loyalty activity yet" /> : (
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {ledger.map((e) => <div key={e.id} className="flex justify-between py-2 text-sm"><div><span className="font-medium text-slate-700">{e.type.replace(/_/g, " ")}</span><span className="text-xs text-slate-400 ml-2">{formatDateTime(e.createdAt)}</span></div><span className={e.points >= 0 ? "text-emerald-600" : "text-red-500"}>{e.points > 0 ? "+" : ""}{e.points} (bal {e.balanceAfter})</span></div>)}
          </div>
        )}
      </div>
      {redeemOpen && db && <RedeemForm customer={customer} onClose={() => setRedeemOpen(false)} onRedeem={async (pts) => { const r = await redeemPoints(db, customer.id, pts); toast.success(`Redeemed ${r.pointsRedeemed} pts → ${formatMoney(r.discount, currencySymbol)} off`); setRedeemOpen(false); }} />}
    </div>
  );
}

function RedeemForm({ customer, onClose, onRedeem }: { customer: CrmCustomer; onClose: () => void; onRedeem: (pts: number) => Promise<void> }) {
  const [pts, setPts] = React.useState("");
  return <Modal open onClose={onClose} title="Redeem Points" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onRedeem(Number(pts) || 0)}>Redeem</Button></>}>
    <div className="space-y-2"><p className="text-sm text-slate-500">Available: <strong>{customer.loyaltyPoints ?? 0}</strong> pts (1 pt = 0.50 {""} discount)</p><div><Label>Points to Redeem</Label><Input type="number" value={pts} onChange={(e) => setPts(e.target.value)} max={customer.loyaltyPoints ?? 0} /></div></div>
  </Modal>;
}

function PurchaseHistoryTab({ orders, currencySymbol }: { orders: Order[]; currencySymbol: string }) {
  if (orders.length === 0) return <div className="rounded-[20px] bg-white border border-slate-100 p-8"><EmptyState icon={ShoppingCart} title="No purchases yet" /></div>;
  return <div className="rounded-[20px] bg-white border border-slate-100 overflow-hidden">
    <table className="w-full text-sm"><thead className="bg-slate-50/60"><tr><th className="p-3 text-left text-xs text-slate-500">Invoice #</th><th className="p-3 text-left text-xs text-slate-500">Date</th><th className="p-3 text-center text-xs text-slate-500">Items</th><th className="p-3 text-right text-xs text-slate-500">Total</th><th className="p-3 text-left text-xs text-slate-500">Status</th><th className="p-3"></th></tr></thead>
      <tbody>{orders.map((o) => <tr key={o.id} className="border-t border-slate-50"><td className="p-3 font-mono text-xs">{o.orderNumber}</td><td className="p-3 text-xs text-slate-500">{formatDateTime(o.createdAt)}</td><td className="p-3 text-center">{o.items.length}</td><td className="p-3 text-right font-medium">{formatMoney(o.total, currencySymbol)}</td><td className="p-3"><Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge></td><td className="p-3 text-right"><button onClick={() => printReceipt(o, { currencySymbol })} className="text-slate-500 hover:text-[#0070E0]"><Printer className="h-3.5 w-3.5" /></button></td></tr>)}</tbody>
    </table>
  </div>;
}

function CommunicationTab({ customerId }: { customerId: string }) {
  const db = useDb();
  const logs = useLiveQuery(() => (db ? listCommunicationLogs(db, customerId) : Promise.resolve([])), [db, customerId]) ?? [];
  const [open, setOpen] = React.useState(false);
  return <div className="rounded-[20px] bg-white border border-slate-100 p-5">
    <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Communication Log</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Entry</Button></div>
    {logs.length === 0 ? <EmptyState icon={MessageSquare} title="No communication logged" /> : (
      <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
        {logs.map((l) => <div key={l.id} className="py-3 text-sm"><div className="flex justify-between"><span className="font-medium text-slate-700">{l.type} {l.subject ? `— ${l.subject}` : ""}</span><span className="text-xs text-slate-400">{formatDateTime(l.createdAt)}</span></div>{l.notes && <p className="text-slate-600 mt-1">{l.notes}</p>}{l.outcome && <p className="text-xs text-slate-400 mt-1">Outcome: {l.outcome}</p>}{l.nextFollowUp && <p className="text-xs text-[#0070E0] mt-1">Follow-up: {formatDate(l.nextFollowUp)}</p>}</div>)}
      </div>
    )}
    {open && db && <CommForm onClose={() => setOpen(false)} onSave={async (log) => { await addCommunicationLog(db, { ...log, customerId }); toast.success("Logged"); setOpen(false); }} />}
  </div>;
}

function CommForm({ onClose, onSave }: { onClose: () => void; onSave: (log: { type: CommunicationType; subject?: string; notes?: string; outcome?: string; nextFollowUp?: string | null }) => Promise<void> }) {
  const [type, setType] = React.useState<CommunicationType>("CALL");
  const [subject, setSubject] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [nextFollowUp, setNextFollowUp] = React.useState("");
  return <Modal open onClose={onClose} title="Log Communication" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ type, subject: subject || undefined, notes: notes || undefined, outcome: outcome || undefined, nextFollowUp: nextFollowUp || null })}>Save</Button></>}>
    <div className="space-y-3">
      <div><Label>Type</Label><Select value={type} onChange={(e) => setType(e.target.value as CommunicationType)}><option value="CALL">Call</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option><option value="MEETING">Meeting</option><option value="NOTE">Note</option></Select></div>
      <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Outcome</Label><Input value={outcome} onChange={(e) => setOutcome(e.target.value)} /></div><div><Label>Next Follow-up</Label><Input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} /></div></div>
    </div>
  </Modal>;
}

function DocumentsTab({ customerId }: { customerId: string }) {
  const db = useDb();
  const docs = useLiveQuery(() => (db ? listCustomerDocuments(db, customerId) : Promise.resolve([])), [db, customerId]) ?? [];
  const [open, setOpen] = React.useState(false);
  return <div className="rounded-[20px] bg-white border border-slate-100 p-5">
    <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Document Vault</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Document</Button></div>
    {docs.length === 0 ? <EmptyState icon={FileText} title="No documents stored" /> : (
      <div className="divide-y divide-slate-50">
        {docs.map((d) => <div key={d.id} className="flex justify-between items-center py-3 text-sm"><div><span className="font-medium text-slate-700">{d.name}</span><span className="text-xs text-slate-400 ml-2">{d.type.replace(/_/g, " ")} • {formatDate(d.date)}</span>{d.notes && <p className="text-xs text-slate-500 mt-0.5">{d.notes}</p>}</div><div className="flex gap-2">{d.file && <a href={d.file} download={d.name} className="text-[#0070E0] text-xs">Download</a>}<button onClick={() => db && deleteCustomerDocument(db, d.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}
      </div>
    )}
    {open && db && <DocForm onClose={() => setOpen(false)} onSave={async (doc) => { await addCustomerDocument(db, { ...doc, customerId }); toast.success("Document added"); setOpen(false); }} />}
  </div>;
}

function DocForm({ onClose, onSave }: { onClose: () => void; onSave: (doc: { name: string; type: CustomerDocumentType; date: string; file?: string | null; notes?: string }) => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CustomerDocumentType>("QUOTATION");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const handleFile = (f: File) => { const r = new FileReader(); r.onload = () => setFile(r.result as string); r.readAsDataURL(f); };
  return <Modal open onClose={onClose} title="Add Document" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ name, type, date, file, notes: notes || undefined })}>Save</Button></>}>
    <div className="space-y-3">
      <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={type} onChange={(e) => setType(e.target.value as CustomerDocumentType)}><option value="QUOTATION">Quotation</option><option value="INVOICE">Invoice</option><option value="CONTRACT">Contract</option><option value="AGREEMENT">Agreement</option><option value="ID_PROOF">ID Proof</option><option value="OTHER">Other</option></Select></div><div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div></div>
      <div><Label>File</Label><label className="cursor-pointer text-sm text-[#0070E0]">Upload<input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} /></label>{file && <span className="text-xs text-slate-400 ml-2">attached</span>}</div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
    </div>
  </Modal>;
}

function AnalyticsTab({ analytics, currencySymbol }: { analytics: NonNullable<Awaited<ReturnType<typeof computeCustomerAnalytics>>>; currencySymbol: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Purchases" value={formatMoney(analytics.totalPurchases, currencySymbol)} icon={ShoppingCart} tone="info" />
        <StatCard label="Avg Order Value" value={formatMoney(analytics.averageOrderValue, currencySymbol)} icon={BarChart3} tone="success" />
        <StatCard label="Total Visits" value={String(analytics.totalVisits)} icon={Users} tone="purple" />
        <StatCard label="Lifetime Value" value={formatMoney(analytics.lifetimeValue, currencySymbol)} icon={BarChart3} tone="info" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-700 mb-3">RFM Score</h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Info label="Recency (days)" value={String(analytics.rfm.recency)} />
            <Info label="Frequency" value={String(analytics.rfm.frequency)} />
            <Info label="Monetary" value={formatMoney(analytics.rfm.monetary, currencySymbol)} />
            <Info label="RFM Score" value={analytics.rfm.rfmScore} />
          </dl>
          <div className="mt-3"><Badge tone="info">{analytics.rfm.segment}</Badge></div>
        </div>
        <div className="rounded-[20px] bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-700 mb-3">Insights</h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Info label="Products Bought" value={String(analytics.productsBought)} />
            <Info label="Categories Bought" value={String(analytics.categoriesBought)} />
            <Info label="Return Rate" value={`${(analytics.returnRate * 100).toFixed(1)}%`} />
            <Info label="Favorite Category" value={analytics.favoriteCategory ?? "—"} />
          </dl>
        </div>
      </div>
      {analytics.favoriteProducts.length > 0 && (
        <div className="rounded-[20px] bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-700 mb-3">Favorite Products</h3>
          <div className="divide-y divide-slate-50">{analytics.favoriteProducts.map((p, i) => <div key={i} className="flex justify-between py-2 text-sm"><span className="text-slate-700">{p.name}</span><span className="text-slate-500">{p.qty} bought</span></div>)}</div>
        </div>
      )}
    </div>
  );
}
