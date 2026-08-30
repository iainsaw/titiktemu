import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { createTeamMember, deleteTeamMember } from "@/lib/admin.functions";
import { Loader2, Plus, Trash2, Image as ImageIcon } from "lucide-react";

export function TeamAdmin() {
  const { user } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nama: "",
    label: "",
    peran: "",
    teks: "",
    linkedin: false,
    order_index: 0,
  });

  const [file, setFile] = useState<File | null>(null);

  const loadTeam = async () => {
    setLoading(true);
    const { data } = await supabase.from("team_members").select("*").order("order_index", { ascending: true });
    setTeam(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `team_${Math.random()}.${fileExt}`;
    const filePath = `team/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    if (data) {
      const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Upload file if exists
      const foto_url = await uploadFile();

      // 2. Save to DB
      await createTeamMember({
        data: {
          userId: user.id,
          member: {
            ...form,
            foto_url
          }
        }
      });

      alert("Anggota tim berhasil ditambahkan!");
      setForm({
        nama: "", label: "", peran: "", teks: "", linkedin: false, order_index: 0
      });
      setFile(null);
      loadTeam();
    } catch (e) {
      alert("Gagal menambahkan tim: " + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!user) return;
    if (!window.confirm(`Yakin hapus anggota ${nama}?`)) return;

    try {
      await deleteTeamMember({ data: { userId: user.id, id } });
      alert("Anggota dihapus!");
      loadTeam();
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Tambah Tim */}
      <div className="rounded-2xl border border-border/30 bg-secondary/10 p-6">
        <h2 className="text-[14px] font-semibold mb-4">Tambah Anggota Tim</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Nama Lengkap</label>
              <input required value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]" placeholder="Misal: Dr. Riantini" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Label</label>
              <input required value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]" placeholder="Misal: PEMBIMBING" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Peran</label>
              <input required value={form.peran} onChange={e => setForm({...form, peran: e.target.value})} className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]" placeholder="Misal: WebGIS Developer" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Urutan Tampil</label>
              <input required type="number" value={form.order_index} onChange={e => setForm({...form, order_index: Number(e.target.value)})} className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Deskripsi (Teks)</label>
              <textarea rows={2} required value={form.teks} onChange={e => setForm({...form, teks: e.target.value})} className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]" placeholder="Membangun peta interaktif..." />
            </div>
            
            <div className="flex items-center gap-2">
               <input type="checkbox" id="linkedin" checked={form.linkedin} onChange={e => setForm({...form, linkedin: e.target.checked})} />
               <label htmlFor="linkedin" className="text-[13px]">Aktifkan Tombol LinkedIn?</label>
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Upload Foto (1 saja)</label>
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={handleFileChange} className="text-[13px]" />
              </div>
            </div>
          </div>
          <button disabled={isSubmitting} type="submit" className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isSubmitting ? "Menyimpan..." : "Tambah Anggota"}
          </button>
        </form>
      </div>

      {/* Tabel Tim */}
      <div className="rounded-2xl border border-border/30 bg-secondary/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : team.length === 0 ? (
           <div className="p-8 text-center text-[13px] text-muted-foreground">Belum ada anggota.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border/20 bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Nama</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Peran</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">LinkedIn</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {team.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium flex items-center gap-3">
                      {t.foto_url && <img src={t.foto_url} alt="" className="size-8 rounded-full object-cover" />}
                      {t.nama}
                    </td>
                    <td className="px-4 py-3">{t.peran}</td>
                    <td className="px-4 py-3">{t.linkedin ? 'Ya' : 'Tidak'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(t.id, t.nama)} className="text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 className="size-3" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
