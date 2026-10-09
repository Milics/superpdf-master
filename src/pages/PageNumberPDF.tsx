import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { addPageNumbers } from '@/lib/pdf-engine';
import { Hash, ArrowRight, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Position = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
type Format = 'number' | 'dash' | 'page-of';

const POSITION_OPTIONS: { value: Position; label: string }[] = [
    { value: 'bottom-center', label: '底部居中' },
    { value: 'bottom-left', label: '底部靠左' },
    { value: 'bottom-right', label: '底部靠右' },
    { value: 'top-center', label: '顶部居中' },
    { value: 'top-left', label: '顶部靠左' },
    { value: 'top-right', label: '顶部靠右' },
];

const FORMAT_OPTIONS: { value: Format; label: string; example: string }[] = [
    { value: 'number', label: '纯数字', example: '1, 2, 3…' },
    { value: 'dash', label: '短线包围', example: '- 1 -, - 2 -…' },
    { value: 'page-of', label: '总数格式', example: '1 / 10, 2 / 10…' },
];

// 封面预览 Hook
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

export function PageNumberPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [position, setPosition] = useState<Position>('bottom-center');
    const [format, setFormat] = useState<Format>('number');
    const [fontSize, setFontSize] = useState(12);
    const [startNumber, setStartNumber] = useState(1);

    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const coverUrl = usePdfCover(file || new File([], ''));

    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length > 0) {
            const f = selectedFiles[0];
            setFile(f);
            // 获取总页数
            try {
                const ab = await f.arrayBuffer();
                const { PDFDocument } = await import('pdf-lib');
                const doc = await PDFDocument.load(ab);
                setTotalPages(doc.getPageCount());
            } catch {
                setTotalPages(0);
            }
        }
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setTotalPages(0);
        setErrorMsg(null);
    };

    const execute = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const res = await addPageNumbers(
                file,
                { position, fontSize, startNumber, format },
                `Numbered_${file.name}`
            );
            setResult(res);
        } catch (err: any) {
            setErrorMsg(err.message || '添加页码失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    // 预览当中显示页码位置的标识指示器
    const getPreviewPageNumber = () => {
        let text: string;
        if (format === 'dash') text = `- ${startNumber} -`;
        else if (format === 'page-of') text = `${startNumber} / ${startNumber + Math.max(totalPages - 1, 0)}`;
        else text = `${startNumber}`;
        return text;
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center py-6 pb-20 overflow-y-auto w-full relative">
                <div className="absolute top-6">
                    <span className="bg-background/80 backdrop-blur px-8 py-2.5 rounded-full shadow-sm border text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        <span>页码位置预览</span>
                    </span>
                </div>

                <div className="flex-1 w-full flex items-center justify-center p-8 mt-12">
                    <div className="relative w-full max-w-sm sm:max-w-md aspect-[1/1.414] bg-white border border-border/50 shadow-2xl flex flex-col items-center justify-center overflow-hidden group transition-all duration-300">
                        {coverUrl ? (
                            <img src={coverUrl} className="w-full h-full object-contain pointer-events-none select-none" alt="文档封面" />
                        ) : (
                            <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900 border flex items-center justify-center">
                                <FileText className="w-16 h-16 text-muted-foreground/20" />
                            </div>
                        )}

                        {/* 页码位置指示叠加层 */}
                        <div className={`absolute pointer-events-none select-none px-4 py-1.5 bg-primary/90 text-primary-foreground rounded-full text-sm font-bold shadow-lg transition-all duration-300 ${
                            position.startsWith('top') ? 'top-4' : 'bottom-4'
                        } ${
                            position.includes('center') ? 'left-1/2 -translate-x-1/2' :
                            position.includes('right') ? 'right-4' : 'left-4'
                        }`}>
                            <span>{getPreviewPageNumber()}</span>
                        </div>
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
                        <div className="bg-purple-50/50 dark:bg-purple-900/10 p-5 rounded-3xl border border-purple-100/50 dark:border-purple-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-purple-900 dark:text-purple-100">
                                <Hash className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                                <span>页码标注控制台</span>
                            </h3>
                            <p className="text-[11px] text-purple-800/70 dark:text-purple-200/70 leading-relaxed font-medium">
                                <span>为每一页自动注入页码。支持自定义起始编号、数字格式和显示位置，完美适配您的排版要求。</span>
                            </p>
                        </div>

                        {totalPages > 0 && (
                            <div className="bg-muted/40 rounded-2xl p-4 border flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase"><span>文档总页数</span></p>
                                    <p className="text-xl font-black text-foreground">{totalPages} <span className="text-xs font-normal text-muted-foreground">页</span></p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6 px-1">
                            {/* 页码格式 */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>页码格式</span></label>
                                <div className="grid grid-cols-1 gap-2">
                                    {FORMAT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setFormat(opt.value)}
                                            className={`text-left p-3.5 rounded-xl border-2 transition-all text-sm ${
                                                format === opt.value
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : 'border-border/50 hover:border-primary/30 bg-background'
                                            }`}
                                        >
                                            <span className="font-bold">{opt.label}</span>
                                            <span className="text-muted-foreground ml-2 text-xs">{opt.example}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 位置 */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>显示位置</span></label>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value as Position)}
                                    className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-bold"
                                >
                                    {POSITION_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 字号 */}
                            <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-muted-foreground uppercase"><span>字号大小</span></label>
                                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{fontSize} px</span>
                                </div>
                                <input
                                    type="range"
                                    min="8"
                                    max="36"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                />
                            </div>

                            {/* 起始页码 */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>起始页码</span></label>
                                <input
                                    type="number"
                                    min={1}
                                    value={startNumber}
                                    onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value)))}
                                    className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-bold text-center"
                                />
                            </div>
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
                        <span>注入页码</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="添加页码"
            description="为 PDF 的每一页自动注入清晰的页码标注，支持多种格式和位置。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="页码注入完毕！"
                        description={`已为全部 ${totalPages} 页成功添加页码标注。`}
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
