import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface ToolWorkspaceProps {
    title: string;
    description: string;
    
    fileCount: number;
    onFilesSelected: (files: File[]) => void;
    dropzoneAccept?: string;
    dropzoneMultiple?: boolean;
    dropzoneTitle?: string;
    dropzoneDescription?: string;
    hideDropzone?: boolean;
    
    leftPanel?: ReactNode;
    rightPanel?: ReactNode;
    
    isSuccess?: boolean;
    successPanel?: ReactNode;
}

export function ToolWorkspace({
    title,
    description,
    fileCount,
    onFilesSelected,
    dropzoneAccept = "application/pdf",
    dropzoneMultiple = true,
    dropzoneTitle = "选择文件",
    dropzoneDescription = "支持拖放",
    leftPanel,
    rightPanel,
    isSuccess = false,
    successPanel,
    hideDropzone = false
}: ToolWorkspaceProps) {
    if (isSuccess && successPanel) {
        return (
            <div className="w-[100vw] min-h-[calc(100vh-64px)] relative left-1/2 right-1/2 -mx-[50vw] -my-8 bg-zinc-50 dark:bg-zinc-950/20 flex items-center justify-center overflow-y-auto">
                {successPanel}
            </div>
        );
    }

    if (fileCount === 0 && !hideDropzone) {
        return (
             <div className="max-w-4xl mx-auto space-y-8 mt-[10vh] mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {description}
                    </p>
                </div>

                <Card className="glass shadow-xl border-primary/20 rounded-3xl overflow-hidden">
                    <CardContent className="pt-6 pb-6">
                        <FileDropzone
                            onFilesSelected={onFilesSelected}
                            accept={dropzoneAccept}
                            multiple={dropzoneMultiple}
                            title={dropzoneTitle}
                            description={dropzoneDescription}
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
                {leftPanel}
            </div>

            {/* 右侧属性面板栏 */}
            <div className="w-full md:w-[350px] lg:w-[400px] shrink-0 bg-background border-l border-border/40 flex flex-col h-[480px] md:h-full shadow-[0_0_20px_rgba(0,0,0,0.05)] z-40 relative md:static bottom-0 mt-auto md:mt-0">
                <div className="p-8 pb-4 hidden md:block flex-shrink-0">
                    <h2 className="text-3xl font-bold text-center tracking-tight">{title}</h2>
                </div>
                {rightPanel}
            </div>
        </div>
    );
}

// 辅助子组件
ToolWorkspace.Panel = function WorkspacePanel({ children }: { children: ReactNode }) {
    return <div className="px-6 py-2 pb-6 flex-1 overflow-y-auto">{children}</div>;
};

ToolWorkspace.Footer = function WorkspaceFooter({ children }: { children: ReactNode }) {
    return <div className="p-6 md:p-8 bg-background/90 backdrop-blur sticky bottom-0 border-t border-border/40 md:border-t-0 pb-10 md:pb-8 flex-shrink-0">{children}</div>;
};

ToolWorkspace.Alert = function WorkspaceAlert({ children, type = 'info' }: { children: ReactNode, type?: 'info' | 'error' | 'warning' }) {
    const isError = type === 'error';
    const isWarning = type === 'warning';
    
    let baseClass = "mt-4 p-4 rounded-xl flex items-start border shadow-sm text-sm leading-relaxed ";
    
    if (isError) {
        baseClass += "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-900/50";
    } else if (isWarning) {
        baseClass += "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50";
    } else {
        baseClass += "bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 border-blue-100/50 dark:border-blue-900/50";
    }
    
    return (
        <div className={baseClass + " animate-in zoom-in-95 duration-200"}>
            <span className="shrink-0 mr-3 text-lg leading-none mt-0.5">
                {isError ? '⚠️' : isWarning ? '⚡' : 'ℹ️'}
            </span>
            <div>{children}</div>
        </div>
    );
};
