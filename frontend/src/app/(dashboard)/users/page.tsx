"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, RefreshCw, X, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLES_FOR_ADD = ["SUPERVISOR", "CS", "VIEWER"];

function checkPasswordStrength(password: string) {
  const rules = [
    { label: "Minimal 8 karakter", test: password.length >= 8 },
    { label: "Huruf besar (A-Z)", test: /[A-Z]/.test(password) },
    { label: "Huruf kecil (a-z)", test: /[a-z]/.test(password) },
    { label: "Angka (0-9)", test: /[0-9]/.test(password) },
    { label: "Karakter khusus (!@#$%^&*)", test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
  const passed = rules.filter(r => r.test).length;
  const strength = passed <= 2 ? 'weak' : passed <= 3 ? 'fair' : passed <= 4 ? 'good' : 'strong';
  const isValid = passed === rules.length;
  return { rules, passed, strength, isValid };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const authUser = useAuthStore(state => state.user);
  const [currentRole, setCurrentRole] = useState<string>('');

  useEffect(() => {
    // Zustand store may not be hydrated on page load, fallback to localStorage
    if (authUser?.role) {
      setCurrentRole(authUser.role);
    } else {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setCurrentRole(parsed.role || '');
        }
      } catch {}
    }
  }, [authUser]);

  const isOwner = currentRole === 'OWNER';

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("VIEWER");
  const [formActive, setFormActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
    setLoading(false);
  };

  // ===== Add User =====
  const openAdd = () => {
    setDialogMode('add');
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("VIEWER");
    setFormActive(true);
    setFormError("");
    setShowPassword(false);
    setShowDialog(true);
  };

  // ===== Edit User =====
  const openEdit = (user: User) => {
    setDialogMode('edit');
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole(user.role);
    setFormActive(user.isActive);
    setFormError("");
    setShowPassword(false);
    setShowDialog(true);
  };

  // ===== Save (Add/Edit) =====
  const handleSave = async () => {
    setFormError("");

    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Nama dan email wajib diisi");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formEmail.trim())) {
      setFormError("Format email tidak valid (contoh: nama@domain.com)");
      return;
    }

    if (dialogMode === 'add' && !formPassword) {
      setFormError("Password wajib diisi untuk user baru");
      return;
    }

    if (formPassword) {
      const strength = checkPasswordStrength(formPassword);
      if (!strength.isValid) {
        setFormError("Password tidak memenuhi semua persyaratan keamanan");
        return;
      }
    }

    setSaving(true);
    try {
      if (dialogMode === 'add') {
        const res = await api.post("/users", {
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        });
        setUsers(prev => [res.data, ...prev]);
      } else if (editingUser) {
        const payload: any = {
          id: editingUser.id,
          name: formName,
          email: formEmail,
          role: formRole,
          isActive: formActive,
        };
        if (formPassword) payload.password = formPassword;

        const res = await api.patch("/users", payload);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? res.data : u));
      }
      setShowDialog(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Gagal menyimpan");
    }
    setSaving(false);
  };

  // ===== Delete =====
  const openDelete = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete("/users", { data: { id: deletingUser.id } });
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setShowDeleteConfirm(false);
      setDeletingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menghapus user");
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage dashboard access and roles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isOwner ? (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
              <ShieldAlert className="h-3.5 w-3.5" />
              Hanya Owner yang bisa kelola user
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                </TableRow>
              ))
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id} className="group">
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'OWNER' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={user.isActive ? 'text-emerald-500 border-emerald-500' : 'text-red-400 border-red-400'}>
                      {user.isActive ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    {isOwner && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {(() => {
                        const isLastUser = users.length <= 1;
                        const isLastOwner = (user.role === 'OWNER') && users.filter(u => u.role === 'OWNER').length <= 1;
                        const canDelete = !isLastUser && !isLastOwner;
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => canDelete && openDelete(user)}
                            disabled={!canDelete}
                            className={`h-8 w-8 p-0 ${canDelete ? 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                            title={isLastUser ? 'Tidak bisa hapus user terakhir' : isLastOwner ? 'Tidak bisa hapus Owner terakhir' : 'Delete user'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        );
                      })()}
                    </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada user
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== Add/Edit Dialog ===== */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg">
                {dialogMode === 'add' ? '➕ Tambah User' : '✏️ Edit User'}
              </h3>
              <button onClick={() => setShowDialog(false)} className="p-1 rounded hover:bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nama</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Password {dialogMode === 'edit' && <span className="text-muted-foreground font-normal">(kosongkan jika tidak diubah)</span>}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={dialogMode === 'add' ? "Password" : "Isi untuk ganti password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formPassword && (() => {
                  const { rules, strength } = checkPasswordStrength(formPassword);
                  const colors = { weak: 'bg-red-500', fair: 'bg-orange-500', good: 'bg-yellow-500', strong: 'bg-emerald-500' };
                  const labels = { weak: 'Lemah', fair: 'Cukup', good: 'Baik', strong: 'Kuat' };
                  const widths = { weak: '25%', fair: '50%', good: '75%', strong: '100%' };
                  return (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${colors[strength]}`} style={{ width: widths[strength] }} />
                        </div>
                        <span className={`text-xs font-medium ${
                          strength === 'strong' ? 'text-emerald-500' :
                          strength === 'good' ? 'text-yellow-500' :
                          strength === 'fair' ? 'text-orange-500' : 'text-red-500'
                        }`}>{labels[strength]}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {rules.map((rule, i) => (
                          <div key={i} className={`text-xs flex items-center gap-1.5 ${rule.test ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            <span>{rule.test ? '✓' : '○'}</span>
                            {rule.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Role</label>
                {dialogMode === 'edit' && editingUser?.role === 'OWNER' ? (
                  <div className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed flex items-center justify-between">
                    <span>OWNER</span>
                    <span className="text-xs">🔒 Tidak bisa diubah</span>
                  </div>
                ) : (
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {ROLES_FOR_ADD.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>

              {dialogMode === 'edit' && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Status</label>
                  <button
                    onClick={() => setFormActive(!formActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formActive ? 'bg-emerald-500' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${formActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm ${formActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {formActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-md">{formError}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowDialog(false)} disabled={saving}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  dialogMode === 'add' ? 'Tambah User' : 'Simpan Perubahan'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation ===== */}
      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Hapus User</h3>
                <p className="text-sm text-muted-foreground">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm mb-6">
              Anda akan menghapus user <strong className="text-red-400">{deletingUser.name}</strong> ({deletingUser.email}). Yakin ingin melanjutkan?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Batal
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5">
                {deleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Ya, Hapus
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
