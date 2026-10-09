import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Globe, ArrowRight, Code, CodeXml } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function HtmlToPdf() {
    const [htmlCode, setHtmlCode] = useState<string>('<h1>Hello World!</h1>\n<p>输入你的 HTML 代码试试看</p>\n<style>\n  h1 { color: #2563eb; }\n  p { color: #475569; font-size: 14px; }\n</style>');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setErrorMsg(null);
        setProgress('');
    };

    const execute = async () => {
        if (!iframeRef.current || !iframeRef.current.contentWindow) {
            setErrorMsg('预览环境未就绪。');
            return;
        }
        
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在解析网页结构并渲染截图…');

        try {
            const iframeDoc = iframeRef.current.contentWindow.document;
            const targetElement = iframeDoc.body;
            
            // 为了让 body 高度自适应内容展开
            targetElement.style.height = 'auto';

            // 使用 html2canvas 进行网页快照
            const canvas = await html2canvas(targetElement, {
                scale: 2,           // 提高清晰度
                useCORS: true,      // 允许跨域图片
                logging: false,
                windowWidth: 800,   // 设置一个模拟的宽度
            });

            setProgress('正在将高清网页切图转换为 PDF 页面…');

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // 计算按照 A4 比例换算出的长宽
            // A4 宽高标准：210 x 297 mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            // 添加第一页
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // 如果高度超出一页 A4
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            setProgress('正在生成最终的 PDF 文件…');
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            
            setResult({ url, filename: `WebScreenshot_${new Date().getTime()}.pdf` });
            setProgress('');

        } catch (err: any) {
            setErrorMsg(err.message || '转换网页时出错，请检查 HTML 源码。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        return (
            <div className="flex-1 flex flex-col h-full bg-muted/10">
                <div className="p-3 border-b border-border/50 bg-background/50 flex items-center justify-between">
                    <div className="flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        <Globe className="w-4 h-4 mr-1.5" />
                        <span>实时网页预览</span>
                    </div>
                </div>
                
                {/* Iframe 渲染用于所见即所得，并为后续快照提供沙盒元素 */}
                <div className="flex-1 overflow-auto bg-white">
                    <iframe
                        ref={iframeRef}
                        title="HTML Preview"
                        className="w-full h-full border-none shadow-inner"
                        srcDoc={htmlCode}
                        sandbox="allow-same-origin allow-scripts"
                    />
                </div>
                
                {progress && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg border border-blue-500 animate-pulse">
                        <span>{progress}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4 h-full flex flex-col">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-800/30 shrink-0">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-blue-900 dark:text-blue-100">
                            <CodeXml className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                            <span>HTML 源码制图</span>
                        </h3>
                        <p className="text-[11px] text-blue-800/70 dark:text-blue-200/70 leading-relaxed font-medium">
                            <span>输入或粘贴 HTML 源码片段。系统会在内存沙盒中将其完整渲染为真实页面，截屏并切分成标准的 A4 PDF 书册导出。</span>
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col space-y-2 min-h-[300px] px-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                            <Code className="w-3.5 h-3.5 mr-1" /> <span>代码编辑器</span>
                        </label>
                        <textarea
                            value={htmlCode}
                            onChange={(e) => setHtmlCode(e.target.value)}
                            placeholder="在此输入 <html> 或 <div> 标签..."
                            className="flex-1 w-full p-4 text-[13px] font-mono leading-relaxed bg-background/50 border rounded-2xl focus:ring-2 focus:ring-blue-500/50 resize-none shadow-sm text-foreground"
                            spellCheck={false}
                        />
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing || !htmlCode.trim()}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>保存为 PDF</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="HTML 转 PDF"
            description="在本地离线沙盒中渲染网页代码，并安全捕获为完整切页版式的长段 PDF。"
            fileCount={0}
            onFilesSelected={() => {}}
            hideDropzone={true}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="网页捕捉完毕！"
                        description="HTML 已经成功渲染并切页装订成 A4 尺寸的 PDF 文件。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
