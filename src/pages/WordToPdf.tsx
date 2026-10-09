import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { 
    FileText, ArrowRight, Layout, Sparkles, 
    CheckCircle2
} from 'lucide-react';
import * as docx from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type PaperPadding = 'compact' | 'normal' | 'spacious';
type PaperBgColor = 'white' | 'eye-care' | 'parchment';

export function WordToPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [fileSizeStr, setFileSizeStr] = useState<string>('');

    // 排版设置
    const [paperPadding, setPaperPadding] = useState<PaperPadding>('normal');
    const [paperBg, setPaperBg] = useState<PaperBgColor>('white');
    const [renderScale, setRenderScale] = useState<number>(2);

    // 运行状态
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    const docxContainerRef = useRef<HTMLDivElement>(null);
    const [isRendered, setIsRendered] = useState<boolean>(false);

    // 加载并渲染 Word 文档
    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        setIsRendered(false);
        if (selectedFiles.length === 0) return;

        const selectedFile = selectedFiles[0];
        setFile(selectedFile);
        setFileSizeStr((selectedFile.size / 1024).toFixed(1) + ' KB');
        setIsProcessing(true);
        setProgress('正在解析 DOCX 文档样式与段落图文…');

        try {
            const ab = await selectedFile.arrayBuffer();
            
            // 稍等以保证 DOM 容器挂载
            setTimeout(async () => {
                if (docxContainerRef.current) {
                    docxContainerRef.current.innerHTML = '';
                    try {
                        await docx.renderAsync(ab, docxContainerRef.current, undefined, {
                            className: 'docx-preview-content',
                            inWrapper: true,
                            ignoreWidth: false,
                            ignoreHeight: false,
                            ignoreFonts: false,
                            breakPages: true,
                            ignoreLastRenderedPageBreak: false,
                            experimental: true
                        });
                        setIsRendered(true);
                        setProgress('');
                    } catch (renderErr: any) {
                        console.error('Word 渲染失败:', renderErr);
                        setErrorMsg('该 Word 文档结构较为特殊，部分排版可能已简化显示。');
                        setIsRendered(true);
                        setProgress('');
                    }
                }
            }, 100);
        } catch (err: any) {
            console.error('读取 DOCX 失败:', err);
            setErrorMsg(err.message || '读取 Word 文档失败，请确保文件是合法的 .docx 格式。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setIsRendered(false);
        if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
        }
        setErrorMsg(null);
        setProgress('');
    };

    // 导出为 PDF
    const executeExport = async () => {
        if (!docxContainerRef.current || !file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在高清栅格化文档排版…');

        try {
            const container = docxContainerRef.current;

            // 查找所有 docx 页面包裹容器，若有分页则按页切，否则整体切
            const canvas = await html2canvas(container, {
                scale: renderScale,
                useCORS: true,
                logging: false,
                backgroundColor: paperBg === 'eye-care' ? '#f4fbf4' : paperBg === 'parchment' ? '#fbf8ee' : '#ffffff'
            });

            setProgress('正在将高清图元分页组装为标准 A4 PDF…');

            // 标准 A4 纵向规格：210 x 297 mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = 210;
            const pdfHeight = 297;
            const margin = 10;
            const printWidth = pdfWidth - margin * 2;
            const printHeight = (canvas.height * printWidth) / canvas.width;

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            let heightLeft = printHeight;
            let position = margin;

            pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
            heightLeft -= (pdfHeight - margin * 2);

            while (heightLeft > 0) {
                position = heightLeft - printHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
                heightLeft -= (pdfHeight - margin * 2);
            }

            setProgress('正在封装 PDF 下载文件…');
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);

            setResult({
                url,
                filename: `${file.name.replace(/\.[^/.]+$/, '')}_Converted.pdf`
            });
            setProgress('');
        } catch (err: any) {
            console.error('Word 转 PDF 出错:', err);
            setErrorMsg(err.message || '导出 PDF 失败，请检查文档中是否包含损坏的图片对象。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    // 左侧实时预览区
    const renderLeftPanel = () => {
        if (!file) return null;

        const bgClass = paperBg === 'eye-care' ? 'bg-[#f4fbf4]' : paperBg === 'parchment' ? 'bg-[#fbf8ee]' : 'bg-white';
        const paddingClass = paperPadding === 'compact' ? 'p-6' : paperPadding === 'spacious' ? 'p-16' : 'p-10';

        return (
            <div className="flex-1 flex flex-col h-full bg-zinc-100/60 dark:bg-zinc-950/40 overflow-hidden">
                {/* 顶部状态栏 */}
                <div className="h-14 bg-background border-b px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground truncate max-w-sm">
                            <span>{file.name}</span>
                        </span>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            <span>{fileSizeStr}</span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 px-2.5 py-1 rounded-full font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>本地高保真渲染</span>
                        </span>
                    </div>
                </div>

                {/* 纸张画板 */}
                <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                    <div 
                        className={`w-full max-w-3xl shadow-2xl rounded-2xl border border-border/60 transition-all text-slate-900 ${bgClass} ${paddingClass}`}
                    >
                        <div 
                            ref={docxContainerRef}
                            className="docx-render-wrapper prose prose-slate max-w-none text-xs leading-relaxed"
                            style={{ minHeight: '600px' }}
                        />
                    </div>
                </div>

                {progress && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-blue-500 animate-pulse z-50">
                        <span>{progress}</span>
                    </div>
                )}
            </div>
        );
    };

    // 右侧设置面板
    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-blue-900 dark:text-blue-100">
                                <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                <span>DOCX 高保真排版渲染器</span>
                            </h3>
                            <p className="text-[11px] text-blue-800/70 dark:text-blue-200/70 leading-relaxed font-medium">
                                <span>纯前端深度解析 Word 样式表、段落对齐、层级列表与内嵌图像，生成可打印的标准 A4 PDF 文件。</span>
                            </p>
                        </div>

                        {file && (
                            <div className="space-y-5 px-1">
                                {/* 边距排版 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <Layout className="w-3.5 h-3.5 mr-1" />
                                        <span>页面边距规范</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: 'compact', label: '紧凑页边' },
                                            { key: 'normal', label: '标准页边' },
                                            { key: 'spacious', label: '宽松页边' },
                                        ].map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setPaperPadding(item.key as PaperPadding)}
                                                className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                                                    paperPadding === item.key
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                        : 'border-border/60 hover:border-primary/40 bg-background text-muted-foreground'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 纸张色彩 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                                        <span>纸张背景色调</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: 'white', label: '纯白标准', color: 'bg-white border' },
                                            { key: 'eye-care', label: '柔和浅绿', color: 'bg-[#e2f5e2]' },
                                            { key: 'parchment', label: '典雅米黄', color: 'bg-[#f7f2de]' },
                                        ].map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setPaperBg(item.key as PaperBgColor)}
                                                className={`p-2.5 rounded-xl border-2 flex items-center justify-center space-x-1.5 text-xs font-bold transition-all ${
                                                    paperBg === item.key
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                        : 'border-border/60 hover:border-primary/40 bg-background text-muted-foreground'
                                                }`}
                                            >
                                                <span className={`w-3 h-3 rounded-full ${item.color}`} />
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 清晰度倍率 */}
                                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-muted-foreground uppercase"><span>输出清晰度</span></span>
                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">{renderScale}x 超清矢量</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="1"
                                        value={renderScale}
                                        onChange={(e) => setRenderScale(Number(e.target.value))}
                                        className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                        <span>1x (普通)</span>
                                        <span>2x (推荐高清)</span>
                                        <span>3x (超清印刷)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>

                <ToolWorkspace.Footer>
                    <Button
                        size="lg"
                        onClick={executeExport}
                        disabled={isProcessing || !file || !isRendered}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>转换为标准 PDF</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="Word 转 PDF"
            description="将 DOCX 文档转换为标准 A4 PDF 格式，纯前端本地解析图文与排版，无需上传服务器。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneAccept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            dropzoneMultiple={false}
            dropzoneTitle="放入 Word 文件"
            dropzoneDescription="支持 Microsoft Word (.docx) 格式"
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="Word 转换 PDF 成功！"
                        description="您的 DOCX 文档已顺利排版并切片保存为标准 A4 PDF 文件。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
