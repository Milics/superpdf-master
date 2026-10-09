import React, { useCallback, useState } from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSizeMB?: number;
    className?: string;
    title?: string;
    description?: string;
}

export function FileDropzone({
    onFilesSelected,
    accept,
    multiple = true,
    maxSizeMB = 100,
    className,
    title = "拖拽文件到这里",
    description = "或者点击按键选择文件上传"
}: FileDropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragActive) {
            setIsDragActive(true);
        }
    }, [isDragActive]);

    const processFiles = (filesList: FileList | null) => {
        if (!filesList) return;
        const filesArray = Array.from(filesList);

        // Validate extensions and size (MVP 版先做基础验证)
        const validFiles = filesArray.filter(file => {
            const isValidSize = file.size <= maxSizeMB * 1024 * 1024;
            // accept 逻辑比较复杂，简单版我们信任 input 的过滤
            return isValidSize;
        });

        if (validFiles.length > 0) {
            onFilesSelected(multiple ? validFiles : [validFiles[0]]);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        processFiles(e.dataTransfer.files);
    }, [multiple, maxSizeMB, onFilesSelected]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
        // 清空 input 保证能重复选择同一个文件
        e.target.value = '';
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-2xl p-10 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden",
                isDragActive
                    ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                className
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* 隐藏的文件输入框 */}
            <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title=""
            />

            <div className="flex flex-col items-center justify-center space-y-4 text-center pointer-events-none z-0">
                <div className={cn(
                    "p-4 rounded-full transition-colors duration-300",
                    isDragActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                    {isDragActive ? <CheckCircle className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-2">{isDragActive ? "松开鼠标即可添加" : title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    {maxSizeMB && (
                        <p className="text-xs text-muted-foreground mt-2 opacity-70">
                            单文件最大支持: {maxSizeMB}MB
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
