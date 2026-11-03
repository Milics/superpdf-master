import React, { useEffect } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { FileText, SunMedium, Moon, Globe } from 'lucide-react';
import { PdfMasterLogo } from '@/components/ui/PdfMasterLogo';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';
import { SEOHead } from '@/components/common/SEO';
import { useTranslation } from '@/i18n/LanguageContext';

export function Layout() {
    const { lang, t, toggleLanguage } = useTranslation();
    const [isDark, setIsDark] = React.useState(false);
    const location = useLocation();
    const currentOutlet = useOutlet();

    useEffect(() => {
        // Check initial system preference or localStorage
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased transition-colors duration-300">
            <SEOHead />
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2.5 transition-transform hover:scale-105 active:scale-95 group">
                        <div className="flex items-center justify-center transition-transform group-hover:scale-105">
                            <PdfMasterLogo className="h-9 w-9" />
                        </div>
                        <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                            PDF Master
                        </span>
                    </Link>

                    <div className="flex items-center space-x-3">
                        {/* 语言切换按钮 (中/EN) */}
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground transition-all text-xs cursor-pointer active:scale-95 shadow-xs"
                            title={t.common.langSwitch}
                        >
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{lang === 'zh' ? 'EN / 英文' : '中文 (ZH)'}</span>
                        </button>

                        {/* 主题切换按钮 */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            title={t.common.themeToggle}
                        >
                            {isDark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 relative">
                <AnimatePresence mode="wait" initial={false}>
                    <PageTransition key={location.pathname}>
                        {currentOutlet}
                    </PageTransition>
                </AnimatePresence>
            </main>

            <footer className="border-t py-6 md:py-0 bg-muted/20">
                <div className="container mx-auto px-4 flex flex-col md:h-16 items-center justify-between md:flex-row space-y-4 md:space-y-0 text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} PDF Master Tool. {t.common.privacyFooter}</p>
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center"><FileText className="w-4 h-4 mr-1" />{t.common.localSecureBadge}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
