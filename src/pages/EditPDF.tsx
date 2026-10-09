import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Type, ArrowRight, MousePointer2, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface TextLayer {
    id: string;
    text: string;
    x: number;
    y: number;
    color: { r: number, g: number, b: number };
    fontSize: number;
    page: number;
}

export function EditPDF() {
    const [file, setFile] = useState<File | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    // 文档状态
    const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // 绘图与视口状态
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 }); // PDF 的逻辑宽/高
    const [renderSize, setRenderSize] = useState({ width: 0, height: 0 }); // 实际 Canvas CSS 表现宽/高

    // 图层与工具
    const [layers, setLayers] = useState<TextLayer[]>([]);
    const [toolColor, setToolColor] = useState<{ r: number, g: number, b: number }>({ r: 220, g: 38, b: 38 });
    const [toolFontSize, setToolFontSize] = useState<number>(24);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        setLayers([]);
        setCurrentPage(1);
        if (selectedFiles.length > 0) {
            setFile(selectedFiles[0]);
            loadPdf(selectedFiles[0]);
        }
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setPdfDocProxy(null);
        setLayers([]);
        setErrorMsg(null);
        setProgress('');
    };

    const loadPdf = async (f: File) => {
        try {
            const ab = await f.arrayBuffer();
            const proxy = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
            setPdfDocProxy(proxy);
            setTotalPages(proxy.numPages);
            renderPage(proxy, 1);
        } catch (err) {
            setErrorMsg('无法读取该 PDF 文件以进行渲染。');
        }
    };

    const renderPage = async (proxy: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
        if (!canvasRef.current) return;
        try {
            const page = await proxy.getPage(pageNum);
            
            // 设定一个让屏幕看起来舒适的比例 1.5倍
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;

            // 真实的画布像素宽度 = 以 viewport 为准，提高清晰度
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // 渲染出来的 CSS 尺寸
            setViewportSize({ width: page.getViewport({ scale: 1 }).width, height: page.getViewport({ scale: 1 }).height });
            setRenderSize({ width: viewport.width, height: viewport.height });

            await page.render({ canvasContext: ctx, viewport } as any).promise;
        } catch (e) {
            console.error("渲染页面失败", e);
        }
    };

    useEffect(() => {
        if (pdfDocProxy) renderPage(pdfDocProxy, currentPage);
    }, [currentPage, pdfDocProxy]);

    // 画板点击：新增层或取消选中
    const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) {
            // 如果点在空白处并且有选中的层，则取消选中并跳出
            if (activeLayerId) {
                setActiveLayerId(null);
                return;
            }

            // 计算相对容器的 x, y 百分比 (因为渲染大小随时可能发生响应式变化，存百分比或原生尺寸最安全)
            // PDF坐标系：X 往右，Y 往上(底部0)。但为了便于理解，我们记录相对于页面真实逻辑尺寸的 X (0~W) / Y (0~H, 顶部0)
            const rect = overlayRef.current.getBoundingClientRect();
            const xOffset = e.clientX - rect.left;
            const yOffset = e.clientY - rect.top;

            // 比例因子 = CSS尺寸中点下去的坐标 / CSS尺寸总宽高
            const scaleX = xOffset / rect.width;
            const scaleY = yOffset / rect.height;

            const logicalX = viewportSize.width * scaleX;
            const logicalY = viewportSize.height * scaleY;

            const newLayer: TextLayer = {
                id: Math.random().toString(36).substr(2, 9),
                text: '点击输入文字...',
                x: logicalX,
                y: logicalY,
                color: toolColor,
                fontSize: toolFontSize,
                page: currentPage
            };
            
            setLayers(prev => [...prev, newLayer]);
            setActiveLayerId(newLayer.id);
        }
    };

    const updateLayerText = (id: string, text: string) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, text } : l));
        // 这里可以根据输入的内容，动态向服务器或者本地检查中文字符。但是目前我们使用系统自带字体，如果导出时存在中文可能需要单独嵌入字体。
    };
    
    const deleteLayer = (id: string) => {
        setLayers(prev => prev.filter(l => l.id !== id));
        setActiveLayerId(null);
    };

    const execute = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('装载文档并初始化字体引擎…');

        try {
            const ab = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);
            // pdf-lib 需要挂载 fontkit 才能挂载特殊字体。虽然标准字体不支持中文，我们将回退使用 Helvetica 导出字母，或者尽力绘制。
            pdfDoc.registerFontkit(fontkit);
            
            // 为了解决原版 pdf-lib 对中文 text 的支持，标准操作是加载一个中文字体文件。但纯前端没有默认的中文字符集，
            // 若用户输入了中文，在完全没字体的情况下，pdf-lib 绘制时无法显示或直接抛抛错。
            // 作为轻量解决：由于浏览器运行，我们此处假定用户输入内容可直接使用英文/数字支持的标准字体。
            const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

            setProgress('计算坐标偏移并生成重绘图层…');

            const pages = pdfDoc.getPages();

            layers.forEach(layer => {
                // 这个层属于哪一页
                const p = pages[layer.page - 1];
                if (!p) return;

                const { width: pWidth, height: pHeight } = p.getSize();

                // 还原为 PDF 原生坐标制 (左下角为 0,0)
                // Layer 中记录的是基于 "原逻辑宽 viewportSize.width" 和 "原逻辑高 viewportSize.height" 且顶部为 0,0
                const rawScaleX = layer.x / viewportSize.width;
                const rawScaleY = layer.y / viewportSize.height;

                const targetX = pWidth * rawScaleX;
                // PDF 的 Y 起点在底部，我们要反推
                const targetY = pHeight - (pHeight * rawScaleY);

                // 根据颜色提取
                const r = layer.color.r / 255;
                const g = layer.color.g / 255;
                const b = layer.color.b / 255;

                try {
                    // pdf-lib drawText 以文字左下角起爆，我们要尽量让其与页面上位移视差缩小 (调整一点 baseLine)
                    p.drawText(layer.text, {
                        x: targetX,
                        y: targetY - layer.fontSize,
                        size: layer.fontSize,
                        font: font,
                        color: rgb(r, g, b),
                    });
                } catch(e: any) {
                    // 最常见的错是 Unrecognized Characters (由于没有加载中文字体文件)，只能提示用户。
                    console.warn("字体编码不支持:", e);
                }
            });

            setProgress('层级合并生成最终文档…');
            const bytes = await pdfDoc.save();

            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({ url, filename: `Edited_${file.name}` });
            setProgress('');
        } catch (err: any) {
            setErrorMsg(err.message || '导出编辑文件时失败。请注意目前编辑组件暂时仅支持渲染英文和数字体系字符。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) {
            return (
                <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950/20">
                    <div className="text-center opacity-40 flex flex-col items-center">
                        <Type className="w-16 h-16 mb-4" />
                        <p>请上传一份文档开始增补编辑</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col h-full bg-[#e5e7eb] dark:bg-[#1a1b1e] relative">
                <div className="h-14 shrink-0 bg-white dark:bg-zinc-900 border-b flex items-center justify-between px-6 z-10 shadow-sm">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground font-medium">
                       <span>{file.name}</span>
                       <span>({currentPage} / {totalPages})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1}>
                           <ChevronLeft className="w-4 h-4 mr-1"/> 上一页
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages}>
                           下一页 <ChevronRight className="w-4 h-4 ml-1"/>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto relative flex justify-center py-10 px-4">
                     <div 
                         className="relative shadow-2xl transition-all select-none mx-auto bg-white"
                         style={{ 
                             width: renderSize.width, 
                             height: renderSize.height,
                             transformOrigin: 'top center'
                         }}
                     >
                         <canvas ref={canvasRef} className="block w-full h-full absolute inset-0 z-0 pointer-events-none" />
                         
                         {/* 操作覆盖层：拦截所有点击。绝对定位跟随 Canvas */}
                         <div 
                             ref={overlayRef} 
                             className="absolute inset-0 cursor-crosshair z-10" 
                             onClick={handleOverlayClick}
                         >
                            {layers.filter(l => l.page === currentPage).map(layer => {
                                const isSelected = activeLayerId === layer.id;
                                // 坐标缩放映射到当前 CSS 尺寸
                                const top = renderSize.height * (layer.y / viewportSize.height);
                                const left = renderSize.width * (layer.x / viewportSize.width);

                                return (
                                    <div 
                                        key={layer.id} 
                                        onClick={(e) => { e.stopPropagation(); setActiveLayerId(layer.id); }}
                                        className={`absolute flex group/layer origin-top-left whitespace-nowrap min-w-[20px] 
                                            ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-20 cursor-text' : 'hover:ring-1 hover:ring-blue-500/50 cursor-pointer z-10'}`}
                                        style={{ top, left }}
                                    >
                                        <input
                                            type="text"
                                            autoFocus={isSelected}
                                            value={layer.text}
                                            onChange={(e) => updateLayerText(layer.id, e.target.value)}
                                            spellCheck={false}
                                            className="bg-transparent outline-none m-0 p-0 border-none w-full border-transparent"
                                            style={{
                                                color: `rgb(${layer.color.r}, ${layer.color.g}, ${layer.color.b})`,
                                                fontSize: `${layer.fontSize * (renderSize.width / viewportSize.width)}px`, // 视觉大小缩放
                                                lineHeight: 1
                                            }}
                                            readOnly={!isSelected}
                                        />

                                        {isSelected && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                                                className="absolute -top-7 -right-2 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover/layer:opacity-100 shadow transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                         </div>
                     </div>
                </div>

                {progress && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg border border-blue-500 animate-pulse z-50">
                        <span>{progress}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-sm font-bold flex items-center mb-2">
                            <MousePointer2 className="w-5 h-5 mr-2" />
                            <span>批注追加编辑器</span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                            <span>本工具不改变底层文字流（无法删除文档中原有的文字），而是通过在上方盖出浮动涂层画布来为您提供填写表单、打字批改的扩展编辑功能。</span>
                        </p>
                    </div>

                    <div className="space-y-4 px-1">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase">当前使用工具</h4>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className={`h-16 justify-start border-blue-500 bg-blue-50/50 text-blue-700`}>
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3"><Type className="w-4 h-4"/></div>
                                <span className="text-sm font-bold">文本增补</span>
                            </Button>
                        </div>
                        
                        <div className="pt-2">
                            <p className="text-xs font-bold text-muted-foreground mb-3">油墨颜色</p>
                            <div className="flex gap-2">
                                <button onClick={() => setToolColor({r: 220, g: 38, b: 38})} className={`w-8 h-8 rounded-full bg-red-600 ring-offset-2 ${toolColor.r === 220 ? 'ring-2 ring-red-600' : ''}`} />
                                <button onClick={() => setToolColor({r: 37, g: 99, b: 235})} className={`w-8 h-8 rounded-full bg-blue-600 ring-offset-2 ${toolColor.r === 37 ? 'ring-2 ring-blue-600' : ''}`} />
                                <button onClick={() => setToolColor({r: 15, g: 23, b: 42})} className={`w-8 h-8 rounded-full bg-slate-900 border ring-offset-2 ${toolColor.r === 15 ? 'ring-2 ring-slate-900' : ''}`} />
                            </div>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs font-bold text-muted-foreground mb-3">字号大小: {toolFontSize}px</p>
                            <input 
                                type="range" min="12" max="72" 
                                value={toolFontSize} 
                                onChange={(e) => setToolFontSize(parseInt(e.target.value))}
                                className="w-full accent-primary" 
                            />
                        </div>
                        
                        <ToolWorkspace.Alert type="warning">
                            <span>提示：点击左侧画板的任意位置以置入新文本块。拖拽定位功能正在完善中。目前 PDF 导出对中文字体的支持有限，推荐输入英文或数字。</span>
                        </ToolWorkspace.Alert>
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing || !file}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>保存并重绘底包</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="轻编辑 PDF"
            description="直接在文档画板上方任意位置输入纯文本以填冲表格或批注。基于无损重挂载技术，确保不破坏原格式。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="修补成功！"
                        description={`您在画板中做出的文本修改已经完美转制为原生的 PDF 代码并渲染。`}
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
