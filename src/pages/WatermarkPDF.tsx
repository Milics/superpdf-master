import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { addWatermark } from '@/lib/pdf-engine';
import { Type, ArrowRight, Settings2 } from 'lucide-react';
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

export function WatermarkPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [watermarkText, setWatermarkText] = useState('仅供内部查阅');
    const [fontSize, setFontSize] = useState(48);
    const [opacity, setOpacity] = useState(25);

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
        setWatermarkText('仅供内部查阅');
        setFontSize(48);
        setOpacity(25);
    };

    const executeWatermark = async () => {
        if (!file) return;
        if (!watermarkText.trim()) {
            setErrorMsg('水印文本不能为空');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const res = await addWatermark(
                file,
                watermarkText,
                { fontSize, opacity: opacity / 100, rotation: -45 },
                `Watermarked_${file.name}`
            );
            setResult(res);
        } catch (err: any) {
            setErrorMsg(err.message || '添加水印失败，可能由于文档被加密。');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center py-6 pb-20 overflow-y-auto w-full relative">
                <div className="absolute top-6">
                    <span className="bg-background/80 backdrop-blur px-8 py-2.5 rounded-full shadow-sm border text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        水印实时渲染画板
                    </span>
                </div>
                
                <div className="flex-1 w-full flex items-center justify-center p-8 mt-12">
                     <div className="relative w-full max-w-sm sm:max-w-md aspect-[1/1.414] bg-white border border-border/50 shadow-2xl flex flex-col items-center justify-center overflow-hidden group transition-all duration-300">
                         {coverUrl ? (
                             <img src={coverUrl} className="w-full h-full object-contain pointer-events-none select-none transition-all duration-300 opacity-90 group-hover:opacity-100" alt="文档封面" />
                         ) : (
                             <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900 border" />
                         )}

                         {/* 水印物理叠加层 */}
                         {watermarkText.trim() && (
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                                 <span
                                     className="font-black text-center whitespace-nowrap text-zinc-900 dark:text-zinc-100 transition-all duration-200"
                                     style={{
                                         fontSize: `${Math.max(12, fontSize)}px`,
                                         opacity: opacity / 100,
                                         transform: `rotate(-45deg)`,
                                     }}
                                 >
                                     {watermarkText}
                                 </span>
                             </div>
                         )}
                     </div>
                </div>
            </div>
        );
    };

    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-8 md:pt-4">
                        <div className="bg-purple-50/50 dark:bg-purple-900/10 p-5 rounded-3xl border border-purple-100/50 dark:border-purple-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-purple-900 dark:text-purple-100">
                                <Type className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                                烙印您的版权信息
                            </h3>
                            <p className="text-[11px] text-purple-800/70 dark:text-purple-200/70 leading-relaxed font-medium">
                                高度防伪且直接侵入底层结构。不仅能在首屏展示，我们也会强行将水印渲染覆盖至该文档的所有页面中。
                            </p>
                        </div>
                        
                        <div className="space-y-8 px-1">
                            {/* 水印文字输入 */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                    <Settings2 className="w-3.5 h-3.5 mr-1" /> 设置水印文字
                                </label>
                                <input
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText(e.target.value)}
                                    placeholder="输入要显示的文字..."
                                    className="w-full px-5 py-4 rounded-2xl border bg-background/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-bold shadow-sm"
                                    maxLength={30}
                                />
                            </div>

                            {/* 大小刻度 */}
                            <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border/40">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">印章大小</label>
                                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{fontSize} px</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="200"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground/60 font-medium px-1">
                                    <span>小</span>
                                    <span>巨无霸</span>
                                </div>
                            </div>

                            {/* 透明度 */}
                            <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border/40">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">实体透明度</label>
                                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{opacity}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="90"
                                    value={opacity}
                                    onChange={(e) => setOpacity(Number(e.target.value))}
                                    className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground/60 font-medium px-1">
                                    <span>若隐若现</span>
                                    <span>极度清晰</span>
                                </div>
                            </div>
                        </div>

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>
                
                <ToolWorkspace.Footer>
                    <Button 
                        size="lg" 
                        onClick={executeWatermark}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        嵌入水印 <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="加水印"
            description="给所有的页面打上专属于您的文字印章或版权声明，并在极高自由度下调整排版格式。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState 
                        title="水印嵌入完成！"
                        description="所有底面档案数据已被成功修改加密"
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
