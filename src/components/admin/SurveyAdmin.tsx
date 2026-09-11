import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { createSurvey, deleteSurvey } from "@/lib/admin.functions";
import { Loader2, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export function SurveyAdmin() {
  const { user } = useAuth();
  const router = useRouter();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    kawasan_id: "",
    lokasi: "",
    tanggal: "",
    surveyor: "",
    metode: "",
    titik: 0,
    temuan: "",
    catatan: "",
  });

  const [files, setFiles] = useState<File[]>([]);

  const loadSurveys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });
    setSurveys(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 5); // Max 5
      setFiles(selectedFiles);
    }
  };

  const uploadFiles = async () => {
    const uploadedUrls: any[] = [];
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `surveys/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      if (data) {
        // Get public URL
        const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(filePath);
        uploadedUrls.push({
          judul: "Foto Survei",
          keterangan: "Diunggah oleh admin",
          src: publicUrlData.publicUrl,
        });
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Upload files
      let fotos = [];
      if (files.length > 0) {
        fotos = await uploadFiles();
      }

      // 2. Parse temuan (split by newline)
      const temuanArray = form.temuan.split("\n").filter((t) => t.trim() !== "");

      // 3. Save to DB
      await createSurvey({
        data: {
          userId: user.id,
          survey: {
            ...form,
            temuan: temuanArray,
            fotos: fotos,
          },
        },
      });

      alert("Survei berhasil ditambahkan!");
      setForm({
        kawasan_id: "",
        lokasi: "",
        tanggal: "",
        surveyor: "",
        metode: "",
        titik: 0,
        temuan: "",
        catatan: "",
      });
      setFiles([]);
      loadSurveys();
      router.invalidate();
    } catch (e) {
      alert("Gagal menambahkan survei: " + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!user) return;
    if (!window.confirm(`Yakin hapus survei ${nama}?`)) return;

    try {
      await deleteSurvey({ data: { userId: user.id, surveyId: id } });
      alert("Survei dihapus!");
      loadSurveys();
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Tambah Survei */}
      <div className="rounded-2xl border border-border/30 bg-secondary/10 p-6">
        <h2 className="text-[14px] font-semibold mb-4">Tambah Lokasi Survei</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                ID Kawasan
              </label>
              <input
                required
                value={form.kawasan_id}
                onChange={(e) => setForm({ ...form, kawasan_id: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
                placeholder="Misal: KWS-01"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Lokasi
              </label>
              <input
                required
                value={form.lokasi}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
                placeholder="Nama tempat"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Tanggal
              </label>
              <input
                required
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
                placeholder="29 Agustus 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Surveyor
              </label>
              <input
                required
                value={form.surveyor}
                onChange={(e) => setForm({ ...form, surveyor: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
                placeholder="Nama surveyor"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Metode
              </label>
              <input
                required
                value={form.metode}
                onChange={(e) => setForm({ ...form, metode: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
                placeholder="Metode survei..."
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Jumlah Titik
              </label>
              <input
                required
                type="number"
                value={form.titik}
                onChange={(e) => setForm({ ...form, titik: Number(e.target.value) })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Temuan (Pisahkan dengan Enter)
              </label>
              <textarea
                rows={3}
                required
                value={form.temuan}
                onChange={(e) => setForm({ ...form, temuan: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
                placeholder="Temuan 1&#10;Temuan 2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Catatan
              </label>
              <textarea
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-[13px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Upload Foto (Max 5)
              </label>
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-muted-foreground" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-[13px]"
                />
              </div>
            </div>
          </div>
          <button
            disabled={isSubmitting}
            type="submit"
            className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {isSubmitting ? "Menyimpan..." : "Tambah Survei"}
          </button>
        </form>
      </div>

      {/* Tabel Survei */}
      <div className="rounded-2xl border border-border/30 bg-secondary/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">Belum ada survei.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border/20 bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Lokasi
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Surveyor
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {surveys.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.lokasi}</td>
                    <td className="px-4 py-3">{s.tanggal}</td>
                    <td className="px-4 py-3">{s.surveyor}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(s.id, s.lokasi)}
                        className="text-red-500 hover:underline flex items-center gap-1"
                      >
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
