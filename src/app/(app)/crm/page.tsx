"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useDb } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, formatDate } from "@/lib/format";
import { generateId, nowIso } from "@/lib/utils";
import {
  searchCustomers, validateCustomer, createCustomer, updateCustomer, deleteCustomer,
  bulkTag, nextCustomerCode, type CustomerFilter, type CustomerSortKey,
} from "@/services/crm";
import { tierForPoints, TIER_BENEFITS } from "@/services/loyalty";
import { creditAlert, availableCredit } from "@/services/credit";
import { exportCSV, exportExcel } from "@/services/export";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Users, Search, ChevronUp, ChevronDown, Tag as TagIcon, Download,
} from "lucide-react";
import type { Customer } from "@/types";
import type {
  CustomerCrmExtension, CustomerType, LoyaltyTier, CreditStatus, CreditDays, CustomerTag,
} from "@/types/crm";

type CrmCustomer = Customer & Partial<CustomerCrmExtension>;

const TAGS: CustomerTag[] = ["NEW", "VIP", "WHOLESALE", "LOYAL", "AT_RISK", "CHURNED", "FREQUENT_BUYER", "SEASONAL", "BIRTHDAY_MONTH"];
const TONES: Record<string, "neutral" | "success" | "warning" | "danger" | "info" | "purple"> = {
  BRONZE: "neutral", SILVER: "info", GOLD: "warning", PLATINUM: "purple", DIAMOND: "success",
};
const CREDIT_TONES: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  CREDIT: "success", NO_CREDIT: "neutral", BLACKLISTED: "danger",
};

export default function CrmPage() {
  const db = useDb();
  const router = useRouter();
  const { currencySymbol } = useUIStore();
  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];

  const [filter, setFilter] = React.useState<CustomerFilter>({});
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<CustomerSortKey>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<CrmCustomer | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false);

  const effectiveFilter = { ...filter, query };

  const ranked = useLiveQuery(
    () => (db ? searchCustomers(db, effectiveFilter, sort, sortDir) : Promise.resolve([])),
    [db, JSON.stringify(effectiveFilter), sort, sortDir]
  ) ?? [];

  const toggleSort = (k: CustomerSortKey) => {
    if (sort === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doExport = (fmt: "csv" | "excel") => {
    const rows = ranked.map(({ customer: c, totalPurchases, orderCount, lastVisit }) => ({
      Code: c.code ?? "", Name: c.name, Type: c.type ?? "RETAIL", Phone: c.phone ?? "", Email: c.email ?? "",
      City: c.city ?? "", Company: c.companyName ?? "", Tier: c.loyaltyTier ?? "BRONZE", Points: c.loyaltyPoints ?? 0,
      "Credit Status": c.creditStatus ?? "NO_CREDIT", "Credit Limit": c.creditLimit ?? 0, Outstanding: c.creditBalance ?? 0,
      VIP: c.isVip ? "Yes" : "No", "Total Purchases": totalPurchases, Orders: orderCount, "Last Visit": lastVisit ?? "",
    }));
    const headers = Object.keys(rows[0] ?? { Code: "" });
    const base = `unipos-customers-${new Date().toISOString().split("T")[0]}`;
    if (fmt === "csv") exportCSV(rows, headers, `${base}.csv`); else exportExcel(rows, headers, `${base}.xls`, "Customers");
    toast.success(`${fmt.toUpperCase()} exported`);
  };

  const sortIcon = (k: CustomerSortKey) => sort === k ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Customers (CRM)"
        subtitle={`${customers.length} customers • ${ranked.length} shown`}
        actions={<>
          <Button variant="outline" onClick={() => doExport("csv")}><Download className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" onClick={() => doExport("excel")}><Download className="h-4 w-4" /> Excel</Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Customer</Button>
        </>}
      />

      {/* Search + filters */}
      <div className="rounded-[20px] bg-white border border-slate-100 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone, email, code, loyalty card, tax ID, city, company, tags…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <FilterSelect label="Credit Status" value={filter.creditStatus ?? ""} onChange={(v) => setFilter({ ...filter, creditStatus: v || undefined })} options={[["CREDIT", "Credit"], ["NO_CREDIT", "No Credit"], ["BLACKLISTED", "Blacklisted"]]} />
          <FilterSelect label="Type" value={filter.type ?? ""} onChange={(v) => setFilter({ ...filter, type: v || undefined })} options={[["RETAIL", "Retail"], ["WHOLESALE", "Wholesale"], ["B2B", "B2B"], ["B2C", "B2C"]]} />
          <FilterSelect label="Loyalty Tier" value={filter.loyaltyTier ?? ""} onChange={(v) => setFilter({ ...filter, loyaltyTier: v || undefined })} options={[["BRONZE", "Bronze"], ["SILVER", "Silver"], ["GOLD", "Gold"], ["PLATINUM", "Platinum"], ["DIAMOND", "Diamond"]]} />
          <FilterSelect label="Tag" value={filter.tag ?? ""} onChange={(v) => setFilter({ ...filter, tag: v || undefined })} options={TAGS.map((t) => [t, t.replace(/_/g, " ")])} />
          <FilterSelect label="Birthday Month" value={filter.birthdayMonth ? String(filter.birthdayMonth) : ""} onChange={(v) => setFilter({ ...filter, birthdayMonth: v ? Number(v) : undefined })} options={Array.from({ length: 12 }, (_, i) => [String(i + 1), new Date(2000, i, 1).toLocaleString("default", { month: "long" })])} />
          <div className="flex flex-wrap gap-3 text-xs">
            <Check label="VIP" checked={filter.isVip ?? false} onChange={(v) => setFilter({ ...filter, isVip: v || undefined })} />
            <Check label="Has Outstanding" checked={filter.hasOutstanding ?? false} onChange={(v) => setFilter({ ...filter, hasOutstanding: v || undefined })} />
            <Check label="Blacklisted" checked={filter.blacklisted ?? false} onChange={(v) => setFilter({ ...filter, blacklisted: v || undefined })} />
            <Check label="New This Month" checked={filter.newThisMonth ?? false} onChange={(v) => setFilter({ ...filter, newThisMonth: v || undefined })} />
            <Check label="Top Customers" checked={filter.topCustomers ?? false} onChange={(v) => setFilter({ ...filter, topCustomers: v || undefined })} />
          </div>
          {(Object.values(filter).some(Boolean) || query) && <Button size="sm" variant="ghost" onClick={() => { setFilter({}); setQuery(""); }}>Clear</Button>}
          {selected.size > 0 && <Button size="sm" variant="outline" onClick={() => setBulkTagOpen(true)}><TagIcon className="h-3.5 w-3.5" /> Tag {selected.size}</Button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[20px] bg-white border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr className="text-left text-xs text-slate-500">
                <th className="p-3 w-8"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(ranked.map((r) => r.customer.id)) : new Set())} /></th>
                <SortableTh label="Name" onClick={() => toggleSort("name")}>{sortIcon("name")}</SortableTh>
                <th className="p-3 font-medium">Code</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">City</th>
                <th className="p-3 font-medium">Tier</th>
                <SortableTh label="Points" align="right" onClick={() => toggleSort("loyaltyPoints")}>{sortIcon("loyaltyPoints")}</SortableTh>
                <th className="p-3 font-medium">Credit</th>
                <SortableTh label="Outstanding" align="right" onClick={() => toggleSort("creditBalance")}>{sortIcon("creditBalance")}</SortableTh>
                <SortableTh label="Purchases" align="right" onClick={() => toggleSort("totalPurchases")}>{sortIcon("totalPurchases")}</SortableTh>
                <SortableTh label="Last Visit" onClick={() => toggleSort("lastVisit")}>{sortIcon("lastVisit")}</SortableTh>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 && <tr><td colSpan={12} className="p-8"><EmptyState icon={Users} title="No customers match" description="Adjust filters or add a customer." /></td></tr>}
              {ranked.map(({ customer: c, totalPurchases, lastVisit }) => {
                const cc = c as CrmCustomer;
                const alert = creditAlert(cc);
                return (
                  <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={() => router.push(`/crm/${c.id}`)}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                    <td className="p-3 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {cc.isVip && <Badge tone="purple">VIP</Badge>}
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{(cc.tags ?? []).slice(0, 3).map((t) => t.replace(/_/g, " ")).join(" • ")}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-500">{cc.code ?? "—"}</td>
                    <td className="p-3 text-slate-600">{c.phone ?? "—"}</td>
                    <td className="p-3 text-slate-600">{cc.city ?? "—"}</td>
                    <td className="p-3"><Badge tone={TONES[cc.loyaltyTier ?? "BRONZE"]}>{TIER_BENEFITS[cc.loyaltyTier ?? "BRONZE"].label}</Badge></td>
                    <td className="p-3 text-right">{cc.loyaltyPoints ?? 0}</td>
                    <td className="p-3"><Badge tone={CREDIT_TONES[cc.creditStatus ?? "NO_CREDIT"]}>{(cc.creditStatus ?? "NO_CREDIT").replace(/_/g, " ")}</Badge>{alert.level !== "OK" && alert.level !== "BLACKLISTED" && <span className={`ml-1 text-[10px] ${alert.level === "OVER_LIMIT" || alert.level === "REACHED" ? "text-red-500" : "text-amber-500"}`}>●</span>}</td>
                    <td className={`p-3 text-right font-medium ${(c.creditBalance ?? 0) > 0 ? "text-amber-600" : "text-slate-400"}`}>{formatMoney(c.creditBalance ?? 0, currencySymbol)}</td>
                    <td className="p-3 text-right">{formatMoney(totalPurchases, currencySymbol)}</td>
                    <td className="p-3 text-xs text-slate-400">{lastVisit ? formatDate(lastVisit) : "—"}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { setEditing(cc); setShowForm(true); }} className="text-[#0070E0]"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={async () => { if (db && confirm("Delete customer?")) { await deleteCustomer(db, c.id); toast.success("Deleted"); } }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 text-xs text-slate-500">{ranked.length} of {customers.length} customers</div>
      </div>

      {(showForm || editing) && db && (
        <CustomerForm
          customer={editing}
          nextCode={nextCustomerCode(customers.length)}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={async (c) => {
            const errs = await validateCustomer(db, c, editing?.id);
            if (errs.length) { toast.error(errs.join(" • ")); throw new Error(errs.join(" • ")); }
            if (editing) { await updateCustomer(db, editing.id, c); toast.success("Customer updated"); }
            else { await createCustomer(db, c as CrmCustomer); toast.success("Customer added"); }
            setShowForm(false); setEditing(null);
          }}
        />
      )}

      {bulkTagOpen && db && (
        <BulkTagDialog count={selected.size} onClose={() => setBulkTagOpen(false)} onApply={async (tag) => { await bulkTag(db, Array.from(selected), tag); toast.success("Tag applied"); setSelected(new Set()); setBulkTagOpen(false); }} />
      )}
    </div>
  );
}

function SortableTh({ label, children, align, onClick }: { label: string; children: React.ReactNode; align?: "right"; onClick: () => void }) {
  return <th className={`p-3 font-medium ${align === "right" ? "text-right" : ""}`}><button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-700">{label}{children}</button></th>;
}
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <div><label className="block text-[10px] text-slate-400 mb-0.5">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs"><option value="">All</option>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}

function BulkTagDialog({ count, onClose, onApply }: { count: number; onClose: () => void; onApply: (tag: CustomerTag) => Promise<void> }) {
  const [tag, setTag] = React.useState<CustomerTag>("VIP");
  return <Modal open onClose={onClose} title={`Tag ${count} customers`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(tag)}>Apply</Button></>}><div><Label>Tag</Label><Select value={tag} onChange={(e) => setTag(e.target.value as CustomerTag)}>{TAGS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Select></div></Modal>;
}

function CustomerForm({ customer, nextCode, onClose, onSave }: { customer: CrmCustomer | null; nextCode: string; onClose: () => void; onSave: (c: Partial<CrmCustomer>) => Promise<void> }) {
  const [name, setName] = React.useState(customer?.name ?? "");
  const [code, setCode] = React.useState(customer?.code ?? nextCode);
  const [type, setType] = React.useState<CustomerType>(customer?.type ?? "RETAIL");
  const [phone, setPhone] = React.useState(customer?.phone ?? "");
  const [email, setEmail] = React.useState(customer?.email ?? "");
  const [address, setAddress] = React.useState(customer?.address ?? "");
  const [city, setCity] = React.useState(customer?.city ?? "");
  const [country, setCountry] = React.useState(customer?.country ?? "");
  const [website, setWebsite] = React.useState(customer?.website ?? "");
  const [taxId, setTaxId] = React.useState(customer?.taxId ?? "");
  const [vatNumber, setVatNumber] = React.useState(customer?.vatNumber ?? "");
  const [birthday, setBirthday] = React.useState(customer?.birthday ?? "");
  const [companyName, setCompanyName] = React.useState(customer?.companyName ?? "");
  const [notes, setNotes] = React.useState(customer?.notes ?? "");
  const [isVip, setIsVip] = React.useState(customer?.isVip ?? false);
  const [loyaltyCardNumber, setLoyaltyCardNumber] = React.useState(customer?.loyaltyCardNumber ?? "");
  const [loyaltyTier, setLoyaltyTier] = React.useState<LoyaltyTier>(customer?.loyaltyTier ?? "BRONZE");
  const [loyaltyPoints, setLoyaltyPoints] = React.useState(String(customer?.loyaltyPoints ?? 0));
  const [creditStatus, setCreditStatus] = React.useState<CreditStatus>(customer?.creditStatus ?? "NO_CREDIT");
  const [creditLimit, setCreditLimit] = React.useState(String(customer?.creditLimit ?? 0));
  const [creditDays, setCreditDays] = React.useState<CreditDays>(customer?.creditDays ?? 30);
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        id: customer?.id ?? generateId(),
        name, code, type, phone: phone || undefined, email: email || undefined,
        address: address || undefined, city: city || undefined, country: country || undefined,
        website: website || undefined, taxId: taxId || undefined, vatNumber: vatNumber || undefined,
        birthday: birthday || null, companyName: companyName || undefined, notes: notes || undefined,
        isVip, loyaltyCardNumber: loyaltyCardNumber || undefined, loyaltyTier, loyaltyPoints: Number(loyaltyPoints) || 0,
        creditStatus, creditLimit: Number(creditLimit) || 0, creditDays,
        creditBalance: customer?.creditBalance ?? 0, memberSince: customer?.memberSince ?? nowIso(),
        createdAt: customer?.createdAt ?? nowIso(), updatedAt: nowIso(),
      });
    } catch { /* toast shown by parent */ }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={customer ? "Edit Customer" : "Add Customer"} size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div><Label>Type</Label><Select value={type} onChange={(e) => setType(e.target.value as CustomerType)}><option value="RETAIL">Retail</option><option value="WHOLESALE">Wholesale</option><option value="B2B">B2B</option><option value="B2C">B2C</option></Select></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
          <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          <div><Label>Birthday</Label><Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></div>
        </div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div><Label>Tax ID</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
          <div><Label>VAT Number</Label><Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} /></div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">VIP & Loyalty</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-end pb-2.5"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} /> VIP</label></div>
            <div><Label>Loyalty Card #</Label><Input value={loyaltyCardNumber} onChange={(e) => setLoyaltyCardNumber(e.target.value)} /></div>
            <div><Label>Tier</Label><Select value={loyaltyTier} onChange={(e) => setLoyaltyTier(e.target.value as LoyaltyTier)}><option value="BRONZE">Bronze</option><option value="SILVER">Silver</option><option value="GOLD">Gold</option><option value="PLATINUM">Platinum</option><option value="DIAMOND">Diamond</option></Select></div>
            <div><Label>Points</Label><Input type="number" value={loyaltyPoints} onChange={(e) => setLoyaltyPoints(e.target.value)} /></div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Credit Account</p>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Credit Status</Label><Select value={creditStatus} onChange={(e) => setCreditStatus(e.target.value as CreditStatus)}><option value="NO_CREDIT">No Credit</option><option value="CREDIT">Credit</option><option value="BLACKLISTED">Blacklisted</option></Select></div>
            <div><Label>Credit Limit</Label><Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} /></div>
            <div><Label>Credit Days</Label><Select value={String(creditDays)} onChange={(e) => setCreditDays(Number(e.target.value) as CreditDays)}><option value="7">Net 7</option><option value="15">Net 15</option><option value="30">Net 30</option><option value="45">Net 45</option><option value="60">Net 60</option><option value="90">Net 90</option></Select></div>
          </div>
        </div>

        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      </div>
    </Modal>
  );
}
