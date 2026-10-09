import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Layers, Scissors, FileArchive, FileText, Presentation, FileSpreadsheet,
    FileCode, PenTool, Type, RotateCw, Unlock, Lock,
    FolderTree, Hash, Scan, Languages, GitCompare,
    Crop, Star, EyeOff, Image, FileInput, Search, ShieldCheck
} from 'lucide-react';
import { CardTitle, CardDescription } from '@/components/ui/Card';

const tools = [
    // ... (保持 tools 数组内容一致，仅移除未使用的变量引用即可，此处直接重写以确保正确性)
    {
        category: '组织 PDF',
        items: [
            { id: 'merge', title: '合并 PDF', description: '将多个 PDF 合并为一个。', icon: <Layers />, color: 'bg-orange-500', href: '/merge' },
            { id: 'split', title: '拆分 PDF', description: '将 PDF 拆分为多个文档。', icon: <Scissors />, color: 'bg-orange-500', href: '/split' },
            { id: 'organize', title: '整理 PDF', description: '删除、提取或拖拽重排页面顺序。', icon: <FolderTree />, color: 'bg-orange-500', href: '/organize' },
            { id: 'scan', title: '扫描成 PDF', description: '移动端扫描文档。', icon: <Scan />, color: 'bg-orange-500', href: '/scan' },
        ]
    },
    {
        category: '转换 PDF',
        items: [
            { id: 'img2pdf', title: 'JPG 转 PDF', description: '将图片转换为 PDF。', icon: <Image />, color: 'bg-emerald-500', href: '/img2pdf' },
            { id: 'word2pdf', title: 'Word 转 PDF', description: 'DOCX 转为 PDF。', icon: <FileText />, color: 'bg-blue-600', href: '/word2pdf' },
            { id: 'ppt2pdf', title: 'PowerPoint 转 PDF', description: 'PPT 转为 PDF。', icon: <Presentation />, color: 'bg-orange-600', href: '/ppt2pdf' },
            { id: 'excel2pdf', title: 'Excel 转 PDF', description: 'XLSX 转为 PDF。', icon: <FileSpreadsheet />, color: 'bg-green-600', href: '/excel2pdf' },
            { id: 'html2pdf', title: 'HTML 转 PDF', description: '网页转为 PDF。', icon: <FileCode />, color: 'bg-cyan-500', href: '/html2pdf' },
        ]
    },
    {
        category: '从 PDF 转换',
        items: [
            { id: 'pdf2jpg', title: 'PDF 转 JPG', description: '提取 PDF 中的图像或转为 JPG。', icon: <Image />, color: 'bg-emerald-400', href: '/pdf2jpg' },
            { id: 'pdf2word', title: 'PDF 转 Word', description: 'PDF 转为可编辑 DOCX。', icon: <FileText />, color: 'bg-blue-400', href: '/pdf2word' },
            { id: 'pdf2ppt', title: 'PDF 转 PowerPoint', description: 'PDF 转为 PPTX 幻灯片。', icon: <Presentation />, color: 'bg-orange-400', href: '/pdf2ppt' },
            { id: 'pdf2excel', title: 'PDF 转 Excel', description: 'PDF 数据导入电子表格。', icon: <FileSpreadsheet />, color: 'bg-green-400', href: '/pdf2excel' },
            { id: 'pdf2a', title: 'PDF 转 PDF/A', description: '长期存档标准格式。', icon: <ShieldCheck />, color: 'bg-slate-500', href: '/pdf2pdfa' },
        ]
    },
    {
        category: '编辑与优化',
        items: [
            { id: 'compress', title: '压缩 PDF', description: '减小文件体积。', icon: <FileArchive />, color: 'bg-blue-500', href: '/compress' },
            { id: 'edit', title: '编辑 PDF', description: '添加文字、图像、形状。', icon: <PenTool />, color: 'bg-orange-500', href: '/edit' },
            { id: 'sign', title: '签署 PDF', description: '添加电子签名。', icon: <FileInput />, color: 'bg-rose-500', href: '/sign' },
            { id: 'watermark', title: '水印', description: '添加文字或图片水印。', icon: <Type />, color: 'bg-purple-500', href: '/watermark' },
            { id: 'rotate', title: '旋转 PDF', description: '翻转页面方向。', icon: <RotateCw />, color: 'bg-orange-500', href: '/rotate' },
            { id: 'unlock', title: '解锁 PDF', description: '解除密码保护。', icon: <Unlock />, color: 'bg-rose-600', href: '/unlock' },
            { id: 'protect', title: '保护 PDF', description: '添加加密密码。', icon: <Lock />, color: 'bg-rose-700', href: '/protect' },
        ]
    },
    {
        category: '高级工具',
        items: [
            { id: 'pagenumber', title: '页码', description: '为 PDF 添加页数。', icon: <Hash />, color: 'bg-purple-600', href: '/pagenumber' },
            { id: 'ocr', title: 'OCR PDF', description: '识别人像或扫描件文字。', icon: <Search />, color: 'bg-blue-800', href: '/ocr' },
            { id: 'compare', title: '比较 PDF', description: '查看文件差异。', icon: <GitCompare />, color: 'bg-slate-700', href: '/compare' },
            { id: 'translate', title: '翻译 PDF', description: '全文 AI 翻译。', icon: <Languages />, color: 'bg-indigo-600', href: '/translate' },
            { id: 'crop', title: '裁剪 PDF', description: '裁剪页面边距。', icon: <Crop />, color: 'bg-orange-600', href: '/crop' },
            { id: 'redact', title: '涂黑 PDF', description: '永久隐藏敏感信息。', icon: <EyeOff />, color: 'bg-gray-900', href: '/redact' },
        ]
    }
];

export function Home() {
    return (
        <div className="flex flex-col items-center justify-center space-y-16 py-12 px-4 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl space-y-6">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6">
                    属于您的全能{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500">
                        PDF 专家工具
                    </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    提供 30+ 种专业级 PDF 工具。所有操作均在<span className="font-bold text-foreground">浏览器本地加密运行</span>，无需上传，绝不泄露隐私，极速处理。
                </p>
            </div>

            <div className="space-y-16 w-full">
                {tools.map((section) => (
                    <div key={section.category} className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">{section.category}</h2>
                            <div className="h-px bg-border flex-1"></div>
                        </div>
                        <motion.div
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.05 }
                                }
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        >
                            {section.items.map((tool) => {
                                const isReady = !!tool.href;
                                const Component = isReady ? Link : 'div';

                                return (
                                    <motion.div
                                        key={tool.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                                        }}
                                        className="h-full"
                                    >
                                        <Component
                                            // @ts-ignore
                                            to={tool.href || '#'}
                                            className={`group block h-full relative p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ${isReady ? 'hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 cursor-pointer' : 'opacity-60 grayscale-[0.5]'
                                                }`}
                                        >
                                            <div className="flex flex-col space-y-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${tool.color} transform transition-transform group-hover:scale-110`}>
                                                    {React.isValidElement(tool.icon) && React.cloneElement(tool.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
                                                </div>
                                                <div className="space-y-1">
                                                    <CardTitle className="text-lg font-bold flex items-center">
                                                        {tool.title}
                                                        {!isReady && (
                                                            <span className="ml-2 text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted border border-border/50">
                                                                开发中
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="text-sm line-clamp-2 leading-snug">
                                                        {tool.description}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            {isReady && (
                                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                                    <Star className="w-4 h-4 text-primary fill-primary/20" />
                                                </div>
                                            )}
                                        </Component>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 text-center w-full max-w-4xl">
                <h3 className="text-xl font-bold mb-2">每一分每一秒，PDF Master 都在变得更强大</h3>
                <p className="text-muted-foreground">我们正在持续优化各项工具的高性能处理引擎。如果您有任何功能建议或定制需求，欢迎随时联系我们。</p>
            </div>
        </div>
    );
}
