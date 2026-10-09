import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { FileInput, ArrowRight, Eraser, Pen } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export function SignPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#1a1a1a');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    // 初始化画布
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // 高清屏适配
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = penColor;
        ctxRef.current = ctx;
    }, [file]);

    // 更新笔色
    useEffect(() => {
        if (ctxRef.current) {
            ctxRef.current.strokeStyle = penColor;
        }
    }, [penColor]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getPos(e);
        ctxRef.current?.beginPath();
        ctxRef.current?.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        ctxRef.current?.lineTo(x, y);
        ctxRef.current?.stroke();
    };

    const endDraw = () => {
        setIsDrawing(false);
        // 保存签名为 dataUrl
        if (canvasRef.current) {
            setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !ctxRef.current) return;
        const rect = canvas.getBoundingClientRect();
        ctxRef.current.clearRect(0, 0, rect.width, rect.height);
        setSignatureDataUrl(null);
    };

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length > 0) setFile(selectedFiles[0]);
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setSignatureDataUrl(null);
        setErrorMsg(null);
    };

    const execute = async () => {
        if (!file || !signatureDataUrl) {
            setErrorMsg('请先在画板上手写您的签名。');
            return;
        }
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const ab = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);
            const pngBytes = await fetch(signatureDataUrl).then(r => r.arrayBuffer());
            const signatureImage = await pdfDoc.embedPng(pngBytes);

            // 在第一页右下角嵌入签名
            const firstPage = pdfDoc.getPages()[0];
            const { width } = firstPage.getSize();
            const sigWidth = 200;
            const sigHeight = sigWidth * (signatureImage.height / signatureImage.width);
            
            firstPage.drawImage(signatureImage, {
                x: width - sigWidth - 40,
                y: 40,
                width: sigWidth,
                height: sigHeight,
                opacity: 0.95,
            });

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResult({ url: URL.createObjectURL(blob), filename: `Signed_${file.name}` });
        } catch (err: any) {
            setErrorMsg(err.message || '签名嵌入失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 space-y-6 overflow-y-auto">
                <div className="bg-background/80 backdrop-blur px-6 py-2 rounded-full shadow-sm border">
                    <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">手写签名画板</span>
                </div>

                {/* 签名画布 */}
                <div className="w-full max-w-xl bg-white dark:bg-zinc-100 rounded-3xl border-2 border-dashed border-primary/30 shadow-xl overflow-hidden relative">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-48 sm:h-56 cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={endDraw}
                        onMouseLeave={endDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={endDraw}
                    />
                    {!signatureDataUrl && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-zinc-300 dark:text-zinc-400 text-lg font-bold flex items-center gap-2">
                                <Pen className="w-5 h-5" /> <span>在此处手写签名</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* 工具栏 */}
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={clearCanvas} className="rounded-xl gap-1.5">
                        <Eraser className="w-4 h-4" /> <span>擦除重写</span>
                    </Button>
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase"><span>墨色</span></span>
                        {['#1a1a1a', '#1e40af', '#dc2626'].map(c => (
                            <button
                                key={c}
                                onClick={() => setPenColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${penColor === c ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* 签名预览 */}
                {signatureDataUrl && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-200/50 text-center">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2"><span>✅ 签名已捕获，将嵌入首页右下角</span></p>
                        <img src={signatureDataUrl} alt="签名预览" className="h-12 mx-auto object-contain opacity-80" />
                    </div>
                )}
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4">
                    <div className="bg-rose-50/50 dark:bg-rose-900/10 p-5 rounded-3xl border border-rose-100/50 dark:border-rose-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-rose-900 dark:text-rose-100">
                            <FileInput className="w-5 h-5 mr-2 text-rose-600 dark:text-rose-400" />
                            <span>电子签名</span>
                        </h3>
                        <p className="text-[11px] text-rose-800/70 dark:text-rose-200/70 leading-relaxed font-medium">
                            <span>在左侧画板上使用鼠标或手指自由手写您的签名，系统会自动捕获并以高保真嵌入到文档首页的右下角。</span>
                        </p>
                    </div>

                    <ToolWorkspace.Alert type="info">
                        <span>签名将以无损 PNG 格式嵌入 PDF 首页右下角。如需调整位置，后续版本将支持拖放定位。</span>
                    </ToolWorkspace.Alert>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing || !signatureDataUrl}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>嵌入签名</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="签署 PDF"
            description="在画板上手写您的签名，一键嵌入到文档中，合法又高保真。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="签名已嵌入！"
                        description="您的手写签名已被安全地合成进文档中。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
