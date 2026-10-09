import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { ScanSearch, ArrowRight, Sparkles, Scale, Columns } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pixelmatch from 'pixelmatch';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { PDFDocument, rgb } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function ComparePdf() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    
    // 用来存放比对过程中的预览大图（左右对照）
    const [diffPreviewUrls, setDiffPreviewUrls] = useState<[string, string] | null>(null);

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        if (diffPreviewUrls) {
            URL.revokeObjectURL(diffPreviewUrls[0]);
            URL.revokeObjectURL(diffPreviewUrls[1]);
        }
        setResult(null);
        setDiffPreviewUrls(null);
        setFile1(null);
        setFile2(null);
        setErrorMsg(null);
        setProgress('');
    };

    const execute = async () => {
        if (!file1 || !file2) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('加载并校准双侧文档…');

        try {
            const ab1 = await file1.arrayBuffer();
            const ab2 = await file2.arrayBuffer();

            const pdfDoc1 = await pdfjsLib.getDocument({ data: new Uint8Array(ab1) }).promise;
            const pdfDoc2 = await pdfjsLib.getDocument({ data: new Uint8Array(ab2) }).promise;

            const pagesCount = Math.max(pdfDoc1.numPages, pdfDoc2.numPages);
            
            // 为了生成最终的报告 PDF
            const finalPdf = await PDFDocument.create();

            for (let i = 1; i <= pagesCount; i++) {
                setProgress(`正在比对 第 ${i} / ${pagesCount} 页 …`);
                
                let page1, page2;
                try { page1 = await pdfDoc1.getPage(i); } catch (e) {}
                try { page2 = await pdfDoc2.getPage(i); } catch (e) {}

                // 都拿到 viewport 取最大的以防两边不一样大
                const viewport1 = page1 ? page1.getViewport({ scale: 2 }) : null;
                const viewport2 = page2 ? page2.getViewport({ scale: 2 }) : null;

                const width = Math.max(viewport1?.width || 0, viewport2?.width || 0) || 1200;
                const height = Math.max(viewport1?.height || 0, viewport2?.height || 0) || 1600;

                const canvas1 = document.createElement('canvas');
                const canvas2 = document.createElement('canvas');
                const canvasDiff = document.createElement('canvas');
                
                canvas1.width = width; canvas1.height = height;
                canvas2.width = width; canvas2.height = height;
                canvasDiff.width = width; canvasDiff.height = height;

                const ctx1 = canvas1.getContext('2d')!;
                const ctx2 = canvas2.getContext('2d')!;
                const ctxDiff = canvasDiff.getContext('2d')!;

                // 强制刷白底（避免透明度干扰比对）
                ctx1.fillStyle = '#ffffff'; ctx1.fillRect(0, 0, width, height);
                ctx2.fillStyle = '#ffffff'; ctx2.fillRect(0, 0, width, height);
                
                if (page1) await page1.render({ canvasContext: ctx1, viewport: viewport1! } as any).promise;
                if (page2) await page2.render({ canvasContext: ctx2, viewport: viewport2! } as any).promise;

                const img1 = ctx1.getImageData(0, 0, width, height);
                const img2 = ctx2.getImageData(0, 0, width, height);
                const diffImg = ctxDiff.createImageData(width, height);

                // 执行像素级比对核心逻辑
                setProgress(`正在运行 PixelMatch 分析像素差异 第 ${i} 页 …`);
                
                pixelmatch(img1.data, img2.data, diffImg.data, width, height, { 
                    threshold: 0.1, 
                    diffColor: [255, 0, 0], // 纯红
                    alpha: 0
                });

                setProgress(`正在为 第 ${i} 页生成对比差异红框 …`);
                
                // 基于找出的差异生成外围矩形红框 Cluster 算法
                const diffData = diffImg.data;
                const gridSize = 15; 
                const clusters: { x: number, y: number, maxX: number, maxY: number }[] = [];
                
                for (let y = 0; y < height; y += gridSize) {
                    for (let x = 0; x < width; x += gridSize) {
                        let hasDiff = false;
                        for (let dy = 0; dy < gridSize && y + dy < height; dy += 3) {
                            for (let dx = 0; dx < gridSize && x + dx < width; dx += 3) {
                                const idx = ((y + dy) * width + (x + dx)) * 4;
                                if (diffData[idx] === 255 && diffData[idx+1] === 0 && diffData[idx+2] === 0 && diffData[idx+3] !== 0) {
                                    hasDiff = true; break;
                                }
                            }
                            if (hasDiff) break;
                        }
                        
                        // 若找出了差异网格，聚类生成大框
                        if (hasDiff) {
                            let cx = x + gridSize / 2;
                            let cy = y + gridSize / 2;
                            let merged = false;
                            for (let c of clusters) {
                                // 距离在 150px 范围内的错误框会合并为一个大框
                                if (cx >= c.x - 150 && cx <= c.maxX + 150 && cy >= c.y - 150 && cy <= c.maxY + 150) {
                                    c.x = Math.min(c.x, x);
                                    c.maxX = Math.max(c.maxX, x + gridSize);
                                    c.y = Math.min(c.y, y);
                                    c.maxY = Math.max(c.maxY, y + gridSize);
                                    merged = true; break;
                                }
                            }
                            if (!merged) {
                                clusters.push({ x, y, maxX: x + gridSize, maxY: y + gridSize });
                            }
                        }
                    }
                }

                // 在画布 1 和画布 2 的同一个位置画出标红边框
                [ctx1, ctx2].forEach(ctx => {
                    ctx.strokeStyle = '#e53935'; // 红色边框
                    ctx.lineWidth = 4;
                    // 画个微透的背景更易于看清
                    ctx.fillStyle = 'rgba(229, 57, 53, 0.08)'; 
                    clusters.forEach(c => {
                        const padding = 15;
                        const bx = Math.max(0, c.x - padding);
                        const by = Math.max(0, c.y - padding);
                        const bw = c.maxX - c.x + padding * 2;
                        const bh = c.maxY - c.y + padding * 2;
                        ctx.fillRect(bx, by, bw, bh);
                        ctx.strokeRect(bx, by, bw, bh);
                    });
                });

                // 呈现预览图 (仅显示第一页，两张图并排)
                if (i === 1) {
                    const blob1 = await new Promise<Blob>(resolve => canvas1.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
                    const blob2 = await new Promise<Blob>(resolve => canvas2.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
                    setDiffPreviewUrls([URL.createObjectURL(blob1), URL.createObjectURL(blob2)]);
                }

                // 出包 PDF：做成一张两倍宽的横切页并排对比
                const finalWidth = width * 2 + 50; // 中间留白 50
                const newPage = finalPdf.addPage([finalWidth, height]);
                
                const imgData1 = canvas1.toDataURL('image/jpeg', 0.9);
                const imgData2 = canvas2.toDataURL('image/jpeg', 0.9);
                const pdfImg1 = await finalPdf.embedJpg(imgData1);
                const pdfImg2 = await finalPdf.embedJpg(imgData2);
                
                // 画线区隔
                newPage.drawLine({ start: { x: width + 25, y: 0 }, end: { x: width + 25, y: height }, thickness: 2, color: rgb(0.8, 0.8, 0.8) });

                newPage.drawImage(pdfImg1, { x: 0, y: 0, width: width, height: height });
                newPage.drawImage(pdfImg2, { x: width + 50, y: 0, width: width, height: height });
            }

            setProgress('正在打包差异报告文件…');
            const finalBytes = await finalPdf.save();
            const blob = new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            setResult({ url, filename: `DiffReport_${file1.name}` });
            setProgress('');

        } catch (err: any) {
            setErrorMsg(err.message || '比对过程中出现严重失配或文件损坏。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (diffPreviewUrls) {
            return (
                <div className="flex-1 flex flex-col h-full bg-muted/10 items-center justify-center p-8 overflow-hidden">
                    <p className="text-sm font-bold text-muted-foreground mb-4 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-red-500" />
                        分析完毕 - 左右对照视图 (第 1 页示例)
                    </p>
                    <div className="flex gap-4 w-full justify-center max-h-[75vh]">
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold uppercase mb-2">文件 A (原件)</span>
                            <img src={diffPreviewUrls[0]} alt="Original" className="max-h-[65vh] object-contain shadow-xl rounded border bg-white" />
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[10px] font-bold uppercase mb-2">文件 B (修改后)</span>
                            <img src={diffPreviewUrls[1]} alt="Modified" className="max-h-[65vh] object-contain shadow-xl rounded border bg-white" />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950/20">
                <div className="w-full max-w-2xl space-y-8">
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-2xl font-bold text-foreground inline-flex items-center">
                            <Columns className="w-6 h-6 mr-3 text-red-500" /> 装载比对数据槽
                        </h2>
                        <p className="text-sm text-muted-foreground">请在两侧分别上传作为参照物的『原件』与被检查的『修改件』</p>
                    </div>

                    <div className="flex gap-6 items-stretch">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">📄 参照原件 (A)</p>
                            {file1 ? (
                                <div className="h-[200px] border-2 border-primary/50 bg-primary/5 rounded-2xl flex flex-col items-center justify-center p-4 relative group">
                                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                                        <b className="text-primary text-xl">A</b>
                                    </div>
                                    <p className="text-sm font-bold truncate w-full text-center">{file1.name}</p>
                                    <button onClick={() => setFile1(null)} className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 px-2 py-1 rounded">移除</button>
                                </div>
                            ) : (
                                <FileDropzone 
                                    className="min-h-[200px]" 
                                    title="放入原件" description="或点击上传" multiple={false}
                                    onFilesSelected={(f) => setFile1(f[0])} />
                            )}
                        </div>

                        <div className="w-12 flex items-center justify-center shrink-0">
                            <Scale className="w-8 h-8 text-muted-foreground/30" />
                        </div>

                        <div className="flex-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">📝 修改/复印件 (B)</p>
                            {file2 ? (
                                <div className="h-[200px] border-2 border-emerald-500/50 bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center p-4 relative group">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                                        <b className="text-emerald-600 text-xl">B</b>
                                    </div>
                                    <p className="text-sm font-bold truncate w-full text-center">{file2.name}</p>
                                    <button onClick={() => setFile2(null)} className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 px-2 py-1 rounded">移除</button>
                                </div>
                            ) : (
                                <FileDropzone 
                                    className="min-h-[200px]" 
                                    title="放入修改件" description="或点击上传" multiple={false}
                                    onFilesSelected={(f) => setFile2(f[0])} />
                            )}
                        </div>
                    </div>
                </div>

                {progress && (
                    <div className="mt-8 bg-red-50 text-red-700 text-xs font-bold px-4 py-2.5 rounded-full shadow border border-red-200 animate-pulse transition-all">
                        <span>{progress}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4 h-full flex flex-col">
                    <div className="bg-red-50/50 dark:bg-red-900/10 p-5 rounded-3xl border border-red-100/50 dark:border-red-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-red-900 dark:text-red-100">
                            <ScanSearch className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                            <span>X 射线级像素扫描</span>
                        </h3>
                        <p className="text-[11px] text-red-800/70 dark:text-red-200/70 leading-relaxed font-medium">
                            <span>放弃不靠谱的文字流重排对比。这项功能会将两个文档同时光栅化为超清图元，并进行极其严苛的像素叠加比对（PixelMatch）。任意微小改动、像素偏移和涂抹痕迹都会被刺眼的红色高亮彻底曝光。</span>
                        </p>
                    </div>

                    <div className="flex-1 flex items-center justify-center opacity-30 pointer-events-none">
                       <ScanSearch className="w-32 h-32" />
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                {!result && (
                    <Button
                        size="lg"
                        onClick={execute}
                        disabled={isProcessing || !file1 || !file2}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>开始像素对比</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                )}
                {result && (
                     <div className="flex w-full gap-3">
                         <Button size="lg" variant="outline" onClick={handleReset} className="h-16 flex-1 rounded-2xl font-bold text-base">重置比对</Button>
                         <a href={result.url} download={result.filename} className="block flex-[2]">
                             <Button size="lg" className="w-full h-16 text-lg rounded-2xl font-bold bg-[#E53935] hover:bg-[#D32F2F] text-white">下载红标排查报告 PDF</Button>
                         </a>
                     </div>
                )}
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="像素级比较 PDF"
            description="并排上传原始文档和被修改过的副本。系统会在本地完成图像点阵扫描并生成一份醒目红区高亮的差异找茬报告。"
            fileCount={file1 && file2 ? 2 : 0}
            onFilesSelected={() => {}} // 禁用兜底拖拽
            hideDropzone={true}        // 使用我们上面写好的左右双列装载 UI
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
        />
    );
}
