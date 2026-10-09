import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ToolWorkspace } from '@/components/layout/ToolWorkspace';
import { SuccessState } from '@/components/ui/SuccessState';
import { 
    FileSpreadsheet, ArrowRight, 
    Layers, Layout, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type OrientationType = 'portrait' | 'landscape';
type ThemeType = 'blue' | 'gray' | 'minimal' | 'dark';

interface SheetData {
    name: string;
    rows: (string | number)[][];
    rowCount: number;
    colCount: number;
}

export function ExcelToPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [sheets, setSheets] = useState<SheetData[]>([]);
    const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);

    // 排版设置
    const [orientation, setOrientation] = useState<OrientationType>('landscape');
    const [theme, setTheme] = useState<ThemeType>('blue');
    const [showZebra, setShowZebra] = useState<boolean>(true);
    const [showGridlines, setShowGridlines] = useState<boolean>(true);
    const [exportAllSheets, setExportAllSheets] = useState<boolean>(false);

    // 运行状态
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);

    const tableContainerRef = useRef<HTMLDivElement>(null);

    // 读取并解析 Excel 文件
    const handleFilesSelected = async (selectedFiles: File[]) => {
        setErrorMsg(null);
        setResult(null);
        if (selectedFiles.length === 0) return;

        const selectedFile = selectedFiles[0];
        setFile(selectedFile);
        setIsProcessing(true);
        setProgress('正在解析 Excel 结构与单元格数据…');

        try {
            const ab = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(ab, { type: 'array' });

            const parsedSheets: SheetData[] = workbook.SheetNames.map(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                // 转换为二维数组（包含空单元格填充为空字符串）
                const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
                    header: 1,
                    defval: ''
                });

                // 计算最大列数
                let maxCols = 0;
                rawRows.forEach(row => {
                    if (row.length > maxCols) maxCols = row.length;
                });

                return {
                    name: sheetName,
                    rows: rawRows,
                    rowCount: rawRows.length,
                    colCount: maxCols
                };
            }).filter(s => s.rowCount > 0);

            if (parsedSheets.length === 0) {
                throw new Error('未在工作簿中读取到有效的数据行，请检查文件是否为空。');
            }

            setSheets(parsedSheets);
            setActiveSheetIndex(0);
            
            // 如果列数较多（超过6列），智能默认使用横向排版
            if (parsedSheets[0].colCount > 6) {
                setOrientation('landscape');
            } else {
                setOrientation('portrait');
            }

            setProgress('');
        } catch (err: any) {
            console.error('Excel 解析失败:', err);
            setErrorMsg(err.message || '无法解析此表格文件，请确保文件格式为标准的 .xlsx / .xls / .csv。');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult(null);
        setFile(null);
        setSheets([]);
        setActiveSheetIndex(0);
        setErrorMsg(null);
        setProgress('');
    };

    // 导出为 PDF
    const executeExport = async () => {
        if (sheets.length === 0 || !tableContainerRef.current) return;
        setIsProcessing(true);
        setErrorMsg(null);
        setProgress('正在渲染高清矢量快照…');

        try {
            const isLandscape = orientation === 'landscape';
            // A4 规格尺寸：横向 297 x 210 mm，纵向 210 x 297 mm
            const pdfWidth = isLandscape ? 297 : 210;
            const pdfHeight = isLandscape ? 210 : 297;

            const pdf = new jsPDF({
                orientation: isLandscape ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const sheetsToExport = exportAllSheets ? sheets : [sheets[activeSheetIndex]];

            for (let sIdx = 0; sIdx < sheetsToExport.length; sIdx++) {
                const sheet = sheetsToExport[sIdx];
                setProgress(`正在排版工作表 [${sheet.name}] (${sIdx + 1} / ${sheetsToExport.length})…`);

                // 动态创建一个临时的离线渲染容器以保持绝对准确的排版宽度
                const renderDiv = document.createElement('div');
                renderDiv.style.position = 'absolute';
                renderDiv.style.left = '-9999px';
                renderDiv.style.top = '0';
                renderDiv.style.width = isLandscape ? '1400px' : '1000px';
                renderDiv.style.backgroundColor = '#ffffff';
                renderDiv.style.padding = '30px';
                renderDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';

                // 构建表格标题
                const titleEl = document.createElement('h2');
                titleEl.innerText = `${file?.name.replace(/\.[^/.]+$/, '')} - ${sheet.name}`;
                titleEl.style.fontSize = '18px';
                titleEl.style.fontWeight = 'bold';
                titleEl.style.marginBottom = '16px';
                titleEl.style.color = '#1e293b';
                renderDiv.appendChild(titleEl);

                // 构建表格 DOM
                const tableEl = document.createElement('table');
                tableEl.style.width = '100%';
                tableEl.style.borderCollapse = 'collapse';
                tableEl.style.fontSize = '12px';

                sheet.rows.forEach((row, rIdx) => {
                    const tr = document.createElement('tr');
                    const isHeader = rIdx === 0;

                    if (isHeader) {
                        if (theme === 'blue') tr.style.backgroundColor = '#2563eb';
                        else if (theme === 'gray') tr.style.backgroundColor = '#475569';
                        else if (theme === 'dark') tr.style.backgroundColor = '#0f172a';
                        else tr.style.backgroundColor = '#f1f5f9';
                        tr.style.color = theme === 'minimal' ? '#0f172a' : '#ffffff';
                        tr.style.fontWeight = 'bold';
                    } else if (showZebra && rIdx % 2 === 1) {
                        tr.style.backgroundColor = theme === 'blue' ? '#f0f7ff' : '#f8fafc';
                    } else {
                        tr.style.backgroundColor = '#ffffff';
                    }

                    for (let cIdx = 0; cIdx < sheet.colCount; cIdx++) {
                        const cellVal = row[cIdx] !== undefined ? String(row[cIdx]) : '';
                        const td = document.createElement(isHeader ? 'th' : 'td');
                        td.innerText = cellVal;
                        td.style.padding = '8px 10px';
                        td.style.textAlign = typeof row[cIdx] === 'number' ? 'right' : 'left';
                        td.style.wordBreak = 'break-word';

                        if (showGridlines) {
                            td.style.border = '1px solid ' + (isHeader ? 'rgba(255,255,255,0.2)' : '#e2e8f0');
                        }

                        tr.appendChild(td);
                    }
                    tableEl.appendChild(tr);
                });

                renderDiv.appendChild(tableEl);
                document.body.appendChild(renderDiv);

                // 通过 html2canvas 捕捉
                const canvas = await html2canvas(renderDiv, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                document.body.removeChild(renderDiv);

                // 将 Canvas 按比例切片放入 PDF
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const margin = 10;
                const printWidth = pdfWidth - margin * 2;
                const printHeight = (canvas.height * printWidth) / canvas.width;

                let heightLeft = printHeight;
                let position = margin;

                if (sIdx > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
                heightLeft -= (pdfHeight - margin * 2);

                while (heightLeft > 0) {
                    position = heightLeft - printHeight + margin;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
                    heightLeft -= (pdfHeight - margin * 2);
                }
            }

            setProgress('正在封装 PDF 导出文件…');
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);

            setResult({
                url,
                filename: `${file?.name.replace(/\.[^/.]+$/, '')}_Converted.pdf`
            });
            setProgress('');
        } catch (err: any) {
            console.error('Excel 转 PDF 出错:', err);
            setErrorMsg(err.message || '导出 PDF 失败，请检查表格内容复杂度。');
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const currentSheet = sheets[activeSheetIndex] || null;

    // 左侧实时预览区
    const renderLeftPanel = () => {
        if (!file || sheets.length === 0 || !currentSheet) return null;

        return (
            <div className="flex-1 flex flex-col h-full bg-zinc-100/60 dark:bg-zinc-950/40 overflow-hidden">
                {/* 工作表 Sheet 标签页切换栏 */}
                <div className="h-14 bg-background border-b px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-2 overflow-x-auto max-w-xl">
                        <span className="text-xs font-bold text-muted-foreground mr-1 uppercase flex items-center">
                            <Layers className="w-3.5 h-3.5 mr-1" />
                            <span>工作表:</span>
                        </span>
                        {sheets.map((s, idx) => (
                            <button
                                key={s.name}
                                onClick={() => setActiveSheetIndex(idx)}
                                className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                                    activeSheetIndex === idx
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                <span>{s.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span className="bg-muted px-2 py-0.5 rounded font-mono">
                            <span>{currentSheet.rowCount} 行 × {currentSheet.colCount} 列</span>
                        </span>
                    </div>
                </div>

                {/* 表格纸张画布效果展示 */}
                <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                    <div 
                        ref={tableContainerRef}
                        className={`bg-white text-slate-900 shadow-2xl rounded-xl p-8 border border-border/60 transition-all ${
                            orientation === 'landscape' ? 'w-full max-w-4xl' : 'w-full max-w-2xl'
                        }`}
                    >
                        {/* 页面表头 */}
                        <div className="border-b pb-4 mb-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    <span>{file.name.replace(/\.[^/.]+$/, '')}</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    <span>工作表：{currentSheet.name}（当前共 {currentSheet.rowCount} 行记录）</span>
                                </p>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                <span>{orientation === 'landscape' ? 'A4 横向版式' : 'A4 纵向版式'}</span>
                            </span>
                        </div>

                        {/* 数据表格 */}
                        <div className="overflow-x-auto">
                            <table className={`w-full text-xs text-left ${showGridlines ? 'border border-slate-200' : ''}`}>
                                <tbody>
                                    {currentSheet.rows.slice(0, 100).map((row, rIdx) => {
                                        const isHeader = rIdx === 0;
                                        return (
                                            <tr 
                                                key={rIdx}
                                                className={`transition-colors ${
                                                    isHeader
                                                        ? theme === 'blue' 
                                                            ? 'bg-blue-600 text-white font-bold'
                                                            : theme === 'gray'
                                                                ? 'bg-slate-700 text-white font-bold'
                                                                : theme === 'dark'
                                                                    ? 'bg-slate-950 text-white font-bold'
                                                                    : 'bg-slate-100 text-slate-900 font-bold'
                                                        : showZebra && rIdx % 2 === 1
                                                            ? theme === 'blue' ? 'bg-blue-50/60' : 'bg-slate-50'
                                                            : 'bg-white hover:bg-slate-50/80'
                                                }`}
                                            >
                                                {Array.from({ length: currentSheet.colCount }).map((_, cIdx) => (
                                                    <td 
                                                        key={cIdx} 
                                                        className={`p-2.5 leading-snug ${
                                                            showGridlines ? 'border border-slate-200/80' : ''
                                                        } ${typeof row[cIdx] === 'number' ? 'text-right' : 'text-left'}`}
                                                    >
                                                        <span>{row[cIdx] !== undefined ? String(row[cIdx]) : ''}</span>
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {currentSheet.rowCount > 100 && (
                                <p className="text-center text-xs text-slate-400 py-4 italic">
                                    <span>[为保持流畅，预览仅显示前 100 行；导出 PDF 时将完整呈现全部 {currentSheet.rowCount} 行]</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {progress && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl border border-blue-500 animate-pulse z-50">
                        <span>{progress}</span>
                    </div>
                )}
            </div>
        );
    };

    // 右侧设置面板
    const renderRightPanel = () => {
        return (
            <>
                <ToolWorkspace.Panel>
                    <div className="space-y-6 md:pt-4">
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
                            <h3 className="text-sm font-bold flex items-center mb-2 text-emerald-900 dark:text-emerald-100">
                                <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                                <span>电子表格排版优化引擎</span>
                            </h3>
                            <p className="text-[11px] text-emerald-800/70 dark:text-emerald-200/70 leading-relaxed font-medium">
                                <span>纯前端解析 Excel 单元格与公式数值，提供纸张自适应排版、斑马纹美化，并自动切片为标准 A4 PDF。</span>
                            </p>
                        </div>

                        {file && sheets.length > 0 && (
                            <div className="space-y-5 px-1">
                                {/* 纸张方向 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <Layout className="w-3.5 h-3.5 mr-1" />
                                        <span>PDF 纸张版式</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setOrientation('landscape')}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all ${
                                                orientation === 'landscape'
                                                    ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                    : 'border-border/60 hover:border-primary/40 bg-background'
                                            }`}
                                        >
                                            <div className="text-xs font-bold"><span>横向 A4 (Landscape)</span></div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5"><span>宽表格推荐，防列截断</span></div>
                                        </button>
                                        <button
                                            onClick={() => setOrientation('portrait')}
                                            className={`p-3 rounded-2xl border-2 text-left transition-all ${
                                                orientation === 'portrait'
                                                    ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                    : 'border-border/60 hover:border-primary/40 bg-background'
                                            }`}
                                        >
                                            <div className="text-xs font-bold"><span>纵向 A4 (Portrait)</span></div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5"><span>适合窄表或多行长清单</span></div>
                                        </button>
                                    </div>
                                </div>

                                {/* 表格视觉主题 */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center">
                                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                                        <span>配色与风格主题</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'blue', label: '商务典雅蓝', color: 'bg-blue-600' },
                                            { key: 'gray', label: '深邃高管灰', color: 'bg-slate-700' },
                                            { key: 'dark', label: '极简纯粹黑', color: 'bg-slate-950' },
                                            { key: 'minimal', label: '浅灰无高亮', color: 'bg-slate-200' },
                                        ].map(t => (
                                            <button
                                                key={t.key}
                                                onClick={() => setTheme(t.key as ThemeType)}
                                                className={`p-3 rounded-2xl border-2 text-left flex items-center space-x-2.5 transition-all ${
                                                    theme === t.key
                                                        ? 'border-primary bg-primary/5 font-bold shadow-sm'
                                                        : 'border-border/60 hover:border-primary/40 bg-background'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 rounded-full ${t.color} shrink-0`} />
                                                <span className="text-xs font-bold"><span>{t.label}</span></span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 排版辅助微调 */}
                                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground"><span>开启交替斑马纹</span></span>
                                        <input 
                                            type="checkbox"
                                            checked={showZebra}
                                            onChange={(e) => setShowZebra(e.target.checked)}
                                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground"><span>绘制完整单元格边框线</span></span>
                                        <input 
                                            type="checkbox"
                                            checked={showGridlines}
                                            onChange={(e) => setShowGridlines(e.target.checked)}
                                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                        <span className="text-xs font-bold text-muted-foreground">
                                            <span>一键导出全部工作表 ({sheets.length} 个)</span>
                                        </span>
                                        <input 
                                            type="checkbox"
                                            checked={exportAllSheets}
                                            onChange={(e) => setExportAllSheets(e.target.checked)}
                                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {errorMsg && <ToolWorkspace.Alert type="error">{errorMsg}</ToolWorkspace.Alert>}
                    </div>
                </ToolWorkspace.Panel>

                <ToolWorkspace.Footer>
                    <Button
                        size="lg"
                        onClick={executeExport}
                        disabled={isProcessing || sheets.length === 0}
                        isLoading={isProcessing}
                        className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-xl shadow-red-500/20 h-16 text-[19px] rounded-2xl font-bold transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>转换为排版 PDF</span> <ArrowRight className="w-6 h-6 ml-2" />
                    </Button>
                </ToolWorkspace.Footer>
            </>
        );
    };

    return (
        <ToolWorkspace
            title="Excel 转 PDF"
            description="将 XLSX/XLS/CSV 电子表格转换为排版优美的高清 PDF，支持横竖版排版切换与多工作表导出。"
            fileCount={file ? 1 : 0}
            onFilesSelected={handleFilesSelected}
            dropzoneAccept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            dropzoneMultiple={false}
            dropzoneTitle="放入 Excel 文件"
            dropzoneDescription="支持 .xlsx, .xls 或 .csv 表格文件"
            leftPanel={renderLeftPanel()}
            rightPanel={renderRightPanel()}
            isSuccess={!!result}
            successPanel={
                result && (
                    <SuccessState
                        title="Excel 转换 PDF 成功！"
                        description="您的电子表格已根据选定版式排版切片并成功生成为 PDF 文件。"
                        results={[{ url: result.url, filename: result.filename }]}
                        onReset={handleReset}
                    />
                )
            }
        />
    );
}
