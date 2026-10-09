import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { ImageIcon, FileText, ArrowRight, X, Loader2, PackageCheck } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// 设置 pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface RenderedPage {
    pageNumber: number;
    dataUrl: string;
    width: number;
    height: number;
}

export function PdfToJpg() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<RenderedPage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setPages([]);
        setProgress({ current: 0, total: 0 });
        if (selectedFiles.length > 0) {
            setFile(selectedFiles[0]);
        }
    };

    const handleReset = () => {
        setPages([]);
        setFile(null);
        setErrorMsg(null);
        setProgress({ current: 0, total: 0 });
    };

    const executeConversion = async () => {
        if (!file) return;

        setIsProcessing(true);
        setErrorMsg(null);
        setPages([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdf.numPages;
            setProgress({ current: 0, total: totalPages });

            const rendered: RenderedPage[] = [];
            const canvas = canvasRef.current || document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) throw new Error('无法创建 Canvas 绘图上下文。');

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 2; // 超清渲染
                const viewport = page.getViewport({ scale });

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: ctx, viewport, canvas }).promise;

                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                rendered.push({
                    pageNumber: i,
                    dataUrl,
                    width: viewport.width,
                    height: viewport.height,
                });

                setProgress({ current: i, total: totalPages });
                
                // 给 React 渲染留出呼吸时间，避免 UI 卡死
                if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
            }

            setPages(rendered);
        } catch (err: any) {
            console.error('PDF 渲染失败:', err);
            setErrorMsg(err.message || '转换出错，请确保 PDF 未被加密且有效。');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadImage = (page: RenderedPage) => {
        const link = document.createElement('a');
        link.href = page.dataUrl;
        link.download = `${file?.name?.replace('.pdf', '') || '提取画面'}_第${page.pageNumber}页.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAll = async () => {
        if (pages.length === 0) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            // 用源文件名创建一个子文件夹
            const folderName = file?.name?.replace('.pdf', '') || 'PDF转图片';
            const folder = zip.folder(folderName)!;

            for (const page of pages) {
                // 将 dataUrl 转成 Blob 二进制
                const response = await fetch(page.dataUrl);
                const blob = await response.blob();
                folder.file(`${folderName}_第${page.pageNumber}页.jpg`, blob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderName}_全部图片.zip`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 200);
        } catch (err) {
            console.error('ZIP 打包失败:', err);
            setErrorMsg('打包下载失败，请尝试单独保存图片。');
        } finally {
            setIsZipping(false);
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
                 <div className="w-40 sm:w-56 aspect-[1/1.414] bg-white dark:bg-zinc-100 rounded-3xl border border-primary/20 flex flex-col items-center justify-center overflow-hidden shadow-2xl transition-all hover:scale-105 group relative">
                     <FileText className="w-20 h-20 text-primary/30 mb-4 transition-transform group-hover:-translate-y-2 group-hover:scale-110" />
                     <span className="text-[10px] font-black text-muted-foreground bg-muted/80 backdrop-blur px-3 py-1.5 rounded uppercase max-w-[85%] truncate z-10">{file.name}</span>
                     
                     <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 <div className="bg-background/80 backdrop-blur px-8 py-4 rounded-3xl shadow-sm border flex items-center gap-4 group-hover:border-primary/30 transition-colors">
                     <div className="space-y-1 text-center">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">待解析母本体积</p>
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
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-3 text-emerald-900 dark:text-emerald-100">
                                <ImageIcon className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                                纯前端位图提纯
                            </h3>
                            <p className="text-[11px] text-emerald-800/70 dark:text-emerald-200/70 leading-relaxed font-medium">
                                我们将在本地极速为您渲染源文档的每一个分页，并提取为超高清晰度无水印的独立 JPG 图像序列，全部过程绝对的零隐私泄露。
                            </p>
                        </div>
                        
                        {isProcessing && progress.total > 0 && (
                            <div className="space-y-2 bg-muted/30 p-5 rounded-2xl border border-border/40">
                                <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase">
                                    <span>深度解析进度</span>
                                    <span className="text-primary tracking-wider">{progress.current} / {progress.total}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                                    <div
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>
                
                <ToolWorkspace.Footer>
                    <Button 
                        size="lg" 
                        onClick={executeConversion}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        开始解印分离图像 <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <>
            {/* 隐藏的离屏 Canvas 渲染池 */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <ToolWorkspace
                title="PDF 转图片"
                description="将文档的每一页面直接无损提取、转换为单张超清 JPG 图像集。"
                fileCount={file ? 1 : 0}
                onFilesSelected={handleFilesSelected}
                leftPanel={renderLeftPanel()}
                rightPanel={renderRightPanel()}
                isSuccess={pages.length > 0}
                successPanel={
                    pages.length > 0 && (
                        <div className="flex-1 w-full flex flex-col p-6 sm:p-10 animate-in fade-in duration-500 max-w-7xl mx-auto h-full overflow-hidden">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 shrink-0 bg-card p-6 rounded-3xl border shadow-sm">
                                 <div>
                                     <h2 className="text-3xl font-black tracking-tight flex items-center">
                                          <ImageIcon className="w-8 h-8 mr-3 text-emerald-500" /> 提纯阵列就绪
                                     </h2>
                                     <p className="text-muted-foreground mt-2 text-sm font-medium">共为您成功剥离了 <span className="font-bold text-foreground mx-1">{pages.length}</span> 张无损内页图片。可单独悬浮保存或一次性下发。</p>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <Button variant="ghost" size="lg" onClick={handleReset} className="h-12 rounded-xl text-muted-foreground hover:bg-muted/50 px-6">
                                         <X className="w-4 h-4 mr-2" /> <span>放弃重建</span>
                                     </Button>
                                     <Button size="lg" onClick={downloadAll} disabled={isZipping} className="h-12 rounded-xl shadow-lg shadow-emerald-500/20 px-8 bg-emerald-500 hover:bg-emerald-600 text-white">
                                         {isZipping ? (
                                             <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> <span>正在打包…</span></>
                                         ) : (
                                             <><PackageCheck className="w-4 h-4 mr-2" /> <span>打包下载 ZIP</span></>
                                         )}
                                     </Button>
                                 </div>
                             </div>

                             <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-20 custom-scrollbar">
                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                     {pages.map((page) => (
                                         <div key={page.pageNumber} className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border/50 group hover:shadow-2xl hover:border-emerald-500/40 transition-all hover:-translate-y-2 flex flex-col">
                                             <div className="flex-1 overflow-hidden bg-zinc-100/50 dark:bg-zinc-900/40 p-4 flex items-center justify-center relative">
                                                 <img
                                                     src={page.dataUrl}
                                                     alt={`第 ${page.pageNumber} 页`}
                                                     className="max-w-full max-h-[220px] object-contain drop-shadow-md pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
                                                 />
                                                  {/* 悬浮遮罩下载按妞 */}
                                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                       <Button onClick={() => downloadImage(page)} className="bg-white text-black hover:bg-zinc-200 rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-transform px-6">
                                                           单独保存
                                                       </Button>
                                                  </div>
                                             </div>
                                             <div className="p-3 bg-background/80 backdrop-blur flex items-center justify-center border-t border-border/40">
                                                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2.5 py-1 rounded-sm shadow-inner shrink-0">
                                                     PAGE {page.pageNumber}
                                                 </span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    )
                }
            />
        </>
    );
}
