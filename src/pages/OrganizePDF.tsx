import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Layers, ArrowRight, Trash2, RotateCcw, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// 初始化 pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PageItem {
    id: string;
    originalIndex: number;
}

// --- 单页真实封面渲染组件 ---
function PageThumbnail({ pdfDoc, pageNum }: { pdfDoc: pdfjsLib.PDFDocumentProxy; pageNum: number }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        // 使用 timeout 给主线程一点喘息，防止同时发100个渲染卡死 UI
        const timer = setTimeout(() => {
            pdfDoc.getPage(pageNum).then(async (page) => {
                if (!active) return;
                const viewport = page.getViewport({ scale: 0.3 }); // 降低精度以换取性能
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    canvas.width = viewport.width; canvas.height = viewport.height;
                    await page.render({ canvasContext: ctx, viewport } as any).promise;
                    if (active) setUrl(canvas.toDataURL('image/jpeg', 0.6));
                }
            }).catch(e => console.warn('Render thumbnail failed:', e));
        }, Math.random() * 200); // 打散渲染队列压力

        return () => { 
            active = false; 
            clearTimeout(timer);
        };
    }, [pdfDoc, pageNum]);

    return (
        <div className="w-full h-full relative flex items-center justify-center">
            {!url ? (
                <div className="flex flex-col items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mb-1 animate-pulse" />
                    <span className="text-2xl font-black text-foreground/80 opacity-50">{pageNum}</span>
                </div>
            ) : (
                <img src={url} alt={`Page ${pageNum}`} className="absolute inset-0 w-full h-full object-contain bg-white dark:bg-zinc-100" draggable={false} />
            )}
        </div>
    );
}

// --- 纯视觉卡片（供列表 & DragOverlay 复用） ---
function PageCardVisual({ item, index, onRemove, isOverlay = false, pdfjsDoc }: { item: PageItem; index: number; onRemove?: (id: string) => void; isOverlay?: boolean; pdfjsDoc: pdfjsLib.PDFDocumentProxy | null }) {
    return (
        <div className={`relative group flex flex-col items-center bg-card rounded-2xl border p-2.5 transition-all w-full h-full ${isOverlay ? 'shadow-2xl scale-105 ring-2 ring-primary border-transparent z-50 rotate-3 cursor-grabbing' : 'shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/40 cursor-grab'}`}>
            {/* 左上角序号 badge */}
            <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-10 backdrop-blur-sm">
                {index + 1}
            </div>
            {/* 右上角删除键 */}
            {onRemove && (
                <button
                    onPointerDown={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="absolute -top-2 -right-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                    title="删除该页"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
            {/* 主体 */}
            <div className="w-full aspect-[1/1.414] bg-muted/40 rounded-xl border flex flex-col items-center justify-center overflow-hidden mb-3 pointer-events-none">
                {pdfjsDoc ? (
                    <PageThumbnail pdfDoc={pdfjsDoc} pageNum={item.originalIndex + 1} />
                ) : (
                    <>
                        <FileText className="w-8 h-8 text-muted-foreground/30 mb-1" />
                        <span className="text-2xl font-black text-foreground/80">{item.originalIndex + 1}</span>
                    </>
                )}
            </div>
            <span className="text-[10px] text-muted-foreground text-center truncate w-full px-1">原第 {item.originalIndex + 1} 面</span>
        </div>
    );
}

// --- 拖拽项（isDragging 时显示虚影占位） ---
function SortablePageItem({ item, index, onRemove, pdfjsDoc }: { item: PageItem; index: number; onRemove: (id: string) => void; pdfjsDoc: pdfjsLib.PDFDocumentProxy | null }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // 被拖走时：留下虚线边框占位
    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style} className="relative">
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 scale-100 transition-transform" />
                <div className="opacity-0 pointer-events-none">
                    <PageCardVisual item={item} index={index} pdfjsDoc={pdfjsDoc} />
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none h-full">
            <PageCardVisual item={item} index={index} onRemove={() => onRemove(item.id)} pdfjsDoc={pdfjsDoc} />
        </div>
    );
}

export function OrganizePDF() {
    const [file, setFile] = useState<File | null>(null);
    const [pageItems, setPageItems] = useState<PageItem[]>([]);
    const [originalCount, setOriginalCount] = useState(0);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [pdfjsDoc, setPdfjsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        setPageItems([]);
        if (selectedFiles.length > 0) {
            const f = selectedFiles[0];
            setFile(f);
            setIsProcessing(true);
            try {
                const ab = await f.arrayBuffer();
                const doc = await PDFDocument.load(ab);
                const count = doc.getPageCount();
                setOriginalCount(count);
                setPageItems(Array.from({ length: count }, (_, i) => ({
                    id: `page-${i}-${Math.random().toString(36).substr(2, 5)}`,
                    originalIndex: i
                })));

                // 并发加载 pdfjs-dist 用于高清缩略图渲染
                const objectUrl = URL.createObjectURL(f);
                const pDocument = await pdfjsLib.getDocument(objectUrl).promise;
                setPdfjsDoc(pDocument);
                URL.revokeObjectURL(objectUrl);
            } catch (err: any) {
                setErrorMsg('解析 PDF 失败，可能已加密或损坏。');
                setFile(null);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleRemovePage = (idToRemove: string) => {
        setPageItems(prev => prev.filter(item => item.id !== idToRemove));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setPageItems((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const handleResetAll = () => {
        setPageItems(Array.from({ length: originalCount }, (_, i) => ({
             id: `page-${i}-${Math.random().toString(36).substr(2, 5)}`,
             originalIndex: i
        })));
        setErrorMsg(null);
    };

    const handleResetWorkspace = () => {
         if (result && result.url) URL.revokeObjectURL(result.url);
         setResult(null);
         setFile(null);
         setPageItems([]);
         setOriginalCount(0);
         setErrorMsg(null);
    };

    const executeOrganize = async () => {
        if (!file || pageItems.length === 0) return;

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const ab = await file.arrayBuffer();
            const srcDoc = await PDFDocument.load(ab);
            const newDoc = await PDFDocument.create();
            
            const pagesToCopy = pageItems.map(item => item.originalIndex);
            const copied = await newDoc.copyPages(srcDoc, pagesToCopy);
            copied.forEach(p => newDoc.addPage(p));

            const bytes = await newDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            setResult({
                url,
                filename: `Organized_${file.name}`
            });
        } catch (err: any) {
            setErrorMsg(err.message || '重组 PDF 失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file || originalCount === 0) return null;
        return (
            <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-10" />
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-6 pb-24">
                     {pageItems.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                             <Layers className="w-16 h-16 mb-4" />
                             <p className="font-medium">您已经删除了所有页面</p>
                             <Button onClick={handleResetAll} variant="link" className="mt-2 text-primary">撤销所有操作</Button>
                         </div>
                     ) : (
                         <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragCancel={handleDragCancel}
                        >
                            <SortableContext
                                items={pageItems.map(i => i.id)}
                                strategy={rectSortingStrategy}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 auto-rows-max">
                                    {pageItems.map((item, idx) => (
                                        <SortablePageItem
                                            key={item.id}
                                            item={item}
                                            index={idx}
                                            onRemove={handleRemovePage}
                                            pdfjsDoc={pdfjsDoc}
                                        />
                                    ))}
                                </div>
                            </SortableContext>

                            {/* 悬浮跟手浮层 —— 与合并 PDF 完全一致的动画体验 */}
                            <DragOverlay dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
                            }}>
                                {activeId ? (
                                    <PageCardVisual 
                                        item={pageItems.find(i => i.id === activeId)!}
                                        index={pageItems.findIndex(i => i.id === activeId)}
                                        isOverlay
                                        pdfjsDoc={pdfjsDoc}
                                    />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                     )}
                </div>
            </div>
        );
    };

    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-indigo-900 dark:text-indigo-100">
                                <Layers className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                                页面编排调度台
                            </h3>
                            <p className="text-[11px] text-indigo-800/70 dark:text-indigo-200/70 leading-relaxed font-medium">
                                在巨大的画板里，你可以自由地用鼠标拖拽来互换任意页面的顺序，或者点击悬浮处的红叉直接将冗余的特定页面删除，最后合成一份全新的档案。
                            </p>
                        </div>
                        
                        <div className="space-y-4 px-1 mt-6">
                            <div className="bg-muted/40 rounded-2xl p-4 border flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase">文档初始总数</p>
                                    <p className="text-xl font-black text-foreground">{originalCount} <span className="text-xs font-normal text-muted-foreground">页</span></p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-xs font-bold text-muted-foreground uppercase text-primary">重新编排后</p>
                                    <p className="text-sm font-black text-primary truncate max-w-[80px]">
                                        {pageItems.length} 面
                                    </p>
                                </div>
                            </div>

                            <Button onClick={handleResetAll} variant="outline" className="w-full rounded-2xl border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-900/50 dark:hover:bg-indigo-900/20 text-xs font-bold h-12">
                                <RotateCcw className="w-4 h-4 mr-2" /> 恢复至初始状态
                            </Button>
                        </div>

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>
                
                <ToolWorkspace.Footer>
                    <Button 
                        size="lg" 
                        onClick={executeOrganize}
                        disabled={isProcessing || pageItems.length === 0}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        生成最新文档 <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="整理与删除页面"
            description="以最高的自由度重构一份文档，您可以将任意不需要的页面扔进废纸篓，并拖拽编排下发顺序。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState 
                        title="编排处理完毕！"
                        description={`您成功删减并重新排列了最初含有 ${originalCount} 页的文件。新档案现包含 ${pageItems.length} 页，没有任何隐私泄露。`}
                        results={[{
                            url: result.url,
                            filename: result.filename,
                            label: `完成编排重组的档案包`
                        }]} 
                        onReset={handleResetWorkspace} 
                    />
                )
            }
        />
    );
}
