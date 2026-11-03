import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Language, TranslationSchema } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';

interface LanguageContextType {
    lang: Language;
    t: TranslationSchema;
    setLang: (lang: Language) => void;
    toggleLanguage: () => void;
}

const translations: Record<Language, TranslationSchema> = { zh, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectDefaultLanguage(): Language {
    if (typeof window === 'undefined') return 'en';

    // 1. 用户过去手动保存的选择最高优先级
    const saved = localStorage.getItem('pdf_master_lang') as Language | null;
    if (saved === 'zh' || saved === 'en') {
        return saved;
    }

    // 2. 检查浏览器语言环境
    const browserLanguages = navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language || ''];

    for (const l of browserLanguages) {
        if (!l) continue;
        const normalized = l.toLowerCase();
        // 命中任何中文变体（zh-CN, zh-TW, zh-HK, zh-Hans, zh-Hant 等）
        if (normalized.startsWith('zh')) {
            return 'zh';
        }
    }

    // 3. 海外非中文环境默认返回英文
    return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>(() => detectDefaultLanguage());

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        try {
            localStorage.setItem('pdf_master_lang', newLang);
            document.documentElement.lang = newLang === 'zh' ? 'zh-CN' : 'en';
        } catch {
            // ignore localStorage quota errors
        }
    };

    const toggleLanguage = () => {
        setLang(lang === 'zh' ? 'en' : 'zh');
    };

    useEffect(() => {
        // 同步 document 标签语言属性
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    }, [lang]);

    const value: LanguageContextType = {
        lang,
        t: translations[lang],
        setLang,
        toggleLanguage
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}
