import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/Button';
import { mergePDFsToBlob } from '@/lib/pdf-engine';
import { X, FileText, Download, RotateCcw, CheckCircle2, Plus, ArrowDownAZ, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import * as pdfjsLib from 'pdfjs-dist';

// 初始化 pdf.js worker，使用无需额外配置的 cdn 版本
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// --- PDF 封面缩略图渲染 Hook ---
function usePdfCover(file: File) {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const objectUrl = URL.createObjectURL(file);
        
        pdfjsLib.getDocument(objectUrl).promise.then(async (pdf) => {
            if (!active) return;
            const page = await pdf.getPage(1);
            // 降低 scale 以减少渲染负担和内存使用
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
    }, [file]);

    return coverUrl;
}

// --- 视觉卡片组件 (供列表与悬浮层复用) ---
function GridItemCard({ file, idx, onRemove, isOverlay = false }: { file: File, idx: number, onRemove?: (id: string) => void, isOverlay?: boolean }) {
    const coverUrl = usePdfCover(file);
    return (
        <div className={`relative group flex flex-col items-center bg-card rounded-2xl border p-2.5 transition-all w-full h-full ${isOverlay ? 'shadow-2xl scale-105 ring-2 ring-primary border-transparent z-50 rotate-3 cursor-grabbing' : 'shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/40 cursor-grab'}`}>
            <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-10 backdrop-blur-sm">
                {idx + 1}
            </div>
            {onRemove && (
            <button
                onPointerDown={(e) => { e.stopPropagation(); onRemove('dummy'); }}
                className="absolute -top-2 -right-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                title="移除文件"
            >
                <X className="w-3.5 h-3.5" />
            </button>
            )}
            <div className="w-full aspect-[1/1.414] bg-muted/40 rounded-xl border flex items-center justify-center overflow-hidden mb-3 pointer-events-none">
                {coverUrl ? (
                    <img src={coverUrl} alt={file.name} className="w-full h-full object-contain bg-white dark:bg-zinc-100" draggable={false} />
                ) : (
                    <FileText className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                )}
            </div>
            <div className="w-full truncate text-xs text-center font-medium text-foreground/80 px-1" title={file.name}>
                {file.name}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5" title={file.name}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
        </div>
    );
}

// --- 网格卡片拖拽项组件 (使用 DragOverlay 需要拆分布局与拖拽状态) ---
function SortableGridItem({ file, id, idx, onRemove }: { file: File, id: string, idx: number, onRemove: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style} className="relative">
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 scale-100 transition-transform" />
                <div className="opacity-0 pointer-events-none">
                    <GridItemCard file={file} idx={idx} />
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none h-full">
            <GridItemCard file={file} idx={idx} onRemove={() => onRemove(id)} />
        </div>
    );
}

// --- 成功状态全屏组件 ---
function SuccessState({ filename, downloadUrl, fileCount, onReset }: any) {
    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500">
            <Card className="w-full shadow-2xl border-green-500/30 bg-green-500/5 rounded-3xl overflow-hidden glass">
                <CardContent className="p-10 text-center space-y-8">
                    <div className="w-24 h-24 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-green-600 dark:text-green-400">合并成功！</h2>
                        <p className="text-muted-foreground text-lg">
                            已将 <span className="font-bold text-foreground">{fileCount}</span> 个文件合并为一个 PDF
                        </p>
                    </div>

                    <div className="bg-background rounded-2xl p-4 border shadow-sm max-w-md mx-auto flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left overflow-hidden flex-1">
                            <p className="text-sm font-bold truncate">{filename}</p>
                            <p className="text-xs text-muted-foreground mt-1">文件已就绪，立即保存</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button 
                            size="lg" 
                            onClick={handleDownload} 
                            className="h-14 text-lg rounded-xl shadow-xl shadow-primary/20 gap-2 px-8"
                        >
                            <Download className="h-5 w-5" /> 下载合并 PDF
                        </Button>
                        <Button 
                            size="lg" 
                            variant="outline" 
                            onClick={onReset} 
                            className="h-14 text-lg rounded-xl gap-2 px-8 bg-background/50 hover:bg-background/80"
                        >
                            <RotateCcw className="h-5 w-5" /> 继续处理其它
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Main Page Component ---
export function MergePDF() {
    const [fileItems, setFileItems] = useState<{ id: string, file: File }[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    useEffect(() => {
        return () => {
            if (result?.url) URL.revokeObjectURL(result.url);
        };
    }, [result]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        const newItems = selectedFiles.map(file => ({
            id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
            file
        }));
        setFileItems(prev => [...prev, ...newItems]);
    };

    const handleRemoveFile = (idToRemove: string) => {
        setFileItems(prev => prev.filter(item => item.id !== idToRemove));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFileItems((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const handleSortAZ = () => {
        setFileItems(prev => {
            const sortedAZ = [...prev].sort((a, b) => a.file.name.localeCompare(b.file.name, 'zh-CN', { numeric: true }));
            // 如果当前已经是 A-Z，就反转变成 Z-A，形成一个自动切换效果（Toggle）
            const isAlreadyAZ = prev.every((val, index) => val.id === sortedAZ[index].id);
            if (isAlreadyAZ) {
                return [...sortedAZ].reverse();
            }
            return sortedAZ;
        });
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFileItems([]);
        setErrorMsg(null);
    };

    const executeMerge = async () => {
        if (fileItems.length < 2) {
            setErrorMsg('请至少选择 2 个 PDF 文件进行合并。');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const filesToProcess = fileItems.map(item => item.file);
            const filename = `Merged_${new Date().getTime()}.pdf`;
            const url = await mergePDFsToBlob(filesToProcess);
            setResult({ url, filename });
        } catch (err: any) {
            setErrorMsg(err.message || '合并过程中发生未知错误，请确保 PDF 未被加密。');
        } finally {
            setIsProcessing(false);
        }
    };

    // 状态3：成功输出展示
    if (result) {
        return (
            <div className="w-[100vw] h-[calc(100vh-64px)] relative left-1/2 right-1/2 -mx-[50vw] -my-8 bg-zinc-50 dark:bg-zinc-950/20 flex overflow-y-auto">
                <SuccessState 
                    filename={result.filename} 
                    downloadUrl={result.url} 
                    fileCount={fileItems.length} 
                    onReset={handleReset} 
                />
            </div>
        );
    }

    // 状态1：未选择任何文件时，展示居中拖拽区域
    if (fileItems.length === 0) {
        return (
           <div className="max-w-4xl mx-auto space-y-8 mt-[10vh] mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">合并 PDF</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        按您想要的顺序将多个 PDF 文件组合成一个完整文档。完全在浏览器本地处理。
                    </p>
                </div>

                <Card className="glass shadow-xl border-primary/20 rounded-3xl overflow-hidden">
                    <CardContent className="pt-6 pb-6">
                        <FileDropzone
                            onFilesSelected={handleFilesSelected}
                            accept="application/pdf"
                            multiple={true}
                            title="选择或拖放待合并的文档"
                            description="支持多选，您可以在下一步拖拽缩略图调整合并顺序"
                        />
                    </CardContent>
                </Card>
                
                <div className="text-center">
                     <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors gap-2 bg-muted/50 px-4 py-2 rounded-full">
                        <ArrowLeft className="h-4 w-4" /> 返回首页
                    </Link>
                </div>
           </div>
        );
    }

    // 状态2：“画板+侧边栏”专业工作区布局
    return (
        <div className="w-[100vw] h-[calc(100vh-64px)] relative left-1/2 right-1/2 -mx-[50vw] -my-8 bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500 z-10">
            {/* 左侧工作区 */}
            <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/10 relative flex flex-col h-full overflow-hidden">
                {/* 悬浮工具小圆球 */}
                <div className="absolute top-6 right-6 flex flex-col gap-3 z-30">
                    <label 
                        className="bg-[#E53935] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-[#D32F2F] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        title="添加更多 PDF文件"
                    >
                        <Plus className="w-6 h-6" />
                        <input type="file" className="hidden" multiple accept="application/pdf" onChange={(e) => {
                             if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                             e.target.value = '';
                        }} />
                    </label>
                    <button 
                        onClick={handleSortAZ} 
                        className="bg-background text-foreground border border-border/50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-accent hover:scale-110 active:scale-95 transition-all"
                        title="按文件名智能排序 (如果已 A-Z 将为您反转为 Z-A)"
                    >
                        <ArrowDownAZ className="w-5 h-5" />
                    </button>
                </div>
                
                {/* 滚动网格 */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <div className="max-w-[1200px] mx-auto absolute inset-0 p-8 overflow-y-auto w-full">
                        <DndContext 
                             sensors={sensors} 
                             collisionDetection={closestCenter} 
                             onDragStart={handleDragStart}
                             onDragEnd={handleDragEnd}
                             onDragCancel={handleDragCancel}
                        >
                            <SortableContext items={fileItems.map(i => i.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 pr-16 md:pr-0 pb-20 md:pb-8">
                                    {fileItems.map((item, idx) => (
                                        <SortableGridItem 
                                            key={item.id} 
                                            id={item.id} 
                                            file={item.file} 
                                            idx={idx}
                                            onRemove={handleRemoveFile} 
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                            
                            <DragOverlay dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
                            }}>
                                {activeId ? (
                                    <GridItemCard 
                                        file={fileItems.find(i => i.id === activeId)!.file} 
                                        idx={fileItems.findIndex(i => i.id === activeId)}
                                        isOverlay
                                    />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </div>
            </div>

            {/* 右侧属性面板栏 */}
            <div className="w-full md:w-[350px] lg:w-[400px] shrink-0 bg-background border-l border-border/40 flex flex-col h-[280px] md:h-full shadow-[0_0_20px_rgba(0,0,0,0.05)] z-40 relative md:static bottom-0 mt-auto md:mt-0">
                <div className="p-8 pb-4 hidden md:block">
                    <h2 className="text-3xl font-bold text-center tracking-tight">合并PDF</h2>
                </div>
                
                <div className="px-6 py-2 pb-6 flex-1 overflow-y-auto">
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 p-5 rounded-2xl flex items-start text-sm border border-blue-100/50 dark:border-blue-900/50 shadow-sm leading-relaxed mt-4 md:mt-0">
                       <span className="text-blue-500 shrink-0 mr-3 text-lg leading-none mt-0.5">ℹ️</span>
                       <p>要更改 PDF 文件的顺序，只需拖拽缩略图卡片即可重新排列。</p>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm p-4 rounded-xl flex items-start border border-red-200/50 dark:border-red-900/50 shadow-sm">
                            <span className="shrink-0 mr-2 opacity-80 mt-0.5">⚠️</span>
                            <p>{errorMsg}</p>
                        </div>
                    )}
                </div>
                
                <div className="p-6 md:p-8 bg-background/90 backdrop-blur sticky bottom-0 border-t border-border/40 md:border-t-0 pb-12 md:pb-8">
                    <Button 
                        size="lg" 
                        onClick={executeMerge}
                        disabled={isProcessing || fileItems.length < 2}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        合并PDF <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

