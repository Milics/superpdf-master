import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/Button';
import { FileText, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export function ExtractPages() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setSelectedPages(new Set());
        if (selectedFiles.length > 0) {
            const f = selectedFiles[0];
            setFile(f);
            try {
                const ab = await f.arrayBuffer();
                const doc = await PDFDocument.load(ab);
                setPageCount(doc.getPageCount());
            } catch { setPageCount(0); }
        }
    };

    const toggle = (idx: number) => {
        setSelectedPages(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    const execute = async () => {
        if (!file || selectedPages.size === 0) {
            setErrorMsg('请至少选择一个页面。');
            return;
        }
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const ab = await file.arrayBuffer();
            const srcDoc = await PDFDocument.load(ab);
            const newDoc = await PDFDocument.create();
            const indices = Array.from(selectedPages).sort((a, b) => a - b);
            const copied = await newDoc.copyPages(srcDoc, indices);
            copied.forEach(p => newDoc.addPage(p));

            const bytes = await newDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Extracted_${file.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setErrorMsg(err.message || '提取失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight">提取页面</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    从 PDF 中选择特定页面，提取并生成一个全新的 PDF 文件。
                </p>
            </div>

            <Card className="glass shadow-lg border-primary/20">
                <CardContent className="pt-6">
                    <FileDropzone onFilesSelected={handleFilesSelected} accept="application/pdf" multiple={false}
                        title="选择 PDF 文件" description="上传后点选要提取的页面" />
                </CardContent>
            </Card>

            {file && pageCount > 0 && (
                <Card className="shadow-md">
                    <CardHeader className="pb-4 border-b border-border/40">
                        <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{file.name}</CardTitle>
                            <span className="text-sm text-muted-foreground">共 {pageCount} 页 · 已选 {selectedPages.size} 页</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                            {Array.from({ length: pageCount }, (_, i) => (
                                <button key={i} onClick={() => toggle(i)}
                                    className={`aspect-[3/4] rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${selectedPages.has(i)
                                            ? 'border-primary bg-primary/10 text-primary shadow-sm scale-105'
                                            : 'border-border/50 bg-card text-muted-foreground hover:border-primary/50'
                                        }`}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <Button onClick={execute} disabled={isProcessing || selectedPages.size === 0}
                            isLoading={isProcessing} size="lg" className="w-full shadow-md shadow-primary/20">
                            <Download className="w-4 h-4 mr-2" /> 提取 {selectedPages.size} 页
                        </Button>
                    </CardContent>
                </Card>
            )}

            {errorMsg && (
                <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-lg border border-destructive/20">⚠️ {errorMsg}</div>
            )}
        </div>
    );
}
