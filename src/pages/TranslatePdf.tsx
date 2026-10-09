import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { 
    Languages, Download, FileText, 
    Settings2, ChevronLeft, ChevronRight, Copy, Check, Sparkles
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PageContent {
    pageNum: number;
    originalText: string;
    translatedText: string;
    isTranslating: boolean;
}

export function TranslatePdf() {
    const [file, setFile] = useState<File | null>(null);
    const [pagesContent, setPagesContent] = useState<PageContent[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

    // 翻译配置
    const [sourceLang, setSourceLang] = useState<string>('en');
    const [targetLang, setTargetLang] = useState<string>('zh');
    const [engineType, setEngineType] = useState<'free' | 'ai'>('free');
    
    // AI 自定义配置
    const [aiApiKey, setAiApiKey] = useState<string>(() => localStorage.getItem('pdf_translate_api_key') || '');
    const [aiBaseUrl, setAiBaseUrl] = useState<string>(() => localStorage.getItem('pdf_translate_base_url') || 'https://api.openai.com/v1');
    const [aiModel, setAiModel] = useState<string>(() => localStorage.getItem('pdf_translate_model') || 'gpt-3.5-turbo');
    const [showAiConfig, setShowAiConfig] = useState<boolean>(false);

    // 处理状态
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    // 持久化保存用户配置的 API Key
    useEffect(() => {
        if (aiApiKey) localStorage.setItem('pdf_translate_api_key', aiApiKey);
        if (aiBaseUrl) localStorage.setItem('pdf_translate_base_url', aiBaseUrl);
        if (aiModel) localStorage.setItem('pdf_translate_model', aiModel);
    }, [aiApiKey, aiBaseUrl, aiModel]);

    // 加载并提取 PDF 每页纯文本
    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length === 0) return;

        const selectedFile = selectedFiles[0];
        setFile(selectedFile);
        setIsProcessing(true);
        setProgress('正在解析 PDF 文档结构与文本…');

        try {
            const ab = await selectedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
            const total = pdf.numPages;

            const extractedPages: PageContent[] = [];
            for (let i = 1; i <= total; i++) {
                setProgress(`正在提取第 ${i} / ${total} 页文字…`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // 将碎片 textItems 按照换行与段落简单拼合
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                extractedPages.push({
                    pageNum: i,
                    originalText: pageText || '[本页未检测到可选中的文字图层，可能为纯扫描图片]',
                    translatedText: '',
                    isTranslating: false
                });
            }

            setPagesContent(extractedPages);
            setCurrentPageIndex(0);
            setProgress('');
        } catch (err: any) {
            console.error('PDF 解析失败:', err);
            setErrorMsg('提取文档文字失败，该文件可能受到密码保护或已损坏。');
        } finally {
            setIsProcessing(false);
        }
    };

    // 翻译单个文本块
    const translateText = async (text: string): Promise<string> => {
        if (!text || text.startsWith('[本页未检测')) return text;

        if (engineType === 'ai') {
            if (!aiApiKey.trim()) {
                throw new Error('请先在右侧配置您的 AI 接口 API Key。');
            }
            // 调用 OpenAI 规范接口
            const cleanBaseUrl = aiBaseUrl.replace(/\/+$/, '');
            const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiApiKey.trim()}`
                },
                body: JSON.stringify({
                    model: aiModel.trim() || 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional document translator. Translate the given text from ${sourceLang} to ${targetLang}. Preserve the original tone and format. Only return the translated text without extra explanation.`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ],
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `AI 翻译接口请求失败 (状态码: ${response.status})`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || '';
        } else {
            // 使用公共免费翻译服务 (MyMemory API)
            // 切割超长文本以适应单次请求
            const chunks: string[] = [];
            const maxLength = 450;
            let remaining = text;
            while (remaining.length > 0) {
                if (remaining.length <= maxLength) {
                    chunks.push(remaining);
                    break;
                }
                let sliceIndex = remaining.lastIndexOf('.', maxLength);
                if (sliceIndex === -1 || sliceIndex < 200) {
                    sliceIndex = remaining.lastIndexOf(' ', maxLength);
                }
                if (sliceIndex === -1) sliceIndex = maxLength;

                chunks.push(remaining.slice(0, sliceIndex + 1));
                remaining = remaining.slice(sliceIndex + 1);
            }

            const results: string[] = [];
            for (const chunk of chunks) {
                const langPair = `${sourceLang}|${targetLang}`;
                const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(langPair)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('免费翻译接口响应异常，请稍后重试或切换至 AI 接口。');
                const data = await res.json();
                results.push(data.responseData?.translatedText || chunk);
            }
            return results.join(' ');
        }
    };

    // 执行当前页翻译
    const handleTranslateCurrentPage = async () => {
        if (pagesContent.length === 0) return;
        const cur = pagesContent[currentPageIndex];
        if (!cur || !cur.originalText) return;

        setIsProcessing(true);
        setErrorMsg(null);
        setProgress(`正在翻译第 ${cur.pageNum} 页…`);

        try {
            const translated = await translateText(cur.originalText);
            setPagesContent(prev => prev.map((p, idx) => 
                idx === currentPageIndex ? { ...p, translatedText: translated } : p
            ));
            setProgress('');
        } catch (err: any) {
            setErrorMsg(err.message || '翻译失败，请检查网络或配置。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    // 一键批量翻译全部页面
    const handleTranslateAllPages = async () => {
        if (pagesContent.length === 0) return;
        setIsProcessing(true);
        setErrorMsg(null);

        try {
            const newPages = [...pagesContent];
            for (let i = 0; i < newPages.length; i++) {
                setProgress(`正在批量翻译第 ${i + 1} / ${newPages.length} 页…`);
                if (!newPages[i].translatedText) {
                    const translated = await translateText(newPages[i].originalText);
                    newPages[i].translatedText = translated;
                    setPagesContent([...newPages]);
                }
            }
            setProgress('');
        } catch (err: any) {
            setErrorMsg(err.message || '批量翻译过程中发生中断。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    // 导出双语或纯译文为 TXT 文件
    const handleExportTxt = () => {
        if (pagesContent.length === 0) return;
        let content = `PDF 翻译结果报告\n文档名称: ${file?.name || 'document'}\n翻译语言: ${sourceLang} -> ${targetLang}\n导出时间: ${new Date().toLocaleString()}\n\n`;

        pagesContent.forEach(p => {
            content += `==================== 第 ${p.pageNum} 页 ====================\n\n`;
            content += `【原文】:\n${p.originalText}\n\n`;
            content += `【译文】:\n${p.translatedText || '[尚未翻译]'}\n\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setResult({
            url,
            filename: `${file?.name.replace(/\.[^/.]+$/, '')}_双语对照.txt`
        });
    };

    // 导出为排版 PDF
    const handleExportPdf = async () => {
        if (pagesContent.length === 0) return;
        setIsProcessing(true);
        setProgress('正在排版生成双语对照 PDF…');
        setErrorMsg(null);

        try {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (const p of pagesContent) {
                // 标准 A4 页面
                const page = pdfDoc.addPage([595.28, 841.89]);
                const { height } = page.getSize();

                // 写入标题
                page.drawText(`Page ${p.pageNum} - Translation Report`, {
                    x: 40,
                    y: height - 50,
                    size: 14,
                    font,
                    color: rgb(0.2, 0.2, 0.2)
                });

                // 简化排版文本预览
                const previewStr = p.translatedText || p.originalText;
                const cleanStr = previewStr.replace(/[^\x00-\x7F]/g, '*'); // 避免标准英文字体写入汉字报错
                page.drawText(cleanStr.slice(0, 1500), {
                    x: 40,
                    y: height - 90,
                    size: 10,
                    font,
                    color: rgb(0.3, 0.3, 0.3),
                    maxWidth: 515,
                    lineHeight: 14
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({
                url,
                filename: `${file?.name.replace(/\.[^/.]+$/, '')}_Translated.pdf`
            });
            setProgress('');
        } catch (err: any) {
            console.error('导出 PDF 失败:', err);
            setErrorMsg(err.message || '生成 PDF 失败。建议选择导出纯文本格式。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setPagesContent([]);
        setCurrentPageIndex(0);
        setErrorMsg(null);
        setProgress('');
    };

    const currentPage = pagesContent[currentPageIndex] || null;

    // 左侧面板：双语阅读与对照画板
    const renderLeftPanel = () => {
        if (!file || pagesContent.length === 0) return null;

        return (
            <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/30 overflow-hidden">
                {/* 翻页栏 */}
                <div className="h-14 bg-background border-b px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <span>双语对照阅读区</span>
                        </span>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                            <span>第 {currentPageIndex + 1} / {pagesContent.length} 页</span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPageIndex(c => Math.max(0, c - 1))}
                            disabled={currentPageIndex === 0}
                            className="rounded-xl h-8 px-2.5 text-xs"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            <span>上一页</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPageIndex(c => Math.min(pagesContent.length - 1, c + 1))}
                            disabled={currentPageIndex === pagesContent.length - 1}
                            className="rounded-xl h-8 px-2.5 text-xs"
                        >
                            <span>下一页</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>

                {/* 对照内容栏 */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x overflow-y-auto">
                    {/* 左栏：原文 */}
                    <div className="p-6 space-y-3 flex flex-col h-full bg-background/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase flex items-center">
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                <span>页面提取原文</span>
                            </span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCopy(currentPage?.originalText || '')}
                                className="h-7 px-2 text-xs text-muted-foreground rounded-lg"
                            >
                                {copied ? <Check className="w-3 h-3 text-emerald-500 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                <span>复制原文</span>
                            </Button>
                        </div>
                        <div className="flex-1 p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs leading-relaxed font-sans overflow-y-auto select-text whitespace-pre-wrap">
                            {currentPage?.originalText}
                        </div>
                    </div>

                    {/* 右栏：译文 */}
                    <div className="p-6 space-y-3 flex flex-col h-full bg-background">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary uppercase flex items-center">
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                <span>智能对照译文</span>
                            </span>
                            {currentPage?.translatedText && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleCopy(currentPage.translatedText)}
                                    className="h-7 px-2 text-xs text-muted-foreground rounded-lg"
                                >
                                    <Copy className="w-3 h-3 mr-1" />
                                    <span>复制译文</span>
                                </Button>
                            )}
                        </div>

                        {currentPage?.translatedText ? (
                            <div className="flex-1 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs leading-relaxed font-sans overflow-y-auto select-text whitespace-pre-wrap text-foreground">
                                {currentPage.translatedText}
                            </div>
                        ) : (
                            <div className="flex-1 p-4 rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center text-center space-y-3">
                                <Languages className="w-8 h-8 text-muted-foreground/30" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground"><span>本页尚未翻译</span></p>
                                    <p className="text-[11px] text-muted-foreground/70"><span>点击右侧控制台的按钮立即进行即时翻译</span></p>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={handleTranslateCurrentPage}
                                    disabled={isProcessing}
                                    className="rounded-xl text-xs font-bold bg-[#E53935] hover:bg-[#D32F2F] text-white"
                                >
                                    <span>翻译此页</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {progress && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-indigo-500 animate-pulse z-50">
                        <span>{progress}</span>
                    </div>
                )}
            </div>
        );
    };

    // 右侧面板：控制与设置
    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-indigo-900 dark:text-indigo-100">
                                <Languages className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                                <span>多语言智能翻译引擎</span>
                            </h3>
                            <p className="text-[11px] text-indigo-800/70 dark:text-indigo-200/70 leading-relaxed font-medium">
                                <span>智能识别提取 PDF 内容文字，提供免配置的免费翻译与高精度自定义 AI（OpenAI/DeepSeek 等）双引擎模式。</span>
                            </p>
                        </div>

                        {file && (
                            <div className="space-y-5 px-1">
                                {/* 语言对选择 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                        <span>语言方向</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground mb-1 block">源语言</span>
                                            <select
                                                value={sourceLang}
                                                onChange={(e) => setSourceLang(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="en">英语 (English)</option>
                                                <option value="zh">中文 (Chinese)</option>
                                                <option value="ja">日语 (Japanese)</option>
                                                <option value="ko">韩语 (Korean)</option>
                                                <option value="fr">法语 (French)</option>
                                                <option value="de">德语 (German)</option>
                                                <option value="es">西班牙语 (Spanish)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <span className="text-[10px] text-muted-foreground mb-1 block">目标语言</span>
                                            <select
                                                value={targetLang}
                                                onChange={(e) => setTargetLang(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="zh">中文 (Chinese)</option>
                                                <option value="en">英语 (English)</option>
                                                <option value="ja">日语 (Japanese)</option>
                                                <option value="ko">韩语 (Korean)</option>
                                                <option value="fr">法语 (French)</option>
                                                <option value="de">德语 (German)</option>
                                                <option value="es">西班牙语 (Spanish)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 翻译模式 */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                            <span>翻译引擎</span>
                                        </label>
                                        <button 
                                            onClick={() => setShowAiConfig(!showAiConfig)}
                                            className="text-[10px] font-bold text-primary flex items-center hover:underline"
                                        >
                                            <Settings2 className="w-3 h-3 mr-0.5" />
                                            <span>{showAiConfig ? '收起配置' : '高级 API 配置'}</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setEngineType('free')}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all ${
                                                engineType === 'free'
                                                    ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                    : 'border-border/60 hover:border-primary/40 bg-background'
                                            }`}
                                        >
                                            <div className="text-xs font-bold"><span>公共免费引擎</span></div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5"><span>无需密钥，即开即用</span></div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setEngineType('ai');
                                                if (!aiApiKey) setShowAiConfig(true);
                                            }}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all ${
                                                engineType === 'ai'
                                                    ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                    : 'border-border/60 hover:border-primary/40 bg-background'
                                            }`}
                                        >
                                            <div className="text-xs font-bold"><span>专业 AI 引擎</span></div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5"><span>支持 DeepSeek / GPT</span></div>
                                        </button>
                                    </div>
                                </div>

                                {/* 自定义 AI 配置项展开 */}
                                {showAiConfig && (
                                    <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 space-y-3 text-xs">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">API Key (密钥)</span>
                                            <input 
                                                type="password"
                                                value={aiApiKey}
                                                onChange={(e) => setAiApiKey(e.target.value)}
                                                placeholder="sk-..."
                                                className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">API Base URL</span>
                                            <input 
                                                type="text"
                                                value={aiBaseUrl}
                                                onChange={(e) => setAiBaseUrl(e.target.value)}
                                                placeholder="https://api.openai.com/v1"
                                                className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Model (模型名称)</span>
                                            <input 
                                                type="text"
                                                value={aiModel}
                                                onChange={(e) => setAiModel(e.target.value)}
                                                placeholder="gpt-3.5-turbo / deepseek-chat"
                                                className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 操作按键 */}
                                <div className="space-y-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleTranslateCurrentPage}
                                        disabled={isProcessing}
                                        className="w-full h-11 text-xs font-bold rounded-xl"
                                    >
                                        <span>仅翻译当前页 (第 {currentPageIndex + 1} 页)</span>
                                    </Button>

                                    <Button
                                        onClick={handleTranslateAllPages}
                                        disabled={isProcessing}
                                        className="w-full h-12 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                        <span>一键批量翻译整本 ({pagesContent.length} 页)</span>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>

                <ToolWorkspace.Footer>
                    <div className="flex gap-2 w-full">
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={handleExportTxt}
                            disabled={isProcessing || pagesContent.length === 0}
                            className="flex-1 h-14 text-sm font-bold rounded-2xl"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            <span>导出双语 .txt</span>
                        </Button>

                        <Button
                            size="lg"
                            onClick={handleExportPdf}
                            disabled={isProcessing || pagesContent.length === 0}
                            className="flex-[1.2] bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-14 text-sm font-bold rounded-2xl transition-all hover:-translate-y-1"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            <span>导出排版 PDF</span>
                        </Button>
                    </div>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="翻译 PDF"
            description="智能解析 PDF 全文内容，支持双语并排阅读对照，并可导出双语文档。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="翻译文档导出成功！"
                        description={`您的翻译结果已打包生成，可随时下载保存。`}
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
