import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { ScanText, ArrowRight, FileText, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// 注意：这需要安装 tesseract.js
// npm install tesseract.js
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function OcrPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [language, setLanguage] = useState<'eng' | 'chi_sim' | 'chi_tra'>('eng');

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [extractedText, setExtractedText] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<{ url: string; filename: string } | null>(null);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setExtractedText(null);
        setResultUrl(null);
        if (selectedFiles.length > 0) setFile(selectedFiles[0]);
    };

    const handleReset = () => {
        if (resultUrl?.url) URL.revokeObjectURL(resultUrl.url);
        setResultUrl(null);
        setFile(null);
        setExtractedText(null);
        setErrorMsg(null);
        setProgress('');
    };

    const execute = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setExtractedText(null);

        try {
            const ab = await file.arrayBuffer();
            setProgress('解析 PDF 文档…');

            const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
            const totalPages = pdfDoc.numPages;
            
            let fullText = '';

            // 创建 Tesseract worker
            setProgress('初始化 OCR 引擎并下载离线模型 (首次使用可能需要几分钟)…');
            const worker = await Tesseract.createWorker(language, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(`正在提取文本: ${Math.round(m.progress * 100)}%`);
                    } else if (m.status === 'downloading model') {
                        setProgress(`下载 AI 分析模型中...`);
                    } else {
                        setProgress(m.status);
                    }
                }
            });

            for (let i = 1; i <= totalPages; i++) {
                setProgress(`正在将第 ${i} / ${totalPages} 页转化为图像进行识别…`);
                const page = await pdfDoc.getPage(i);
                // 使用 2x 缩放以保证 OCR 识别率
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx, viewport } as any).promise;

                // 转为 blob URL 以提供给 Tesseract，避免 URL 字符限制
                const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
                const url = URL.createObjectURL(blob);
                
                setProgress(`分析第 ${i} 页字体结构…`);
                const { data } = await worker.recognize(url);
                fullText += `\n--- 第 ${i} 页 ---\n`;
                fullText += data.text + '\n';
                
                URL.revokeObjectURL(url);
            }

            setProgress('清理 AI 核心…');
            await worker.terminate();

            setExtractedText(fullText);

            // 生成 TXT 文件提供下载
            const txtBlob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
            const downloadUrl = URL.createObjectURL(txtBlob);
            setResultUrl({ url: downloadUrl, filename: `${file.name.replace('.pdf', '')}_OCR.txt` });

            setProgress('');
        } catch (err: any) {
            setErrorMsg(err.message || '文本提取失败。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                <div className="relative">
                    <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 ${
                        isProcessing ? 'bg-cyan-500/10 ring-4 ring-cyan-500/30' :
                        extractedText ? 'bg-emerald-500/10 ring-4 ring-emerald-500/30' :
                        'bg-muted/30 ring-4 ring-border/30'
                    }`}>
                        {extractedText ? (
                            <FileText className="w-20 h-20 text-emerald-500" />
                        ) : (
                            <ScanText className={`w-20 h-20 transition-all duration-500 ${
                                isProcessing ? 'text-cyan-500 animate-pulse' : 'text-muted-foreground/30'
                            }`} />
                        )}
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-muted-foreground truncate max-w-[260px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground/60"><span>{(file.size / 1024).toFixed(1)} KB</span></p>
                </div>

                {progress && (
                    <div className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-cyan-200/50">
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
                    <div className="bg-cyan-50/50 dark:bg-cyan-900/10 p-5 rounded-3xl border border-cyan-100/50 dark:border-cyan-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-cyan-900 dark:text-cyan-100">
                            <ScanText className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
                            <span>OCR 光学字符识别</span>
                        </h3>
                        <p className="text-[11px] text-cyan-800/70 dark:text-cyan-200/70 leading-relaxed font-medium">
                            <span>使用 Tesseract AI 引擎识别扫描版 PDF 或图片 PDF 中的文字，并提取为可编辑的文本文档。识别工作完全在本地计算机中安全执行。</span>
                        </p>
                    </div>

                    {!extractedText ? (
                        <div className="space-y-4 px-1">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>选择主要文档语言</span></label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setLanguage('eng')} className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${language === 'eng' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/50'}`}>
                                        英文<br/><span className="text-[10px] opacity-60 font-normal">English</span>
                                    </button>
                                    <button onClick={() => setLanguage('chi_sim')} className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${language === 'chi_sim' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/50'}`}>
                                        简体中文<br/><span className="text-[10px] opacity-60 font-normal">Chinese</span>
                                    </button>
                                    <button onClick={() => setLanguage('chi_tra')} className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${language === 'chi_tra' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/50'}`}>
                                        繁体中文<br/><span className="text-[10px] opacity-60 font-normal">Traditional</span>
                                    </button>
                                </div>
                            </div>
                            
                            <ToolWorkspace.Alert type="warning">
                                <span>首次使用某种语言时，系统会自动从核心服务器拉取机器学习模型缓存。取决于网络速度，可能需要稍微耐心等待。</span>
                            </ToolWorkspace.Alert>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide flex items-center">
                                <FileText className="w-4 h-4 mr-1.5" /> <span>识别结果预览</span>
                            </label>
                            <textarea 
                                readOnly 
                                value={extractedText}
                                className="w-full h-[280px] p-4 text-xs font-mono leading-relaxed bg-background border rounded-2xl focus:ring-2 focus:ring-emerald-500/50 resize-none shadow-inner text-muted-foreground"
                            />
                        </div>
                    )}

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                {!extractedText ? (
                    <Button
                        size="lg"
                        onClick={execute}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <span>开始识别</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                ) : (
                    <div className="flex gap-3">
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={handleReset}
                            className="h-16 text-base rounded-2xl flex-1 font-bold"
                        >
                            <span>重置</span>
                        </Button>
                        {resultUrl && (
                            <a href={resultUrl.url} download={resultUrl.filename} className="flex-[2]">
                                <Button
                                    size="lg"
                                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-lg rounded-2xl font-bold transition-all hover:-translate-y-1"
                                >
                                    <Download className="w-5 h-5 mr-2" /> <span>下载 .txt 文本</span>
                                </Button>
                            </a>
                        )}
                    </div>
                )}
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="OCR PDF"
            description="运用 AI 模型智能识别图像和扫描件中的文字内容，并将其提取为您专属的文本文档。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
        />
    );
}
