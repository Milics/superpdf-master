import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
// 使用支持加密的分支版本 pdf-lib-plus-encrypt
import { PDFDocument } from 'pdf-lib-plus-encrypt';

export function ProtectPDF() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
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
        setConfirmPassword('');
        setErrorMsg(null);
    };

    const execute = async () => {
        if (!file) return;
        if (!password.trim()) {
            setErrorMsg('请输入一个保护密码。');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg('两次输入的密码不一致，请重新确认。');
            return;
        }
        if (password.length < 4) {
            setErrorMsg('密码至少需要 4 位字符。');
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const ab = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);

            // 先调用 encrypt() 设置密码保护
            await pdfDoc.encrypt({
                userPassword: password,    // 打开文档所需要的密码
                ownerPassword: password,   // 修改权限所需要的密码
            });

            // 再导出已加密的 PDF 字节
            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({ url, filename: `Protected_${file.name}` });
        } catch (err: any) {
            setErrorMsg(err.message || '加密失败。');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderLeftPanel = () => {
        if (!file) return null;
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                {/* 盾牌动画 */}
                <div className="relative">
                    <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
                        password.length >= 4 ? 'bg-emerald-500/10 ring-4 ring-emerald-500/30 scale-110' : 'bg-muted/30 ring-4 ring-border/30'
                    }`}>
                        <ShieldCheck className={`w-20 h-20 transition-all duration-500 ${
                            password.length >= 4 ? 'text-emerald-500' : 'text-muted-foreground/30'
                        }`} />
                    </div>
                    {password.length >= 4 && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg animate-in zoom-in-95">
                            <span>防护已就绪</span>
                        </div>
                    )}
                </div>

                <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-muted-foreground truncate max-w-[260px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground/60">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                    </p>
                </div>

                {/* 密码强度指示条 */}
                <div className="w-48 space-y-2">
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map(level => (
                            <div key={level} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                password.length >= level * 3
                                    ? level <= 1 ? 'bg-red-400' : level <= 2 ? 'bg-amber-400' : level <= 3 ? 'bg-emerald-400' : 'bg-emerald-500'
                                    : 'bg-muted'
                            }`} />
                        ))}
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground font-medium">
                        <span>{password.length === 0 ? '等待设置密码' : password.length < 6 ? '密码强度：弱' : password.length < 10 ? '密码强度：中' : '密码强度：强'}</span>
                    </p>
                </div>
            </div>
        );
    };

    const renderRightPanel = () => (
        <>
            <ToolWorkspace.Panel>
                <div className="space-y-6 md:pt-4">
                    <div className="bg-rose-50/50 dark:bg-rose-900/10 p-5 rounded-3xl border border-rose-100/50 dark:border-rose-800/30">
                        <h3 className="text-sm font-bold flex items-center mb-2 text-rose-900 dark:text-rose-100">
                            <Lock className="w-5 h-5 mr-2 text-rose-600 dark:text-rose-400" />
                            <span>文档加密保护</span>
                        </h3>
                        <p className="text-[11px] text-rose-800/70 dark:text-rose-200/70 leading-relaxed font-medium">
                            <span>为您的 PDF 设置访问密码。没有正确密码的人将无法打开或查看文档内容。</span>
                        </p>
                    </div>

                    <div className="space-y-5 px-1">
                        {/* 密码输入 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>设置保护密码</span></label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="输入密码…"
                                    className="w-full px-5 py-4 pr-12 rounded-2xl border bg-background/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-bold shadow-sm"
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

                        {/* 确认密码 */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide"><span>确认密码</span></label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="再次输入密码…"
                                className={`w-full px-5 py-4 rounded-2xl border bg-background/50 focus:bg-background focus:outline-none focus:ring-2 transition-all text-sm font-bold shadow-sm ${
                                    confirmPassword && confirmPassword !== password
                                        ? 'border-destructive focus:ring-destructive/50'
                                        : confirmPassword && confirmPassword === password
                                            ? 'border-emerald-500 focus:ring-emerald-500/50'
                                            : 'focus:ring-primary/50'
                                }`}
                            />
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-xs text-destructive font-medium ml-1"><span>密码不一致</span></p>
                            )}
                        </div>
                    </div>

                    {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                </div>
            </ToolWorkspace.Panel>

            <ToolWorkspace.Footer>
                <Button
                    size="lg"
                    onClick={execute}
                    disabled={isProcessing || !password.trim() || password !== confirmPassword}
                    isLoading={isProcessing}
                    className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
                >
                    <span>加密保护</span> <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </ToolWorkspace.Footer>
        </>
    );

    return (
        <ToolWorkspace
            title="保护 PDF"
            description="为您的敏感文档设置密码保护，防止未授权访问。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneMultiple={false}
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="文档已加密！"
                        description="您的 PDF 已被安全保护，只有持有密码的人才能访问。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
