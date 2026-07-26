"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge, statusTone } from "@/components/ui/primitives";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "@/services/audit";
import { listRoles } from "@/services/permissions";
import { SYSTEM_ROLES } from "@/services/permissions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import type { Employee } from "@/types/enterprise";

export default function EmployeesPage() {
  const db = useDb();
  const employees = useLiveQuery(() => (db ? db.employees.toArray() : []), [db]) ?? [];
  const roles = useLiveQuery(() => (db ? db.roles.toArray() : []), [db]) ?? [];

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);

  const roleName = (id?: string | null) => {
    if (!id) return "—";
    return roles.find((r) => r.id === id)?.label ?? "—";
  };

  const nextCode = React.useCallback(() => {
    const n = employees.length + 1;
    return `EMP-${String(n).padStart(4, "0")}`;
  }, [employees.length]);

  const columns: Column<Employee>[] = [
    { key: "code", header: "Code", sortable: true, filterable: true, render: (e) => <span className="font-mono text-xs text-slate-500">{e.code}</span> },
    { key: "fullName", header: "Name", sortable: true, filterable: true, render: (e) => <span className="font-medium text-slate-800">{e.fullName}</span> },
    { key: "roleName", header: "Role", filterable: true, render: (e) => <Badge tone="info">{e.roleName ?? roleName(e.roleId)}</Badge> },
    { key: "phone", header: "Phone", render: (e) => e.phone || "—" },
    { key: "email", header: "Email", filterable: true, render: (e) => e.email || "—" },
    { key: "isActive", header: "Status", sortable: true, render: (e) => <Badge tone={e.isActive ? "success" : "danger"}>{e.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "Actions", align: "right",
      render: (e) => (
        <div className="flex justify-end gap-2">
          <button onClick={(ev) => { ev.stopPropagation(); setEditing(e); }} className="text-[#0070E0] hover:underline text-xs inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</button>
          <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }} className="text-red-500 hover:underline text-xs inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </div>
      ),
    },
  ];

  const remove = async (id: string) => {
    if (!db) return;
    if (!confirm("Delete this employee?")) return;
    await db.employees.delete(id);
    await logAudit(db, { action: "DELETE", entity: "employee", entityId: id });
    toast.success("Employee deleted");
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} employees`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Employee</Button>}
      />
      <DataTable
        columns={columns}
        rows={employees}
        rowKey={(e) => e.id}
        searchKeys={["fullName", "code", "email", "phone"]}
        dateFilterKey="createdAt"
        exportFilename="unipos-employees"
        exportTitle="Employees"
        statusFilterKey="isActive"
        statusOptions={["true", "false"]}
        emptyIcon={UserCog}
        emptyTitle="No employees yet"
      />
      {(open || editing) && db && (
        <EmployeeForm
          employee={editing}
          roles={roles}
          defaultCode={nextCode()}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={async (e) => {
            if (editing) {
              await db.employees.update(editing.id, e);
              await logAudit(db, { action: "EDIT", entity: "employee", entityId: e.id, oldValue: editing, newValue: e });
              toast.success("Employee updated");
            } else {
              await db.employees.add(e);
              await logAudit(db, { action: "CREATE", entity: "employee", entityId: e.id, newValue: e });
              toast.success("Employee added");
            }
            setOpen(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EmployeeForm({ employee, roles, defaultCode, onClose, onSave }: {
  employee: Employee | null; roles: import("@/types/enterprise").Role[]; defaultCode: string;
  onClose: () => void; onSave: (e: Employee) => Promise<void>;
}) {
  const [code, setCode] = React.useState(employee?.code ?? defaultCode);
  const [firstName, setFirstName] = React.useState(employee?.firstName ?? "");
  const [lastName, setLastName] = React.useState(employee?.lastName ?? "");
  const [email, setEmail] = React.useState(employee?.email ?? "");
  const [phone, setPhone] = React.useState(employee?.phone ?? "");
  const [address, setAddress] = React.useState(employee?.address ?? "");
  const [roleId, setRoleId] = React.useState(employee?.roleId ?? "");
  const [salary, setSalary] = React.useState(employee?.salary !== undefined ? String(employee.salary) : "");
  const [isActive, setIsActive] = React.useState(employee?.isActive ?? true);
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    if (!code.trim()) { toast.error("Employee code is required"); return; }
    const role = roles.find((r) => r.id === roleId);
    setSaving(true);
    await onSave({
      id: employee?.id ?? generateId(),
      code: code.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      roleId: roleId || null,
      roleName: role?.name ?? null,
      warehouseId: employee?.warehouseId ?? null,
      salary: salary ? Number(salary) : undefined,
      hiredAt: employee?.hiredAt ?? nowIso(),
      isActive,
      createdAt: employee?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    setSaving(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={employee ? "Edit Employee" : "Add Employee"}
      size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EMP-0001" /></div>
          <div><Label>Role</Label>
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">— Select role —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" /></div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@example.com" /></div>
        </div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Salary</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0.00" /></div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
