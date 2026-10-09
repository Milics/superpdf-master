import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { imagesToPdf } from '@/lib/pdf-engine';
import { FileImage, ArrowRight, X, Plus } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
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

// --- Sortable Thumbnail Grid Item Component ---
function SortableImageGridItem({ file, id, idx, onRemove }: { file: File, id: string, idx: number, onRemove: (id: string) => void }) {
    const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all will-change-transform ${isDragging ? 'shadow-2xl scale-105 border-primary/50 opacity-90' : 'hover:shadow-md hover:border-primary/40'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="w-full flex-1 aspect-square bg-muted/30 cursor-grab active:cursor-grabbing p-4 flex items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-x-0 inset-y-0 opacity-0 group-hover:opacity-10 transition-opacity bg-primary pointer-events-none" />
                <img src={previewUrl} className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-sm transition-transform group-hover:scale-105" alt="图片预览" />
                
                {/* Number Badge */}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/90 backdrop-blur border text-[10px] font-black flex items-center justify-center shadow-sm text-foreground">
                    {idx + 1}
                </div>
            </div>
            
            <div className="p-2 border-t bg-background/50 flex items-center justify-between text-xs px-3">
                <span className="truncate font-medium text-muted-foreground mr-2" title={file.name}>{file.name}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded opacity-70">
                    {(file.size / 1024 / 1024).toFixed(1)}M
                </span>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-white hover:bg-red-500 bg-background/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                title="移除"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}


export function ImgToPDF() {
    const [imageItems, setImageItems] = useState<{ id: string, file: File }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        const newItems = selectedFiles.map(file => ({
            id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
            file
        }));
        setImageItems(prev => [...prev, ...newItems]);
    };

    const handleRemoveFile = (idToRemove: string) => {
        setImageItems(prev => prev.filter(item => item.id !== idToRemove));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setImageItems((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleReset = () => {
        if (result && result.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setImageItems([]);
        setErrorMsg(null);
    };

    const executeConversion = async () => {
        if (imageItems.length === 0) return;

        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const filesToProcess = imageItems.map(item => item.file);
            const res = await imagesToPdf(filesToProcess, `ImagesToPDF_${new Date().getTime()}.pdf`);
            setResult(res);
        } catch (err: any) {
            setErrorMsg(err.message || '转换过程中发生未知错误。');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (imageItems.length === 0) return null;
        return (
            <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-10" />
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-6 pb-24">
                     <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={imageItems.map(i => i.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 auto-rows-max">
                                {imageItems.map((item, idx) => (
                                    <SortableImageGridItem
                                        key={item.id}
                                        id={item.id}
                                        file={item.file}
                                        idx={idx}
                                        onRemove={handleRemoveFile}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        );
    };

    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-emerald-900 dark:text-emerald-100">
                                <FileImage className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                                图像打包装订器
                            </h3>
                            <p className="text-[11px] text-emerald-800/70 dark:text-emerald-200/70 leading-relaxed font-medium">
                                将多张相片或高清扫描图整合成单一 PDF，无需上传任何数据，保护用户隐私。您可以在左侧画板**自由拖拽排序**来调整入画顺序。
                            </p>
                        </div>
                        
                        <div className="space-y-4 px-1 mt-6">
                            <div className="bg-muted/40 rounded-2xl p-4 border flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase">当前图像总数</p>
                                    <p className="text-xl font-black text-foreground">{imageItems.length} <span className="text-xs font-normal text-muted-foreground">张</span></p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-xs font-bold text-muted-foreground uppercase">预估总容积</p>
                                    <p className="text-sm font-black text-foreground">
                                        {(imageItems.reduce((acc, curr) => acc + curr.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>

                            <label className="flex items-center justify-center p-4 border-2 border-dashed border-primary/20 rounded-2xl hover:bg-primary/5 transition-colors cursor-pointer group hover:border-primary/50 text-primary">
                                <Plus className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                                <span className="text-sm font-bold">继续添加图像</span>
                                <input type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={(e) => {
                                    if(e.target.files) handleFilesSelected(Array.from(e.target.files));
                                }} />
                            </label>
                        </div>

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>
                
                <ToolWorkspace.Footer>
                    <Button 
                        size="lg" 
                        onClick={executeConversion}
                        disabled={isProcessing || imageItems.length === 0}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        合并为 PDF <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="图片转 PDF"
            description="将您的多张 JPG、PNG 图片以最佳质量拼接封装为一个标准的 PDF 文档。"
            fileCount={imageItems.length}
            onFilesSelected={handleFilesSelected}
            dropzoneAccept="image/jpeg,image/png,image/webp"
            dropzoneMultiple={true}
            dropzoneTitle="拖入一打图片"
            dropzoneDescription="支持 JPG 和 PNG。它们可以在后续步骤中自由被重新排列"
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState 
                        title="制卷完成！"
                        description={`共计 ${imageItems.length} 张单片图像已被无损压制进这份全新的 PDF 档案栈中。`}
                        results={[{
                            url: result.url,
                            filename: result.filename,
                            label: `图片打包装订成功`
                        }]} 
                        onReset={handleReset} 
                    />
                )
            }
        />
    );
}
