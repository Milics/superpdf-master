import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { compressPdf } from '@/lib/pdf-engine';
import { FileArchive, ArrowRight, FileText } from 'lucide-react';

export function CompressPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string; originalSize: number; compressedSize: number } | null>(null);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length > 0) setFile(selectedFiles[0]);
    };

    const handleReset = () => {
        if (result && result.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setErrorMsg(null);
    };

    const executeCompress = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const res = await compressPdf(file, `Compressed_${file.name}`);
            setResult(res);
        } catch (err: any) {
            setErrorMsg(err.message || '压缩失败，可能是文件过大或已被加密。');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                 <div className="w-40 sm:w-56 aspect-[1/1.414] bg-white dark:bg-zinc-100 rounded-2xl border-2 border-primary/20 flex flex-col items-center justify-center overflow-hidden shadow-2xl transition-all hover:scale-105 hover:shadow-primary/30 group">
                     <FileText className="w-20 h-20 text-primary/40 mb-4 transition-transform group-hover:-translate-y-2 group-hover:scale-110" />
                     <span className="text-xs font-bold text-muted-foreground bg-muted/80 backdrop-blur px-3 py-1.5 rounded truncate max-w-[85%]">{file.name}</span>
                 </div>
                 <div className="bg-background/80 backdrop-blur px-8 py-4 rounded-3xl shadow-sm border flex items-center gap-4">
                     <div className="space-y-1 text-center">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">待压缩文件尺寸</p>
                         <p className="text-2xl font-black text-primary tracking-tight">{formatSize(file.size)}</p>
                     </div>
                 </div>
            </div>
        );
    };

    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-800/50 transition-colors">
                            <h3 className="text-sm font-bold flex items-center mb-3 text-blue-900 dark:text-blue-100">
                                <FileArchive className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                极致体验，丝滑瘦身
                            </h3>
                            <p className="text-xs text-blue-800/70 dark:text-blue-200/70 leading-relaxed font-medium">
                                我们将在您的浏览器本地极速运算，通过智能重组内部对象结构，无损剔除冗余代码来为您极大降低 PDF 体积。
                            </p>
                        </div>
                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>
                
                <ToolWorkspace.Footer>
                    <Button 
                        size="lg" 
                        onClick={executeCompress}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        开始压缩 <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="压缩 PDF"
            description="在保持最佳阅读质量的同时，大幅度缩小 PDF 文档的存储体积。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState 
                        title="极限压缩完成！"
                        description={`成功为您节省了 ${Math.max(0, ((1 - result.compressedSize / result.originalSize) * 100)).toFixed(1)}% 的存储空间`}
                        results={[{
                            url: result.url,
                            filename: result.filename,
                            label: `压缩瘦身后仅 [ ${formatSize(result.compressedSize)} ]`,
                            subLabel: `原文件庞大的体积: ${formatSize(result.originalSize)}`
                        }]} 
                        onReset={handleReset} 
                    />
                )
            }
        />
    );
}
