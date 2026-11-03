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
import { HomeFAQ } from '@/components/common/HomeFAQ';
import { useTranslation } from '@/i18n/LanguageContext';

interface ToolDef {
    id: string;
    icon: React.ReactNode;
    color: string;
    href: string;
}

const TOOL_SECTIONS: Array<{ categoryKey: 'organize' | 'convert' | 'fromPdf' | 'editOptimize' | 'advanced'; items: ToolDef[] }> = [
    {
        categoryKey: 'organize',
        items: [
            { id: 'merge', icon: <Layers />, color: 'bg-orange-500', href: '/merge' },
            { id: 'split', icon: <Scissors />, color: 'bg-orange-500', href: '/split' },
            { id: 'organize', icon: <FolderTree />, color: 'bg-orange-500', href: '/organize' },
            { id: 'scan', icon: <Scan />, color: 'bg-orange-500', href: '/scan' },
        ]
    },
    {
        categoryKey: 'convert',
        items: [
            { id: 'img2pdf', icon: <Image />, color: 'bg-emerald-500', href: '/img2pdf' },
            { id: 'word2pdf', icon: <FileText />, color: 'bg-blue-600', href: '/word2pdf' },
            { id: 'ppt2pdf', icon: <Presentation />, color: 'bg-orange-600', href: '/ppt2pdf' },
            { id: 'excel2pdf', icon: <FileSpreadsheet />, color: 'bg-green-600', href: '/excel2pdf' },
            { id: 'html2pdf', icon: <FileCode />, color: 'bg-cyan-500', href: '/html2pdf' },
        ]
    },
    {
        categoryKey: 'fromPdf',
        items: [
            { id: 'pdf2jpg', icon: <Image />, color: 'bg-emerald-400', href: '/pdf2jpg' },
            { id: 'pdf2word', icon: <FileText />, color: 'bg-blue-400', href: '/pdf2word' },
            { id: 'pdf2ppt', icon: <Presentation />, color: 'bg-orange-400', href: '/pdf2ppt' },
            { id: 'pdf2excel', icon: <FileSpreadsheet />, color: 'bg-green-400', href: '/pdf2excel' },
            { id: 'pdf2a', icon: <ShieldCheck />, color: 'bg-slate-500', href: '/pdf2pdfa' },
        ]
    },
    {
        categoryKey: 'editOptimize',
        items: [
            { id: 'compress', icon: <FileArchive />, color: 'bg-blue-500', href: '/compress' },
            { id: 'edit', icon: <PenTool />, color: 'bg-orange-500', href: '/edit' },
            { id: 'sign', icon: <FileInput />, color: 'bg-rose-500', href: '/sign' },
            { id: 'watermark', icon: <Type />, color: 'bg-purple-500', href: '/watermark' },
            { id: 'rotate', icon: <RotateCw />, color: 'bg-orange-500', href: '/rotate' },
            { id: 'unlock', icon: <Unlock />, color: 'bg-rose-600', href: '/unlock' },
            { id: 'protect', icon: <Lock />, color: 'bg-rose-700', href: '/protect' },
        ]
    },
    {
        categoryKey: 'advanced',
        items: [
            { id: 'pagenumber', icon: <Hash />, color: 'bg-purple-600', href: '/pagenumber' },
            { id: 'ocr', icon: <Search />, color: 'bg-blue-800', href: '/ocr' },
            { id: 'compare', icon: <GitCompare />, color: 'bg-slate-700', href: '/compare' },
            { id: 'translate', icon: <Languages />, color: 'bg-indigo-600', href: '/translate' },
            { id: 'crop', icon: <Crop />, color: 'bg-orange-600', href: '/crop' },
            { id: 'redact', icon: <EyeOff />, color: 'bg-gray-900', href: '/redact' },
        ]
    }
];

export function Home() {
    const { t, lang } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center space-y-16 py-12 px-4 max-w-7xl mx-auto">
            {/* Hero 标题区域 */}
            <div className="text-center max-w-3xl space-y-6">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6">
                    {t.home.heroTitlePrefix}{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500">
                        {t.home.heroTitleHighlight}
                    </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    {t.home.heroSubtitlePrefix}
                    <span className="font-bold text-foreground mx-1">
                        {t.home.heroSubtitleHighlight}
                    </span>
                    {t.home.heroSubtitleSuffix}
                </p>
            </div>

            {/* 工具网格区域 */}
            <div className="space-y-16 w-full">
                {TOOL_SECTIONS.map((section) => (
                    <div key={section.categoryKey} className="space-y-8">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
                                {t.home.categories[section.categoryKey]}
                            </h2>
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
                                const meta = t.home.tools[tool.id] || { title: tool.id, description: '' };

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
                                                        {meta.title}
                                                        {!isReady && (
                                                            <span className="ml-2 text-[10px] font-normal px-2 py-0.5 rounded-full bg-muted border border-border/50">
                                                                {lang === 'zh' ? '开发中' : 'Coming soon'}
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="text-sm line-clamp-2 leading-snug">
                                                        {meta.description}
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

            {/* 核心优势与常见问题 */}
            <HomeFAQ />

            {/* 底部愿景卡片 */}
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 text-center w-full max-w-4xl">
                <h3 className="text-xl font-bold mb-2">
                    {lang === 'zh' ? '每一分每一秒，PDF Master 都在变得更强大' : 'Continuously Evolving to Empower Your PDF Workflow'}
                </h3>
                <p className="text-muted-foreground text-sm">
                    {lang === 'zh' 
                        ? '我们正在持续优化各项工具的高性能处理引擎。如果您有任何功能建议或定制需求，欢迎随时联系我们。'
                        : 'We are continuously engineering lightning-fast client-side engines. Have suggestions or feature requests? Feel free to reach out.'
                    }
                </p>
            </div>
        </div>
    );
}
