import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Wrench, ArrowRight, FileWarning, CheckCircle2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export function RepairPDF() {
    const [file, setFile] = useState<File | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string; originalSize: number; repairedSize: number } | null>(null);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length > 0) setFile(selectedFiles[0]);
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setErrorMsg(null);
        setProgress('');
    };

    const execute = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在分析文档结构…');

        try {
            const ab = await file.arrayBuffer();

            setProgress('正在尝试容错加载…');
            // 使用宽容模式加载 — 跳过无效对象而不是直接报错
            const pdfDoc = await PDFDocument.load(ab, {
                ignoreEncryption: true,
                throwOnInvalidObject: false,
            });

            const pageCount = pdfDoc.getPageCount();
            setProgress(`成功解析 ${pageCount} 页，正在重建文档…`);

            // 重新序列化 — 这会清理交叉引用表、移除损坏的对象、压缩对象流
            const repairedBytes = await pdfDoc.save({
                useObjectStreams: true,
                addDefaultPage: false,
            });

            const blob = new Blob([repairedBytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({
                url,
                filename: `Repaired_${file.name}`,
                originalSize: file.size,
                repairedSize: blob.size,
            });
            setProgress('');
        } catch (err: any) {
            setErrorMsg(`修复失败：${err.message || '该文件损坏程度过于严重，无法恢复。'}`);
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                {/* 修复动画 */}
                <div className="relative">
                    <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 ${
                        isProcessing ? 'bg-amber-500/10 ring-4 ring-amber-500/30 animate-pulse' :
                        result ? 'bg-emerald-500/10 ring-4 ring-emerald-500/30' :
                        'bg-muted/30 ring-4 ring-border/30'
                    }`}>
                        {result ? (
                            <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                        ) : (
                            <Wrench className={`w-20 h-20 transition-all duration-500 ${
                                isProcessing ? 'text-amber-500 animate-spin' : 'text-muted-foreground/30'
                            }`} style={isProcessing ? { animationDuration: '3s' } : {}} />
                        )}
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-muted-foreground truncate max-w-[260px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground/60"><span>{(file.size / 1024).toFixed(1)} KB</span></p>
                </div>

                {progress && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-amber-200/50 animate-pulse">
                        <span>{progress}</span>
                    </div>
                )}

                {result && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-200/50 text-center space-y-1">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300"><span>✅ 文档重建成功</span></p>
                        <p className="text-[10px] text-emerald-600/60">
                            <span>{(result.originalSize / 1024).toFixed(1)} KB → {(result.repairedSize / 1024).toFixed(1)} KB</span>
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4">
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100/50 dark:border-amber-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-amber-900 dark:text-amber-100">
                            <FileWarning className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                            <span>智能修复引擎</span>
                        </h3>
                        <p className="text-[11px] text-amber-800/70 dark:text-amber-200/70 leading-relaxed font-medium">
                            <span>上传损坏或无法正常打开的 PDF 文件。系统将以容错模式强行解析文档结构，跳过损坏的对象，然后重新序列化并压缩，生成一份修复后的全新文件。</span>
                        </p>
                    </div>

                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/40 space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase"><span>修复原理</span></h4>
                        <ul className="space-y-2 text-[11px] text-muted-foreground font-medium">
                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> <span>重建交叉引用表（XRef Table）</span></li>
                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> <span>移除损坏或无效的对象引用</span></li>
                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> <span>压缩对象流减小体积</span></li>
                            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">⚠</span> <span>严重损坏的文件可能无法完全恢复</span></li>
                        </ul>
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>修复文档</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="修复 PDF"
            description="尝试修复损坏或无法正常打开的 PDF 文件，重建文档结构。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="修复完成！"
                        description={`文档已从 ${(result.originalSize / 1024).toFixed(1)} KB 重建为 ${(result.repairedSize / 1024).toFixed(1)} KB。`}
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
