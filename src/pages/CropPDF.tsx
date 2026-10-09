import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Crop, ArrowRight, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
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
        }).catch(() => URL.revokeObjectURL(objectUrl));
        return () => { active = false; };
    }, [file]);
    return coverUrl;
}

export function CropPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

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
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setMargins({ top: 0, right: 0, bottom: 0, left: 0 });
        setErrorMsg(null);
    };

    const execute = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const ab = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);
            const pages = pdfDoc.getPages();

            for (const page of pages) {
                const { width, height } = page.getSize();
                // 设置 CropBox 来裁剪边距（单位：PDF points, 1pt ≈ 0.353mm）
                const cropTop = (margins.top / 100) * height;
                const cropBottom = (margins.bottom / 100) * height;
                const cropLeft = (margins.left / 100) * width;
                const cropRight = (margins.right / 100) * width;

                page.setCropBox(
                    cropLeft,
                    cropBottom,
                    width - cropLeft - cropRight,
                    height - cropTop - cropBottom
                );
            }

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResult({ url: URL.createObjectURL(blob), filename: `Cropped_${file.name}` });
        } catch (err: any) {
            setErrorMsg(err.message || '裁剪失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    const hasAnyCrop = margins.top > 0 || margins.right > 0 || margins.bottom > 0 || margins.left > 0;

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center py-6 pb-20 overflow-y-auto w-full relative">
                <div className="absolute top-6">
                    <span className="bg-background/80 backdrop-blur px-8 py-2.5 rounded-full shadow-sm border text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        <span>裁剪预览</span>
                    </span>
                </div>

                <div className="flex-1 w-full flex items-center justify-center p-8 mt-12">
                    <div className="relative w-full max-w-sm sm:max-w-md aspect-[1/1.414] bg-white border border-border/50 shadow-2xl flex items-center justify-center overflow-hidden">
                        {coverUrl ? (
                            <img src={coverUrl} className="w-full h-full object-contain pointer-events-none select-none" alt="文档封面" />
                        ) : (
                            <FileText className="w-16 h-16 text-muted-foreground/20" />
                        )}

                        {/* 裁剪遮罩叠加层 */}
                        {hasAnyCrop && (
                            <>
                                {/* 上 */}
                                <div className="absolute top-0 left-0 right-0 bg-red-500/25 border-b-2 border-dashed border-red-500 pointer-events-none transition-all duration-200"
                                    style={{ height: `${margins.top}%` }} />
                                {/* 下 */}
                                <div className="absolute bottom-0 left-0 right-0 bg-red-500/25 border-t-2 border-dashed border-red-500 pointer-events-none transition-all duration-200"
                                    style={{ height: `${margins.bottom}%` }} />
                                {/* 左 */}
                                <div className="absolute top-0 left-0 bottom-0 bg-red-500/25 border-r-2 border-dashed border-red-500 pointer-events-none transition-all duration-200"
                                    style={{ width: `${margins.left}%`, top: `${margins.top}%`, bottom: `${margins.bottom}%` }} />
                                {/* 右 */}
                                <div className="absolute top-0 right-0 bottom-0 bg-red-500/25 border-l-2 border-dashed border-red-500 pointer-events-none transition-all duration-200"
                                    style={{ width: `${margins.right}%`, top: `${margins.top}%`, bottom: `${margins.bottom}%` }} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4">
                    <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-3xl border border-orange-100/50 dark:border-orange-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-orange-900 dark:text-orange-100">
                            <Crop className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                            <span>边距裁剪控制</span>
                        </h3>
                        <p className="text-[11px] text-orange-800/70 dark:text-orange-200/70 leading-relaxed font-medium">
                            <span>调整四边的裁剪比例来切除多余的白边或水印区域。红色遮罩区域将被裁掉。</span>
                        </p>
                    </div>

                    <div className="space-y-5 px-1">
                        {(['top', 'bottom', 'left', 'right'] as const).map(side => {
                            const labels = { top: '上边距', bottom: '下边距', left: '左边距', right: '右边距' };
                            return (
                                <div key={side} className="space-y-2 bg-muted/30 p-4 rounded-2xl border border-border/40">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-muted-foreground uppercase"><span>{labels[side]}</span></label>
                                        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{margins[side]}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        value={margins[side]}
                                        onChange={(e) => setMargins(prev => ({ ...prev, [side]: Number(e.target.value) }))}
                                        className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing || !hasAnyCrop}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>裁剪 PDF</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="裁剪 PDF"
            description="裁掉 PDF 每一页四周不需要的白边或特定区域，精确到百分比。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="裁剪完毕！"
                        description="所有页面已按指定比例完成边距裁切。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
