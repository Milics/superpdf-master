import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { rotatePdfPages } from '@/lib/pdf-engine';
import { RotateCw, ArrowRight, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function usePdfCover(file: File) {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const objectUrl = URL.createObjectURL(file);
        
        pdfjsLib.getDocument(objectUrl).promise.then(async (pdf) => {
            if (!active) return;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport } as any).promise;
                if (active) setCoverUrl(canvas.toDataURL('image/jpeg', 0.8));
            }
            URL.revokeObjectURL(objectUrl);
        }).catch(() => {
            URL.revokeObjectURL(objectUrl);
        });
        
        return () => { active = false; };
    }, [file]);

    return coverUrl;
}

export function RotatePDF() {
    const [file, setFile] = useState<File | null>(null);
    const [degrees, setDegrees] = useState(90);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const coverUrl = usePdfCover(file || new File([], ''));

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
        setDegrees(90);
    };

    const executeRotation = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const res = await rotatePdfPages(file, degrees, undefined, `Rotated_${degrees}deg_${file.name}`);
            setResult(res);
        } catch (err: any) {
            setErrorMsg(err.message || '旋转失败，可能是文件过大或已被加密。');
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                 <div 
                    className="w-48 sm:w-64 aspect-[1/1.414] bg-white dark:bg-zinc-100 rounded-2xl border-2 border-primary/20 flex flex-col items-center justify-center overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-primary/30"
                    style={{ transform: `rotate(${degrees}deg)` }}
                 >
                     {coverUrl ? (
                         <img src={coverUrl} className="w-full h-full object-contain" alt="预览封面" />
                     ) : (
                         <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-50 dark:bg-zinc-800">
                             <FileText className="w-16 h-16 text-primary/40 mb-2" />
                             <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded truncate max-w-[80%]">{file.name}</span>
                         </div>
                     )}
                 </div>
                 
                 <div className="bg-background/80 backdrop-blur px-8 py-4 rounded-3xl shadow-sm border flex items-center gap-4">
                     <div className="space-y-1 text-center">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">源文件信息</p>
                         <p className="text-sm font-semibold text-foreground tracking-tight line-clamp-1 max-w-[200px]">{file.name}</p>
                         <p className="text-lg font-black text-primary tracking-tight">{formatSize(file.size)}</p>
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
                        <div className="bg-orange-50/50 dark:bg-orange-900/20 p-5 rounded-3xl border border-orange-100/50 dark:border-orange-800/50 transition-colors">
                            <h3 className="text-sm font-bold flex items-center mb-3 text-orange-900 dark:text-orange-100">
                                <RotateCw className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                                调整页面朝向
                            </h3>
                            <p className="text-xs text-orange-800/70 dark:text-orange-200/70 leading-relaxed font-medium">
                                点击下方按钮设定文档的旋转角度。左侧画板会实时向您呈现第一页的旋转预览效果。
                            </p>
                        </div>
                        
                        <div className="space-y-3 mt-8">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                设定旋转方位
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {[90, 180, 270].map((deg) => (
                                    <button
                                        key={deg}
                                        onClick={() => setDegrees(deg)}
                                        className={`flex-1 p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${degrees === deg
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-md transform -translate-y-1'
                                                : 'border-border hover:border-orange-500/50 hover:bg-muted/50'
                                            }`}
                                    >
                                        <RotateCw
                                            className={`h-8 w-8 transition-transform duration-300 ${degrees === deg ? 'text-orange-500' : 'text-muted-foreground'}`}
                                            style={{ transform: `rotate(${deg}deg)` }}
                                        />
                                        <span className={`text-xs font-bold ${degrees === deg ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                            顺时针 {deg}°
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>
                
                <ToolWorkspace.Footer>
                    <Button 
                        size="lg" 
                        onClick={executeRotation}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        执行旋转 <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="旋转 PDF"
            description="当您扫描或创建的 PDF 朝向错误时，将它们永久旋转到正确的角度。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState 
                        title="修整成功！"
                        description={`您的文档已经被永久化向顺时针旋转了 ${degrees} 度`}
                        results={[{
                            url: result.url,
                            filename: result.filename,
                        }]} 
                        onReset={handleReset} 
                    />
                )
            }
        />
    );
}
