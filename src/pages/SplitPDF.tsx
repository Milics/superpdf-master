import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/Button';
import { splitPDF, splitPDFToMultiple, type PdfRange } from '@/lib/pdf-engine';
import { X, FileText, Download, RotateCcw, CheckCircle2, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as PDFLib from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// 初始化 pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// 独立指定真实页码封面提取器
function usePdfPage(file: File, pageNum: number) {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const objectUrl = URL.createObjectURL(file);
        
        pdfjsLib.getDocument(objectUrl).promise.then(async (pdf) => {
            if (!active) return;
            const pdfPageNum = Math.max(1, Math.min(pageNum, pdf.numPages));
            const page = await pdf.getPage(pdfPageNum);
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
        }).catch((e) => {
            console.warn('PDF预览失败', e);
            URL.revokeObjectURL(objectUrl);
        });
        
        return () => { active = false; };
    }, [file, pageNum]);

    return coverUrl;
}

// 可视化片段图示组件
function RangePreview({ file, range, idx }: { file: File, range: PdfRange, idx: number }) {
    const startCover = usePdfPage(file, range.start);
    const endCover = usePdfPage(file, range.end);
    
    return (
        <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground bg-background/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-border/50 uppercase tracking-wider">
                范围 {idx + 1}
            </span>
            <div className="flex items-center gap-3 sm:gap-6 bg-card/80 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-border/50 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
                {/* 虚拟画板 - 左侧起始页 */}
                <div className="flex flex-col items-center transition-all">
                    <div className="w-24 sm:w-32 aspect-[1/1.414] bg-muted/40 rounded-xl border flex items-center justify-center overflow-hidden mb-3 shadow-md">
                        {startCover ? (
                            <img src={startCover} alt={`Page ${range.start}`} className="w-full h-full object-contain bg-white dark:bg-zinc-100" />
                        ) : (
                            <FileText className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                        )}
                    </div>
                    <span className="text-xs font-bold bg-muted px-2.5 py-1 rounded text-muted-foreground">{range.start}</span>
                </div>
                
                {/* 虚拟画板 - 中间省略标点 */}
                {range.start !== range.end && (
                    <div className="flex space-x-1.5 text-muted-foreground/50 px-2 mt-[-2rem]">
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></div>
                    </div>
                )}

                {/* 虚拟画板 - 右侧结束页 */}
                {range.start !== range.end && (
                    <div className="flex flex-col items-center transition-all">
                        <div className="w-24 sm:w-32 aspect-[1/1.414] bg-muted/40 rounded-xl border flex items-center justify-center overflow-hidden mb-3 shadow-md">
                            {endCover ? (
                                <img src={endCover} alt={`Page ${range.end}`} className="w-full h-full object-contain bg-white dark:bg-zinc-100" />
                            ) : (
                                <FileText className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                            )}
                        </div>
                        <span className="text-xs font-bold bg-muted px-2.5 py-1 rounded text-muted-foreground">{range.end}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// 提取成功 - 输出结果展示组件
function SuccessState({ results, mergeAll, onReset }: { results: {url: string, filename: string}[], mergeAll: boolean, onReset: () => void }) {
    const handleDownloadAll = () => {
        results.forEach((res, idx) => {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = res.url;
                a.download = res.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, idx * 400); // 错开下载队列，防浏览器拦截安全策略
        });
    };

    return (
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500">
            <Card className="w-full shadow-2xl border-emerald-500/30 bg-emerald-500/5 rounded-3xl overflow-hidden glass">
                <CardContent className="p-10 text-center space-y-8">
                    <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">提取成功！</h2>
                        <p className="text-muted-foreground text-lg">
                            已成功完成 PDF 指定页面片段的切分
                        </p>
                    </div>

                    <div className="bg-background/80 rounded-2xl p-4 border shadow-sm max-w-md mx-auto flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left overflow-hidden flex-1">
                            <p className="text-sm font-bold truncate">
                                {results.length === 1 ? results[0].filename : `共单独生成 ${results.length} 份文件`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {mergeAll ? '独立片段已无缝合并拼接为一个完整的阅读器文件' : '每个范围都被独立的切分为了单一档案'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button 
                            size="lg" 
                            onClick={handleDownloadAll} 
                            className="h-14 text-lg rounded-xl shadow-xl shadow-primary/20 gap-2 px-8"
                        >
                            <Download className="h-5 w-5" /> {results.length > 1 ? `打包下载全部 (${results.length})` : '下载提取的 PDF'}
                        </Button>
                        <Button 
                            size="lg" 
                            variant="outline" 
                            onClick={onReset} 
                            className="h-14 text-lg rounded-xl gap-2 px-8 bg-background/50 hover:bg-background/80"
                        >
                            <RotateCcw className="h-5 w-5" /> 拆分其它文件
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// 主页面渲染入口
export function SplitPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState<number | null>(null);

    const [ranges, setRanges] = useState<PdfRange[]>([{ start: 1, end: 1 }]);
    const [mergeAll, setMergeAll] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [results, setResults] = useState<{ url: string; filename: string }[] | null>(null);

    useEffect(() => {
        return () => {
            if (results) {
                results.forEach(r => URL.revokeObjectURL(r.url));
            }
        };
    }, [results]);

    const handleFilesSelected = async (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) return;
        setErrorMsg(null);
        const selected = selectedFiles[0];

        try {
            const arrayBuffer = await selected.arrayBuffer();
            const loadedPdf = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = loadedPdf.getPageCount();
            setTotalPages(pages);
            setRanges([{ start: 1, end: pages }]);
            setFile(selected);
        } catch (err) {
            setErrorMsg("无法读取或解析此 PDF，可能是被加密阻止或损坏。");
        }
    };

    const handleReset = () => {
        if (results) results.forEach(r => URL.revokeObjectURL(r.url));
        setResults(null);
        setFile(null);
        setTotalPages(null);
        setRanges([{ start: 1, end: 1 }]);
        setErrorMsg(null);
        setMergeAll(false);
    };

    const updateRange = (index: number, field: keyof PdfRange, value: number) => {
        const newRanges = [...ranges];
        const val = Math.max(1, value); // 防止负数
        newRanges[index][field] = val;
        setRanges(newRanges);
    };

    const addRange = () => {
        setRanges([...ranges, { start: 1, end: totalPages || 1 }]);
    };

    const removeRange = (index: number) => {
        setRanges(ranges.filter((_, i) => i !== index));
    };

    const executeSplit = async () => {
        if (!file || !totalPages) return;
        
        // 校验 ranges
        for (const r of ranges) {
            if (r.start < 1 || r.start > r.end || r.end > totalPages) {
                setErrorMsg(`页码设定有误: 提取范围区间 [${r.start} - ${r.end}] 无法被正确识别。`);
                return;
            }
        }

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            if (mergeAll) { // 所有选中范围提取完后，合并下载成一个单文件
                const res = await splitPDF(file, ranges, `Extracted_${file.name}`);
                setResults([res]);
            } else { // 选中范围分别导出多个源文件
                const resArray = await splitPDFToMultiple(file, ranges);
                setResults(resArray);
            }
        } catch (err: any) {
            setErrorMsg(err.message || '拆卸出错，详情请看控制台。');
        } finally {
            setIsProcessing(false);
        }
    };

    if (results) {
        return (
            <div className="w-[100vw] h-[calc(100vh-64px)] relative left-1/2 right-1/2 -mx-[50vw] -my-8 bg-zinc-50 dark:bg-zinc-950/20 flex overflow-y-auto">
                <SuccessState results={results} mergeAll={mergeAll} onReset={handleReset} />
            </div>
        );
    }

    if (!file || totalPages === null) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 mt-[10vh] mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">拆分 PDF</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        从大型文件内只抽取出你需要的那些页。或者将它们分为各自独立的小份文档。
                    </p>
                </div>

                <Card className="glass shadow-xl border-primary/20 rounded-3xl overflow-hidden">
                    <CardContent className="pt-6 pb-6">
                        <FileDropzone
                            onFilesSelected={handleFilesSelected}
                            accept="application/pdf"
                            multiple={false}
                            title="选择并上传要拆分的源文件"
                            description="支持拖入上传。系统将自动解析您的文件，提供所见即所得的范围提取画板。"
                        />
                    </CardContent>
                </Card>
                
                <div className="text-center">
                     <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors gap-2 bg-muted/50 px-4 py-2 rounded-full">
                        <ArrowLeft className="h-4 w-4" /> 返回主菜单
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[100vw] h-[calc(100vh-64px)] relative left-1/2 right-1/2 -mx-[50vw] -my-8 bg-background flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500 z-10">
            {/* 左侧工作区：范围可视化画板 */}
            <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/40 relative flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
                    <div className="w-full max-w-3xl space-y-10 py-[5vh] pb-20">
                        {ranges.map((range, idx) => (
                            <RangePreview key={idx} file={file} range={range} idx={idx} />
                        ))}
                    </div>
                </div>
            </div>

            {/* 右侧属性面板栏 */}
            <div className="w-full md:w-[350px] lg:w-[400px] shrink-0 bg-background border-l border-border/40 flex flex-col h-[480px] md:h-full shadow-[0_0_20px_rgba(0,0,0,0.05)] z-40 relative md:static bottom-0 mt-auto md:mt-0">
                <div className="p-8 pb-4 hidden md:block">
                    <h2 className="text-3xl font-bold text-center tracking-tight">拆分 PDF</h2>
                </div>
                
                <div className="px-6 py-2 pb-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        {ranges.map((r, i) => (
                            <div key={i} className="flex relative items-center justify-between gap-2 bg-muted/40 dark:bg-zinc-900/50 p-5 rounded-2xl border border-border/60 transition-colors hover:border-primary/30 group">
                                <div className="flex flex-col space-y-2 w-full pr-8">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                        范围 {i + 1}
                                    </label>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex flex-col relative w-full">
                                            <span className="text-[10px] text-muted-foreground mb-1 ml-1 opacity-70">起始面</span>
                                            <input 
                                                type="number" 
                                                min={1} 
                                                max={r.end} 
                                                value={r.start} 
                                                onChange={(e) => updateRange(i, 'start', Number(e.target.value))} 
                                                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-center text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                                            />
                                        </div>
                                        <span className="text-muted-foreground/40 mt-5">-</span>
                                        <div className="flex flex-col relative w-full">
                                            <span className="text-[10px] text-muted-foreground mb-1 ml-1 opacity-70">结束面</span>
                                            <input 
                                                type="number" 
                                                min={r.start} 
                                                max={totalPages} 
                                                value={r.end} 
                                                onChange={(e) => updateRange(i, 'end', Number(e.target.value))} 
                                                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-center text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {ranges.length > 1 && (
                                    <button 
                                        onClick={() => removeRange(i)} 
                                        className="absolute right-3 top-[-8px] md:top-3 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-background border rounded-full shadow-sm transition-all md:opacity-0 md:group-hover:opacity-100" 
                                        title="移除该范围"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button 
                        variant="ghost" 
                        onClick={addRange} 
                        className="w-full border-dashed border-2 bg-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground py-6 my-6 rounded-2xl transition-all"
                    >
                        <Plus className="w-5 h-5 mr-2" /> 添加要抠取的 PDF 范围
                    </Button>

                    <label className="flex items-center space-x-3 text-sm cursor-pointer bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/50 transition-colors hover:bg-blue-50">
                        <input 
                            type="checkbox" 
                            checked={mergeAll} 
                            onChange={e => setMergeAll(e.target.checked)} 
                            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-5 h-5 shrink-0" 
                        />
                        <span className="font-medium leading-relaxed">
                            我想将所有提取出的范围拼接到一个 PDF 文件中。
                        </span>
                    </label>

                    {errorMsg && (
                        <div className="mt-6 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm p-4 rounded-xl flex items-start border border-red-200/50 dark:border-red-900/50 shadow-sm animate-in zoom-in-95 duration-200">
                            <span className="shrink-0 mr-2 opacity-80 mt-0.5">⚠️</span>
                            <p>{errorMsg}</p>
                        </div>
                    )}
                </div>
                
                <div className="p-6 md:p-8 bg-background/90 backdrop-blur sticky bottom-0 border-t border-border/40 md:border-t-0 pb-10 md:pb-8">
                    <Button 
                        size="lg" 
                        onClick={executeSplit}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        拆分 PDF <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
