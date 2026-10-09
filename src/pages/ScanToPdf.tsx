import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { 
    Camera, Upload, Plus, Trash2, ArrowRight, RefreshCw, 
    SlidersHorizontal, Sparkles, FileText,
    CameraOff
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

type FilterType = 'original' | 'document' | 'grayscale' | 'magic';
type PageSizeOption = 'fit' | 'a4';

interface ScannedPage {
    id: string;
    originalDataUrl: string;
    processedDataUrl: string;
    width: number;
    height: number;
    filter: FilterType;
    brightness: number;
    contrast: number;
}

export function ScanToPdf() {
    // 扫描的页面列表
    const [pages, setPages] = useState<ScannedPage[]>([]);
    const [activePageIndex, setActivePageIndex] = useState<number>(0);

    // 摄像头模式状态
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [cameraError, setCameraError] = useState<string | null>(null);

    // 导出设置
    const [pageSizeOption, setPageSizeOption] = useState<PageSizeOption>('a4');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 停止摄像头
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    }, []);

    // 开启摄像头
    const startCamera = useCallback(async () => {
        stopCamera();
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setIsCameraActive(true);
        } catch (err: any) {
            console.error('无法启动摄像头:', err);
            setCameraError('无法访问摄像头设备，请检查权限，或直接点击下方上传已有照片。');
            setIsCameraActive(false);
        }
    }, [facingMode, stopCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    // 图像滤镜渲染处理函数
    const applyFilter = (
        img: HTMLImageElement,
        filter: FilterType,
        brightness: number,
        contrast: number
    ): string => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return img.src;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        // 对比度与亮度转换因子
        const bOffset = (brightness - 100) * 1.28; // -128 到 128
        const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < d.length; i += 4) {
            let r = d[i];
            let g = d[i + 1];
            let b = d[i + 2];

            // 亮度与对比度
            r = cFactor * (r - 128) + 128 + bOffset;
            g = cFactor * (g - 128) + 128 + bOffset;
            b = cFactor * (b - 128) + 128 + bOffset;

            // 灰度加权计算
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === 'grayscale') {
                d[i] = gray;
                d[i + 1] = gray;
                d[i + 2] = gray;
            } else if (filter === 'document') {
                // 文档高对比去灰底（简易自适应二值化）
                const val = gray > 145 ? 255 : (gray < 85 ? 0 : (gray - 85) * (255 / 60));
                d[i] = val;
                d[i + 1] = val;
                d[i + 2] = val;
            } else if (filter === 'magic') {
                // 魔法色彩：增强对比并稍微漂白背景
                d[i] = Math.min(255, Math.max(0, r > 160 ? r * 1.15 : r * 0.95));
                d[i + 1] = Math.min(255, Math.max(0, g > 160 ? g * 1.15 : g * 0.95));
                d[i + 2] = Math.min(255, Math.max(0, b > 160 ? b * 1.15 : b * 0.95));
            } else {
                // original + brightness/contrast
                d[i] = Math.min(255, Math.max(0, r));
                d[i + 1] = Math.min(255, Math.max(0, g));
                d[i + 2] = Math.min(255, Math.max(0, b));
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.92);
    };

    // 添加新页面
    const addNewPageFromDataUrl = (dataUrl: string, width: number, height: number) => {
        const newPage: ScannedPage = {
            id: 'scan_' + Math.random().toString(36).substring(2, 9),
            originalDataUrl: dataUrl,
            processedDataUrl: dataUrl,
            width,
            height,
            filter: 'magic', // 默认推荐魔法增强滤镜
            brightness: 105,
            contrast: 15
        };

        const img = new Image();
        img.onload = () => {
            const processed = applyFilter(img, newPage.filter, newPage.brightness, newPage.contrast);
            newPage.processedDataUrl = processed;
            setPages(prev => {
                const next = [...prev, newPage];
                setActivePageIndex(next.length - 1);
                return next;
            });
        };
        img.src = dataUrl;
    };

    // 拍照捕获当前帧
    const captureSnapshot = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        addNewPageFromDataUrl(dataUrl, canvas.width, canvas.height);
    };

    // 从本地批量上传照片
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    addNewPageFromDataUrl(dataUrl, img.naturalWidth || img.width, img.naturalHeight || img.height);
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });

        // 清空 input 保证可重选
        e.target.value = '';
    };

    // 更新当前活动页的滤镜参数
    const updateActivePageFilter = (newFilter: FilterType, newB?: number, newC?: number) => {
        if (pages.length === 0 || activePageIndex < 0 || activePageIndex >= pages.length) return;
        const cur = pages[activePageIndex];
        const b = newB !== undefined ? newB : cur.brightness;
        const c = newC !== undefined ? newC : cur.contrast;

        const img = new Image();
        img.onload = () => {
            const processed = applyFilter(img, newFilter, b, c);
            setPages(prev => prev.map((p, idx) => 
                idx === activePageIndex ? { 
                    ...p, 
                    filter: newFilter, 
                    brightness: b, 
                    contrast: c, 
                    processedDataUrl: processed 
                } : p
            ));
        };
        img.src = cur.originalDataUrl;
    };

    // 删除单页
    const handleDeletePage = (index: number) => {
        setPages(prev => {
            const next = prev.filter((_, idx) => idx !== index);
            if (activePageIndex >= next.length) {
                setActivePageIndex(Math.max(0, next.length - 1));
            }
            return next;
        });
    };

    // 重置
    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setPages([]);
        setActivePageIndex(0);
        setErrorMsg(null);
        setProgress('');
    };

    // 生成 PDF
    const executeExport = async () => {
        if (pages.length === 0) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在整合所有扫描页面…');

        try {
            stopCamera();
            const pdfDoc = await PDFDocument.create();

            for (let i = 0; i < pages.length; i++) {
                setProgress(`正在合成第 ${i + 1} / ${pages.length} 页…`);
                const pageData = pages[i];
                
                // 将 base64 转为 Uint8Array
                const base64Data = pageData.processedDataUrl.split(',')[1];
                const binaryStr = atob(base64Data);
                const bytes = new Uint8Array(binaryStr.length);
                for (let j = 0; j < binaryStr.length; j++) {
                    bytes[j] = binaryStr.charCodeAt(j);
                }

                const embeddedImg = await pdfDoc.embedJpg(bytes);

                if (pageSizeOption === 'a4') {
                    // 标准 A4 比例：595.28 x 841.89 点
                    const a4Width = 595.28;
                    const a4Height = 841.89;
                    const page = pdfDoc.addPage([a4Width, a4Height]);

                    // 计算等比例缩放居中位置
                    const imgRatio = embeddedImg.width / embeddedImg.height;

                    let drawWidth = a4Width - 40; // 边距各 20
                    let drawHeight = drawWidth / imgRatio;

                    if (drawHeight > a4Height - 40) {
                        drawHeight = a4Height - 40;
                        drawWidth = drawHeight * imgRatio;
                    }

                    const x = (a4Width - drawWidth) / 2;
                    const y = (a4Height - drawHeight) / 2;

                    page.drawImage(embeddedImg, {
                        x,
                        y,
                        width: drawWidth,
                        height: drawHeight
                    });
                } else {
                    // 自适应页面尺寸
                    const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
                    page.drawImage(embeddedImg, {
                        x: 0,
                        y: 0,
                        width: embeddedImg.width,
                        height: embeddedImg.height
                    });
                }
            }

            setProgress('正在打包 PDF 文件…');
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({
                url,
                filename: `Scanned_Document_${Date.now()}.pdf`
            });
            setProgress('');
        } catch (err: any) {
            console.error('扫描生成 PDF 失败:', err);
            setErrorMsg(err.message || '生成 PDF 失败，请检查各扫描图片数据。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const activePage = pages[activePageIndex] || null;

    // 左侧面板渲染
    const renderLeftPanel = () => {
        return (
            <div className="flex-1 flex flex-col h-full bg-zinc-100/60 dark:bg-zinc-950/40 relative overflow-hidden">
                {/* 顶部控制栏 */}
                <div className="h-14 bg-background/90 backdrop-blur border-b px-4 flex items-center justify-between z-10">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <span>扫描取景 / 页面画板</span>
                        </span>
                        {pages.length > 0 && (
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                                <span>第 {activePageIndex + 1} / {pages.length} 页</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {isCameraActive ? (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={stopCamera}
                                className="text-xs rounded-xl"
                            >
                                <CameraOff className="w-3.5 h-3.5 mr-1" />
                                <span>关闭取景</span>
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={startCamera}
                                className="text-xs rounded-xl"
                            >
                                <Camera className="w-3.5 h-3.5 mr-1" />
                                <span>开启相机</span>
                            </Button>
                        )}

                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs rounded-xl"
                        >
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            <span>上传照片</span>
                        </Button>
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                    </div>
                </div>

                {/* 主画面区域 */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                    {isCameraActive ? (
                        /* 摄像头取景窗口 */
                        <div className="relative w-full max-w-xl aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center border-4 border-primary/20">
                            <video 
                                ref={videoRef} 
                                playsInline 
                                autoPlay 
                                muted 
                                className="w-full h-full object-cover"
                            />
                            {/* 取景扫描边框辅助线 */}
                            <div className="absolute inset-8 border-2 border-white/40 border-dashed rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                                <div className="flex justify-between text-white/60 text-[10px] font-mono">
                                    <span>┌ 对准纸张边缘</span>
                                    <span>┐</span>
                                </div>
                                <div className="flex justify-between text-white/60 text-[10px] font-mono">
                                    <span>└</span>
                                    <span>┘</span>
                                </div>
                            </div>

                            {/* 悬浮快门按钮 */}
                            <div className="absolute bottom-6 flex items-center space-x-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                                    className="rounded-full w-10 h-10 bg-white/20 hover:bg-white/40 text-white border-0 backdrop-blur"
                                    title="切换前后摄像头"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                                <button
                                    onClick={captureSnapshot}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                                    title="拍摄并添加页面"
                                >
                                    <div className="w-11 h-11 rounded-full bg-[#E53935]" />
                                </button>
                            </div>
                        </div>
                    ) : pages.length > 0 && activePage ? (
                        /* 当前选中页增强预览 */
                        <div className="relative max-w-md w-full aspect-[1/1.414] bg-white shadow-2xl rounded-2xl overflow-hidden border border-border/60 flex items-center justify-center group transition-all">
                            <img 
                                src={activePage.processedDataUrl} 
                                alt={`第 ${activePageIndex + 1} 页`}
                                className="w-full h-full object-contain select-none"
                            />
                            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                                <span>{activePage.width} × {activePage.height}</span>
                            </div>
                        </div>
                    ) : (
                        /* 空状态引导 */
                        <div className="text-center space-y-4 max-w-sm">
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                                <Camera className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold"><span>开始扫描文档</span></h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span>点击上方开启摄像头直接拍照，或上传手机现拍的纸张照片。系统将自动应用扫描仪级去灰底锐化滤镜。</span>
                                </p>
                            </div>
                            {cameraError && (
                                <p className="text-xs text-destructive font-medium bg-destructive/10 p-3 rounded-xl">
                                    <span>{cameraError}</span>
                                </p>
                            )}
                            <div className="flex justify-center gap-3 pt-2">
                                <Button onClick={startCamera} className="rounded-xl font-bold bg-[#E53935] hover:bg-[#D32F2F]">
                                    <Camera className="w-4 h-4 mr-2" />
                                    <span>启动相机</span>
                                </Button>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl font-bold">
                                    <Upload className="w-4 h-4 mr-2" />
                                    <span>选择相片</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部已扫描页面缩略图条 */}
                {pages.length > 0 && (
                    <div className="h-28 bg-background border-t p-3 flex items-center space-x-3 overflow-x-auto z-10 shrink-0">
                        {pages.map((p, idx) => {
                            const isSelected = idx === activePageIndex;
                            return (
                                <div 
                                    key={p.id}
                                    onClick={() => {
                                        setActivePageIndex(idx);
                                        stopCamera();
                                    }}
                                    className={`relative h-20 aspect-[1/1.414] rounded-lg border-2 overflow-hidden cursor-pointer shrink-0 transition-all group ${
                                        isSelected 
                                            ? 'border-primary ring-2 ring-primary/30 shadow-md scale-105' 
                                            : 'border-border/60 hover:border-primary/50 opacity-80 hover:opacity-100'
                                    }`}
                                >
                                    <img src={p.processedDataUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                        <span>{idx + 1}</span>
                                    </span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePage(idx);
                                        }}
                                        className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="删除本页"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}

                        {/* 继续追加加页按钮 */}
                        <button 
                            onClick={startCamera}
                            className="h-20 aspect-[1/1.414] rounded-lg border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center text-primary shrink-0 transition-colors"
                            title="继续拍下一页"
                        >
                            <Plus className="w-5 h-5 mb-0.5" />
                            <span className="text-[10px] font-bold"><span>拍下一页</span></span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // 右侧调色与控制面板
    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-3xl border border-orange-100/50 dark:border-orange-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-orange-900 dark:text-orange-100">
                                <Sparkles className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                                <span>智能文档画质增强</span>
                            </h3>
                            <p className="text-[11px] text-orange-800/70 dark:text-orange-200/70 leading-relaxed font-medium">
                                <span>消除拍摄阴影与发灰纸张底色，将拍摄内容转换为高清平整的扫描件效果。支持多页连续归集。</span>
                            </p>
                        </div>

                        {pages.length > 0 && activePage ? (
                            <div className="space-y-6 px-1">
                                {/* 滤镜预设 */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                                        <span>扫描仪画质模式（当前第 {activePageIndex + 1} 页）</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'magic', label: '魔法色彩', desc: '提亮白纸，锐化文字' },
                                            { key: 'document', label: '清晰黑白', desc: '去灰底，类似复印件' },
                                            { key: 'grayscale', label: '柔和灰度', desc: '平滑消除杂色光斑' },
                                            { key: 'original', label: '原始实拍', desc: '保持拍照真实色彩' },
                                        ].map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => updateActivePageFilter(f.key as FilterType)}
                                                className={`text-left p-3 rounded-2xl border-2 transition-all text-xs ${
                                                    activePage.filter === f.key
                                                        ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                        : 'border-border/60 hover:border-primary/40 bg-background font-medium'
                                                }`}
                                            >
                                                <div className="font-bold text-foreground"><span>{f.label}</span></div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5"><span>{f.desc}</span></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 亮度微调 */}
                                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-muted-foreground uppercase"><span>纸张亮度</span></span>
                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">{activePage.brightness}%</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="50"
                                        max="150"
                                        value={activePage.brightness}
                                        onChange={(e) => updateActivePageFilter(activePage.filter, Number(e.target.value), undefined)}
                                        className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                    />
                                </div>

                                {/* 对比度微调 */}
                                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-muted-foreground uppercase"><span>文字对比度</span></span>
                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">+{activePage.contrast}</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="-30"
                                        max="70"
                                        value={activePage.contrast}
                                        onChange={(e) => updateActivePageFilter(activePage.filter, undefined, Number(e.target.value))}
                                        className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-full appearance-none"
                                    />
                                </div>

                                {/* 导出纸张排版设置 */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                        <span>导出纸张规格</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setPageSizeOption('a4')}
                                            className={`p-3 rounded-2xl border-2 text-xs text-left transition-all ${
                                                pageSizeOption === 'a4'
                                                    ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                    : 'border-border/60 hover:border-primary/40 bg-background font-medium'
                                            }`}
                                        >
                                            <div className="font-bold"><span>标准 A4 页面</span></div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5"><span>适合打印装订</span></div>
                                        </button>
                                        <button
                                            onClick={() => setPageSizeOption('fit')}
                                            className={`p-3 rounded-2xl border-2 text-xs text-left transition-all ${
                                                pageSizeOption === 'fit'
                                                    ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                    : 'border-border/60 hover:border-primary/40 bg-background font-medium'
                                            }`}
                                        >
                                            <div className="font-bold"><span>自适应尺寸</span></div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5"><span>保持照片原始宽高比</span></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                                <FileText className="w-10 h-10 mx-auto opacity-30" />
                                <p><span>尚未添加任何页面，请在左侧取景拍摄或上传照片。</span></p>
                            </div>
                        )}

                        {progress && (
                            <div className="bg-blue-50 text-blue-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-blue-200 animate-pulse">
                                <span>{progress}</span>
                            </div>
                        )}

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>

                <ToolWorkspace.Footer>
                    <Button
                        size="lg"
                        onClick={executeExport}
                        disabled={isProcessing || pages.length === 0}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>生成高清 PDF 文档 ({pages.length} 页)</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="扫描成 PDF"
            description="使用设备摄像头直接拍摄或上传纸质照片，智能去除阴影与底灰并自动合成为多页 PDF。"
            fileCount={pages.length}
            onFilesSelected={() => {}}
            hideDropzone={true}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="PDF 扫描件生成成功！"
                        description={`已将 ${pages.length} 张扫描页面处理增强并导出为 PDF 文档。`}
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
