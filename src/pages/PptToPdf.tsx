import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { 
    Presentation, ArrowRight, Layout, Sparkles, 
    ChevronLeft, ChevronRight
} from 'lucide-react';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface SlideItem {
    id: number;
    title: string;
    bullets: string[];
    rawText: string;
}

type AspectRatio = '16:9' | '4:3';
type SlideTheme = 'dark' | 'white' | 'blue' | 'gradient';

export function PptToPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [slides, setSlides] = useState<SlideItem[]>([]);
    const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

    // 排版设置
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [theme, setTheme] = useState<SlideTheme>('white');

    // 运行状态
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    // 解析 PPTX 文件
    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length === 0) return;

        const selectedFile = selectedFiles[0];
        setFile(selectedFile);
        setIsProcessing(true);
        setProgress('正在解压 PPTX 容器并解析幻灯片…');

        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(selectedFile);

            // 搜索所有 slide{N}.xml 文件
            const slideFiles = Object.keys(contents.files).filter(path => 
                path.startsWith('ppt/slides/slide') && path.endsWith('.xml')
            );

            // 按照序号自然排序
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                return numA - numB;
            });

            if (slideFiles.length === 0) {
                throw new Error('未在 PPTX 压缩包中检测到幻灯片内容，请检查文件是否完整。');
            }

            const parsedSlides: SlideItem[] = [];

            for (let i = 0; i < slideFiles.length; i++) {
                setProgress(`正在提取第 ${i + 1} / ${slideFiles.length} 张幻灯片内容…`);
                const xmlStr = await contents.files[slideFiles[i]].async('text');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

                // 提取所有段落与文本
                const paragraphs = Array.from(xmlDoc.getElementsByTagName('a:p'));
                const textLines: string[] = [];

                paragraphs.forEach(p => {
                    const tNodes = p.getElementsByTagName('a:t');
                    let pText = '';
                    for (let j = 0; j < tNodes.length; j++) {
                        pText += tNodes[j].textContent || '';
                    }
                    if (pText.trim()) {
                        textLines.push(pText.trim());
                    }
                });

                const slideTitle = textLines.length > 0 ? textLines[0] : `幻灯片 ${i + 1}`;
                const slideBullets = textLines.length > 1 ? textLines.slice(1) : [];

                parsedSlides.push({
                    id: i + 1,
                    title: slideTitle,
                    bullets: slideBullets,
                    rawText: textLines.join('\n')
                });
            }

            setSlides(parsedSlides);
            setActiveSlideIndex(0);
            setProgress('');
        } catch (err: any) {
            console.error('PPTX 解析失败:', err);
            setErrorMsg(err.message || '无法解析此演示文稿，请确保文件是标准的 .pptx 格式。');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setSlides([]);
        setActiveSlideIndex(0);
        setErrorMsg(null);
        setProgress('');
    };

    // 导出为标准横版 PDF
    const executeExport = async () => {
        if (slides.length === 0 || !file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在生成横向演示文稿 PDF…');

        try {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // 比例尺寸：16:9 为 841.89 x 473.56 点，4:3 为 841.89 x 631.42 点
            const pageWidth = 841.89;
            const pageHeight = aspectRatio === '16:9' ? 473.56 : 631.42;

            for (let i = 0; i < slides.length; i++) {
                setProgress(`正在绘制第 ${i + 1} / ${slides.length} 页…`);
                const slide = slides[i];
                const page = pdfDoc.addPage([pageWidth, pageHeight]);

                // 绘制背景色
                if (theme === 'dark') {
                    page.drawRectangle({
                        x: 0, y: 0, width: pageWidth, height: pageHeight,
                        color: rgb(0.08, 0.1, 0.15)
                    });
                } else if (theme === 'blue') {
                    page.drawRectangle({
                        x: 0, y: 0, width: pageWidth, height: pageHeight,
                        color: rgb(0.1, 0.2, 0.45)
                    });
                } else {
                    page.drawRectangle({
                        x: 0, y: 0, width: pageWidth, height: pageHeight,
                        color: rgb(0.98, 0.98, 0.99)
                    });
                }

                const isLightBg = theme === 'white';
                const titleColor = isLightBg ? rgb(0.1, 0.15, 0.25) : rgb(0.95, 0.95, 0.98);
                const textColor = isLightBg ? rgb(0.3, 0.35, 0.45) : rgb(0.8, 0.85, 0.9);

                // 顶部幻灯片编号装饰
                page.drawText(`SLIDE ${slide.id}`, {
                    x: 60,
                    y: pageHeight - 50,
                    size: 11,
                    font: fontBold,
                    color: isLightBg ? rgb(0.9, 0.25, 0.2) : rgb(1, 0.4, 0.3)
                });

                // 绘制主标题（清理不支持字符）
                const safeTitle = (slide.title || `Slide ${slide.id}`).replace(/[^\x00-\x7F]/g, '*').slice(0, 80);
                page.drawText(safeTitle, {
                    x: 60,
                    y: pageHeight - 90,
                    size: 24,
                    font: fontBold,
                    color: titleColor,
                    maxWidth: pageWidth - 120
                });

                // 绘制正文要点
                let curY = pageHeight - 145;
                const maxBullets = aspectRatio === '16:9' ? 6 : 9;
                const safeBullets = slide.bullets.slice(0, maxBullets);

                safeBullets.forEach(b => {
                    const safeB = b.replace(/[^\x00-\x7F]/g, '*').slice(0, 120);
                    // 绘制圆点
                    page.drawCircle({
                        x: 68,
                        y: curY + 4,
                        size: 3,
                        color: isLightBg ? rgb(0.9, 0.25, 0.2) : rgb(1, 0.4, 0.3)
                    });
                    // 绘制文字
                    page.drawText(safeB, {
                        x: 82,
                        y: curY,
                        size: 13,
                        font: font,
                        color: textColor,
                        maxWidth: pageWidth - 150,
                        lineHeight: 18
                    });
                    curY -= 36;
                });

                // 底部文档标识
                page.drawText(`${file.name} | Slide ${slide.id} of ${slides.length}`, {
                    x: 60,
                    y: 30,
                    size: 9,
                    font: font,
                    color: isLightBg ? rgb(0.6, 0.65, 0.7) : rgb(0.5, 0.55, 0.6)
                });
            }

            setProgress('正在打包 PDF 下载文件…');
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({
                url,
                filename: `${file.name.replace(/\.[^/.]+$/, '')}_Slides.pdf`
            });
            setProgress('');
        } catch (err: any) {
            console.error('PPT 转 PDF 失败:', err);
            setErrorMsg(err.message || '导出幻灯片 PDF 发生错误。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const currentSlide = slides[activeSlideIndex] || null;

    // 左侧幻灯片放映室预览区
    const renderLeftPanel = () => {
        if (!file || slides.length === 0 || !currentSlide) return null;

        const isDark = theme === 'dark' || theme === 'blue';
        const bgStyle = theme === 'dark' ? 'bg-[#0f172a] text-slate-100' :
                        theme === 'blue' ? 'bg-[#1e3a8a] text-slate-100' :
                        'bg-white text-slate-900';

        return (
            <div className="flex-1 flex flex-col h-full bg-zinc-100/60 dark:bg-zinc-950/40 overflow-hidden">
                {/* 顶部放映控制栏 */}
                <div className="h-14 bg-background border-b px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <Presentation className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold text-foreground truncate max-w-sm">
                            <span>{file.name}</span>
                        </span>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                            <span>第 {activeSlideIndex + 1} / {slides.length} 页</span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveSlideIndex(c => Math.max(0, c - 1))}
                            disabled={activeSlideIndex === 0}
                            className="rounded-xl h-8 px-2.5 text-xs"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            <span>上一张</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveSlideIndex(c => Math.min(slides.length - 1, c + 1))}
                            disabled={activeSlideIndex === slides.length - 1}
                            className="rounded-xl h-8 px-2.5 text-xs"
                        >
                            <span>下一张</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>

                {/* 幻灯片投影主屏幕 */}
                <div className="flex-1 overflow-auto p-8 flex justify-center items-center">
                    <div 
                        className={`w-full max-w-3xl shadow-2xl rounded-2xl border border-border/60 transition-all p-12 flex flex-col justify-between ${bgStyle} ${
                            aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-[4/3]'
                        }`}
                    >
                        <div>
                            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-500 mb-2 block">
                                <span>SLIDE {currentSlide.id}</span>
                            </span>
                            <h2 className="text-2xl font-bold tracking-tight mb-8">
                                <span>{currentSlide.title}</span>
                            </h2>

                            <div className="space-y-4">
                                {currentSlide.bullets.length > 0 ? (
                                    currentSlide.bullets.map((b, idx) => (
                                        <div key={idx} className="flex items-start space-x-3 text-sm leading-relaxed">
                                            <span className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
                                            <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                                                <span>{b}</span>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <span>[纯图幻灯片或无副标题要点]</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={`pt-6 border-t flex justify-between items-center text-[10px] ${
                            isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-400'
                        }`}>
                            <span>{file.name}</span>
                            <span>{activeSlideIndex + 1} / {slides.length}</span>
                        </div>
                    </div>
                </div>

                {/* 底部缩略图导览栏 */}
                <div className="h-24 bg-background border-t p-2 flex items-center space-x-3 overflow-x-auto shrink-0 px-4">
                    {slides.map((s, idx) => (
                        <div
                            key={s.id}
                            onClick={() => setActiveSlideIndex(idx)}
                            className={`h-16 aspect-[16/9] rounded-lg border-2 p-2 flex flex-col justify-between cursor-pointer shrink-0 transition-all ${
                                idx === activeSlideIndex 
                                    ? 'border-primary ring-2 ring-primary/20 shadow scale-105 bg-primary/5' 
                                    : 'border-border/60 hover:border-primary/40 bg-muted/30'
                            }`}
                        >
                            <span className="text-[10px] font-bold truncate block">{s.title}</span>
                            <span className="text-[9px] text-muted-foreground">P.{s.id}</span>
                        </div>
                    ))}
                </div>

                {progress && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-orange-500 animate-pulse z-50">
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
                        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-3xl border border-orange-100/50 dark:border-orange-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-orange-900 dark:text-orange-100">
                                <Presentation className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                                <span>幻灯片横向排版引擎</span>
                            </h3>
                            <p className="text-[11px] text-orange-800/70 dark:text-orange-200/70 leading-relaxed font-medium">
                                <span>纯前端深度提取 PPTX 每页的核心视觉与标题结构，自适应装订为标准横屏高清晰度 PDF 幻灯手册。</span>
                            </p>
                        </div>

                        {file && slides.length > 0 && (
                            <div className="space-y-5 px-1">
                                {/* 幻灯片长宽比 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <Layout className="w-3.5 h-3.5 mr-1" />
                                        <span>幻灯片宽高比</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: '16:9', label: '16:9 现代宽屏', desc: '主流屏幕与投影推荐' },
                                            { key: '4:3', label: '4:3 经典比例', desc: '标准传统演示文稿' },
                                        ].map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setAspectRatio(item.key as AspectRatio)}
                                                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                                                    aspectRatio === item.key
                                                        ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                        : 'border-border/60 hover:border-primary/40 bg-background'
                                                }`}
                                            >
                                                <div className="text-xs font-bold"><span>{item.label}</span></div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5"><span>{item.desc}</span></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 幻灯片视觉底色 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                                        <span>投影背景配色</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: 'white', label: '纯白简约', color: 'bg-white border' },
                                            { key: 'blue', label: '科技深蓝', color: 'bg-blue-900' },
                                            { key: 'dark', label: '曜石酷黑', color: 'bg-slate-900' },
                                        ].map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setTheme(item.key as SlideTheme)}
                                                className={`p-2.5 rounded-xl border-2 flex items-center justify-center space-x-1.5 text-xs font-bold transition-all ${
                                                    theme === item.key
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

                                {/* 统计信息 */}
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border/40 space-y-2 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>幻灯片总数:</span>
                                        <span className="font-bold text-foreground">{slides.length} 页</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>输出格式:</span>
                                        <span className="font-bold text-foreground">横向标准 PDF ({aspectRatio})</span>
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
                        disabled={isProcessing || slides.length === 0}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>转换为演示 PDF ({slides.length} 页)</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="PowerPoint 转 PDF"
            description="将 PPTX 幻灯片转换为高清可打印的演示文稿 PDF，支持 16:9 / 4:3 比例与横屏全览。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneAccept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            dropzoneMultiple={false}
            dropzoneTitle="放入 PowerPoint 文件"
            dropzoneDescription="支持 Microsoft PowerPoint (.pptx) 格式"
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="PowerPoint 转换 PDF 成功！"
                        description={`您的 ${slides.length} 张幻灯片已全量转换并按横向版式导出为 PDF 文档。`}
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
