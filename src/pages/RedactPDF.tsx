import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { EyeOff, ArrowRight, RotateCcw } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface RedactRect {
    x: number; y: number; w: number; h: number; // 百分比坐标 (0-1)
}

export function RedactPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
    const [rects, setRects] = useState<RedactRect[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentRect, setCurrentRect] = useState<{ sx: number; sy: number } | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    // 渲染首页封面
    useEffect(() => {
        if (!file) return;
        let active = true;
        const objectUrl = URL.createObjectURL(file);
        pdfjsLib.getDocument(objectUrl).promise.then(async (pdf) => {
            if (!active) return;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.6 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: ctx, viewport } as any).promise;
                if (active) setCoverUrl(canvas.toDataURL('image/jpeg', 0.8));
            }
            URL.revokeObjectURL(objectUrl);
        }).catch(() => URL.revokeObjectURL(objectUrl));

        // 获取真实页面尺寸
        file.arrayBuffer().then(async ab => {
            const doc = await PDFDocument.load(ab);
            const p = doc.getPages()[0];
            if (active) setPageSize(p.getSize());
        });

        return () => { active = false; };
    }, [file]);

    const getRelativePos = (e: React.MouseEvent) => {
        const el = previewRef.current;
        if (!el) return { rx: 0, ry: 0 };
        const rect = el.getBoundingClientRect();
        return { rx: (e.clientX - rect.left) / rect.width, ry: (e.clientY - rect.top) / rect.height };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const { rx, ry } = getRelativePos(e);
        setIsDrawing(true);
        setCurrentRect({ sx: rx, sy: ry });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !currentRect) return;
        const { rx, ry } = getRelativePos(e);
        // 实时更新临时矩形（通过 state 驱动 UI）
        const tempRect: RedactRect = {
            x: Math.min(currentRect.sx, rx),
            y: Math.min(currentRect.sy, ry),
            w: Math.abs(rx - currentRect.sx),
            h: Math.abs(ry - currentRect.sy),
        };
        // 更新最后一个临时矩形
        setRects(prev => {
            const base = prev.filter(r => !(r as any).__temp);
            return [...base, { ...tempRect, __temp: true } as any];
        });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDrawing || !currentRect) return;
        setIsDrawing(false);
        const { rx, ry } = getRelativePos(e);
        const finalRect: RedactRect = {
            x: Math.min(currentRect.sx, rx),
            y: Math.min(currentRect.sy, ry),
            w: Math.abs(rx - currentRect.sx),
            h: Math.abs(ry - currentRect.sy),
        };
        // 过滤掉太小的误触矩形
        if (finalRect.w > 0.01 && finalRect.h > 0.01) {
            setRects(prev => [...prev.filter(r => !(r as any).__temp), finalRect]);
        } else {
            setRects(prev => prev.filter(r => !(r as any).__temp));
        }
        setCurrentRect(null);
    };

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        setRects([]);
        if (selectedFiles.length > 0) setFile(selectedFiles[0]);
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setRects([]);
        setCoverUrl(null);
        setPageSize(null);
        setErrorMsg(null);
    };

    const execute = async () => {
        if (!file || !pageSize || rects.length === 0) {
            setErrorMsg('请先在画板上用鼠标框选需要涂黑的区域。');
            return;
        }
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const ab = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);
            const firstPage = pdfDoc.getPages()[0];
            const { width, height } = firstPage.getSize();

            const realRects = rects.filter(r => !(r as any).__temp);
            for (const r of realRects) {
                // 将百分比坐标转换为 PDF 坐标（注意 PDF 坐标 y 从底向上）
                firstPage.drawRectangle({
                    x: r.x * width,
                    y: height - (r.y + r.h) * height,
                    width: r.w * width,
                    height: r.h * height,
                    color: rgb(0, 0, 0),
                });
            }

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResult({ url: URL.createObjectURL(blob), filename: `Redacted_${file.name}` });
        } catch (err: any) {
            setErrorMsg(err.message || '涂黑失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center py-6 pb-20 overflow-y-auto w-full relative">
                <div className="absolute top-6 z-20">
                    <span className="bg-background/80 backdrop-blur px-8 py-2.5 rounded-full shadow-sm border text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        <span>拖选涂黑区域（首页）</span>
                    </span>
                </div>

                <div className="flex-1 w-full flex items-center justify-center p-8 mt-12">
                    <div
                        ref={previewRef}
                        className="relative w-full max-w-sm sm:max-w-md aspect-[1/1.414] bg-white border border-border/50 shadow-2xl overflow-hidden cursor-crosshair select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => { if (isDrawing) handleMouseUp({} as any); }}
                    >
                        {coverUrl ? (
                            <img src={coverUrl} className="w-full h-full object-contain pointer-events-none" alt="文档封面" />
                        ) : (
                            <div className="w-full h-full bg-zinc-50 flex items-center justify-center">
                                <EyeOff className="w-16 h-16 text-muted-foreground/20" />
                            </div>
                        )}

                        {/* 涂黑矩形叠加层 */}
                        {rects.map((r, i) => (
                            <div key={i} className={`absolute bg-black pointer-events-none transition-opacity ${(r as any).__temp ? 'opacity-50' : 'opacity-90'}`}
                                style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4">
                    <div className="bg-zinc-100/80 dark:bg-zinc-800/30 p-5 rounded-3xl border border-zinc-200/50 dark:border-zinc-700/30">
                        <h3 className="text-sm font-bold flex items-center mb-2">
                            <EyeOff className="w-5 h-5 mr-2 text-zinc-600 dark:text-zinc-400" />
                            <span>隐私涂黑工具</span>
                        </h3>
                        <p className="text-[11px] text-zinc-600/70 dark:text-zinc-300/70 leading-relaxed font-medium">
                            <span>在左侧画板上用鼠标拖选需要涂黑的敏感区域。黑色矩形将永久覆盖该位置的原始内容，确保不可逆的隐私保护。</span>
                        </p>
                    </div>

                    <div className="bg-muted/40 rounded-2xl p-4 border flex items-center justify-between px-5">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase"><span>已框选区</span></p>
                            <p className="text-xl font-black text-foreground">{rects.filter(r => !(r as any).__temp).length} <span className="text-xs font-normal text-muted-foreground">块</span></p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setRects([])} className="rounded-xl gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" /> <span>清除所有</span>
                        </Button>
                    </div>

                    <ToolWorkspace.Alert type="warning">
                        <span>涂黑操作不可逆。黑色矩形会直接绘制在 PDF 底层内容之上，被覆盖的文字或图片将无法恢复。</span>
                    </ToolWorkspace.Alert>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing || rects.filter(r => !(r as any).__temp).length === 0}
                    isLoading={isProcessing}
                    className="w-full bg-zinc-900 hover:bg-black text-white shadow-xl shadow-zinc-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>涂黑并导出</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="涂黑 PDF"
            description="不可逆地永久遮盖敏感信息，直接在画面上拖选即可。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="涂黑完成！"
                        description="敏感区域已被永久覆盖，无法被任何工具恢复。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
