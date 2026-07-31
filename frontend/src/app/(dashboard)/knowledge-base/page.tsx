"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Table as TableIcon, Database, UploadCloud, Trash2, Loader2, CheckCircle, FileSpreadsheet, File } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  content?: string;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      const res = await api.get("/knowledge-base");
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (max 4MB for Vercel serverless)
      if (file.size > 4 * 1024 * 1024) {
        setMessage(`❌ "${file.name}" terlalu besar (${(file.size/1024/1024).toFixed(1)}MB). Maks 4MB.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const token = localStorage.getItem("access_token") || "";
        const res = await fetch("/api/knowledge-base", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          setMessage(`❌ Server error saat upload "${file.name}". Coba file lebih kecil atau format lain (.docx/.txt).`);
          console.error("Non-JSON response:", text.substring(0, 200));
          continue;
        }

        const data = await res.json();
        if (res.ok) {
          setMessage(`✅ "${file.name}" berhasil diupload! (${data.chunks} chunks)`);
        } else {
          setMessage(`❌ Gagal upload "${file.name}": ${data.message}`);
        }
      } catch (err: any) {
        setMessage(`❌ Error upload "${file.name}": ${err.message}`);
      }
    }

    setUploading(false);
    loadDocuments();
    setTimeout(() => setMessage(""), 5000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus dokumen "${name}"?`)) return;
    try {
      await api.delete(`/knowledge-base?id=${id}`);
      setMessage(`✅ "${name}" berhasil dihapus`);
      loadDocuments();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(`❌ Gagal hapus: ${err.message}`);
    }
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
    if (type?.includes('word') || type?.includes('docx')) return <File className="h-4 w-4 text-blue-400" />;
    if (type?.includes('sheet') || type?.includes('xlsx') || type?.includes('csv')) return <FileSpreadsheet className="h-4 w-4 text-green-400" />;
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">Upload dokumen agar AI bisa menjawab berdasarkan data kamu.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message}
        </div>
      )}

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/50 glass max-w-md h-12">
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="excel" className="gap-2"><TableIcon className="h-4 w-4" /> Excel/CSV</TabsTrigger>
          <TabsTrigger value="database" className="gap-2"><Database className="h-4 w-4" /> Database</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {/* Upload Area */}
          <Card 
            className={`border-dashed border-2 bg-transparent shadow-none cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
          >
            <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 mb-4 animate-spin text-primary" />
                  <p className="font-medium">Mengupload & memproses...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 mb-4" />
                  <p className="font-medium">Drag & drop files atau klik untuk upload</p>
                  <p className="text-sm mt-1">Supports PDF, DOCX, XLSX, CSV, TXT (Max 10MB)</p>
                </>
              )}
            </CardContent>
          </Card>

          <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            multiple
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
            onChange={(e) => handleUpload(e.target.files)}
          />

          {/* Document List */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📚 Dokumen yang Diupload ({documents.length})</CardTitle>
                <CardDescription>AI akan menggunakan dokumen ini untuk menjawab pertanyaan pelanggan.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {getFileIcon(doc.type)}
                          {doc.name}
                        </TableCell>
                        <TableCell className="uppercase text-xs">{doc.type}</TableCell>
                        <TableCell>{formatSize(doc.size)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={doc.status === 'INDEXED' ? 'text-emerald-400 border-emerald-500/30' : 'text-yellow-400 border-yellow-500/30'}>
                            {doc.status === 'INDEXED' ? <><CheckCircle className="h-3 w-3 mr-1" /> Indexed</> : doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id, doc.name)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {documents.length === 0 && !uploading && (
            <Card className="bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">Belum ada dokumen</p>
                <p className="text-sm mt-1">Upload dokumen pertama kamu untuk melatih AI</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="excel">
          <Card>
            <CardHeader>
              <CardTitle>📊 Spreadsheet Data</CardTitle>
              <CardDescription>Upload data Excel/CSV — otomatis diparse dan dimasukkan ke knowledge base.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="h-4 w-4 mr-2" /> Upload Excel/CSV
              </Button>
              <p className="text-muted-foreground text-sm mt-4">Data dari Excel akan diparse per-sheet dan dijadikan referensi AI.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>🗄️ Database Connections</CardTitle>
              <CardDescription>Fitur koneksi database akan tersedia di versi selanjutnya.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Coming soon — koneksi langsung ke PostgreSQL, MySQL, dll.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
