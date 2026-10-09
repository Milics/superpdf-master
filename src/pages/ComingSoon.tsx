import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Sparkles, Server } from 'lucide-react';

interface ComingSoonPageProps {
    title: string;
    description: string;
    reason: string;
    icon: React.ReactNode;
}

function ComingSoonLayout({ title, description, reason, icon }: ComingSoonPageProps) {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 py-12">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{description}</p>
            </div>

            <Card className="shadow-lg border-primary/20">
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                        {icon}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold flex items-center justify-center">
                            <Sparkles className="w-5 h-5 mr-2 text-primary" /> 即将上线
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">{reason}</p>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 max-w-sm mx-auto">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Server className="w-4 h-4 flex-shrink-0" />
                            <span>该功能需要服务端处理或专用引擎支持，我们正在积极开发中。</span>
                        </div>
                    </div>

                    <Link to="/">
                        <Button variant="outline" size="lg">
                            <ArrowLeft className="w-4 h-4 mr-2" /> 返回首页
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}





export function PdfToWord() {
    return <ComingSoonLayout title="PDF 转 Word" description="将 PDF 转换为可编辑的 DOCX 文件。"
        reason="PDF 到 Word 的高保真转换需要 AI 布局分析引擎，我们正在实现基于 Transformer 的版面恢复方案。"
        icon={<span className="text-3xl">📝</span>} />;
}

export function PdfToPpt() {
    return <ComingSoonLayout title="PDF 转 PowerPoint" description="将 PDF 页面转换为 PPTX 幻灯片。"
        reason="将 PDF 逆向解析为幻灯片格式需要高级文档分析。即将推出。"
        icon={<span className="text-3xl">🎞️</span>} />;
}

export function PdfToExcel() {
    return <ComingSoonLayout title="PDF 转 Excel" description="从 PDF 中提取表格数据导出为 XLSX。"
        reason="表格检测和数据提取需要 AI 视觉识别模型支持，正在集成中。"
        icon={<span className="text-3xl">📋</span>} />;
}






export function ExtractPages() {
    return <ComingSoonLayout title="提取页面" description="从现存 PDF 文档中无损分离出想要的数个页面。"
        reason="功能已合并至强大的「整理与删除页面」画板中，您可以直接前往使用该功能进行提取保存。"
        icon={<span className="text-3xl">📑</span>} />;
}


