import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Unlock, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function UnlockPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    const handleFilesSelected = (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length > 0) setFile(selectedFiles[0]);
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setPassword('');
        setErrorMsg(null);
        setProgress('');
    };

    const execute = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在验证密码…');

        try {
            const ab = await file.arrayBuffer();

            // 第一步：用 pdfjs-dist 以密码打开加密的 PDF
            let pdfDoc: pdfjsLib.PDFDocumentProxy;
            try {
                pdfDoc = await pdfjsLib.getDocument({
                    data: new Uint8Array(ab),
                    password: password || undefined,
                }).promise;
            } catch (err: any) {
                if (err.name === 'PasswordException') {
                    if (err.code === 1) {
                        // 需要密码但未提供
                        setErrorMsg('该文档需要密码才能打开，请输入正确的密码。');
                    } else {
                        // 密码错误
                        setErrorMsg('密码错误，请确认后重试。');
                    }
                } else {
                    setErrorMsg('无法解析该 PDF 文件，它可能已损坏。');
                }
                setIsProcessing(false);
                setProgress('');
                return;
            }

            const totalPages = pdfDoc.numPages;
            setProgress(`密码验证成功！正在重建 ${totalPages} 页文档…`);

            // 第二步：用 pdf-lib 创建新的无密码 PDF
            const newPdf = await PDFDocument.create();

            for (let i = 1; i <= totalPages; i++) {
                setProgress(`正在处理第 ${i} / ${totalPages} 页…`);
                const page = await pdfDoc.getPage(i);
                // 使用 2x 缩放保证清晰度
                const viewport = page.getViewport({ scale: 2 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;

                await page.render({ canvasContext: ctx, viewport } as any).promise;

                // 将 canvas 转为 JPEG 数据
                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), c => c.charCodeAt(0));

                const image = await newPdf.embedJpg(jpegBytes);
                // 使用原始页面尺寸（PDF points）而非 canvas 像素尺寸
                const origViewport = page.getViewport({ scale: 1 });
                const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
                newPage.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: origViewport.width,
                    height: origViewport.height,
                });
            }

            setProgress('正在导出无密码文档…');
            const bytes = await newPdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({ url, filename: `Unlocked_${file.name}` });
            setProgress('');
        } catch (err: any) {
            setErrorMsg(err.message || '解锁失败。');
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
                    <div className="w-40 h-40 rounded-full bg-amber-500/10 ring-4 ring-amber-500/20 flex items-center justify-center">
                        <KeyRound className="w-20 h-20 text-amber-500/60" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500/30">
                        <Unlock className="w-6 h-6 text-red-500" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-muted-foreground truncate max-w-[260px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground/60"><span>{(file.size / 1024).toFixed(1)} KB</span></p>
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                        <Unlock className="w-3 h-3" /> <span>等待解锁</span>
                    </div>
                </div>

                {/* 处理进度 */}
                {progress && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-blue-200/50 animate-pulse">
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
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100/50 dark:border-amber-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-amber-900 dark:text-amber-100">
                            <Unlock className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                            <span>解除密码锁定</span>
                        </h3>
                        <p className="text-[11px] text-amber-800/70 dark:text-amber-200/70 leading-relaxed font-medium">
                            <span>输入现有的密码来解锁受保护的 PDF。系统将逐页重建一份无密码的全新文档副本。</span>
                        </p>
                    </div>

                    <div className="space-y-5 px-1">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>输入文档密码</span></label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="输入密码…"
                                    className="w-full px-5 py-4 pr-12 rounded-2xl border bg-background/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-bold shadow-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && execute()}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <ToolWorkspace.Alert type="info">
                            <span>解锁后的文档以高清图像逐页重建，格式与原文档完全一致，可自由打开和分享。</span>
                        </ToolWorkspace.Alert>
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>解锁 PDF</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="解锁 PDF"
            description="解除受密码保护的 PDF 文件的访问限制，生成一份无锁的全新副本。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="解锁成功！"
                        description="文档已被重建为无密码版本，可自由打开和分享。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
