import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Download, RotateCcw, FileText } from 'lucide-react';

interface SuccessResult {
    url?: string;
    filename: string;
    size?: number;  // optional file size
    label?: string; // e.g. "共 3 个文件"
    subLabel?: string; 
    downloadAction?: () => void;
}

interface SuccessStateProps {
    title?: string;
    description?: string;
    results: SuccessResult[];
    onReset: () => void;
    primaryButtonText?: string;
}

export function SuccessState({ 
    title = '处理成功！', 
    description = '操作已完成，提取文档就绪。',
    results, 
    onReset,
    primaryButtonText = '下载全部文件'
}: SuccessStateProps) {

    const handleDownloadAll = () => {
        results.forEach((res, idx) => {
            if (res.downloadAction) {
                res.downloadAction();
                return;
            }
            if (res.url) {
                setTimeout(() => {
                    const a = document.createElement('a');
                    a.href = res.url!;
                    a.download = res.filename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    // 延迟清理，避免浏览器下载中断
                    setTimeout(() => {
                        document.body.removeChild(a);
                    }, 100);
                }, idx * 400);
            }
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
                        <h2 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{title}</h2>
                        <p className="text-muted-foreground text-lg">{description}</p>
                    </div>

                    <div className="bg-background/80 rounded-2xl p-4 border shadow-sm max-w-md mx-auto flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left overflow-hidden flex-1">
                            <p className="text-sm font-bold truncate">
                                {results.length === 1 ? results[0].filename : (results[0].label || `共生成 ${results.length} 份文件`)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {results[0].subLabel || '文件已被打包就绪，请点击下载'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button 
                            size="lg" 
                            onClick={handleDownloadAll} 
                            className="h-14 text-lg rounded-xl shadow-xl shadow-primary/20 gap-2 px-8"
                        >
                            <Download className="h-5 w-5" /> 
                            {results.length === 1 ? '下载文档' : primaryButtonText}
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
