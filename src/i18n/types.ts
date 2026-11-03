export type Language = 'zh' | 'en';

export interface ToolMetaTranslation {
    title: string;
    description: string;
}

export interface TranslationSchema {
    common: {
        appName: string;
        brandTagline: string;
        localSecureBadge: string;
        privacyFooter: string;
        themeToggle: string;
        langSwitch: string;
        langCurrent: string;
        langZh: string;
        langEn: string;
        backToHome: string;
        download: string;
        continueOther: string;
        processing: string;
        dropzoneTitle: string;
        dropzoneDesc: string;
        dropzoneMultiDesc: string;
        oneClickRemove: string;
    };
    home: {
        heroTitlePrefix: string;
        heroTitleHighlight: string;
        heroSubtitlePrefix: string;
        heroSubtitleHighlight: string;
        heroSubtitleSuffix: string;
        categories: {
            organize: string;
            convert: string;
            fromPdf: string;
            editOptimize: string;
            advanced: string;
        };
        tools: Record<string, ToolMetaTranslation>;
        whyChooseTitle: string;
        whyChooseDesc: string;
        features: {
            privacyTitle: string;
            privacyDesc: string;
            speedTitle: string;
            speedDesc: string;
            freeTitle: string;
            freeDesc: string;
            pwaTitle: string;
            pwaDesc: string;
        };
        faqTitle: string;
        faqs: Array<{ q: string; a: string }>;
    };
    toolWorkspace: {
        changeOrderHint: string;
        successTitle: string;
        successMergedFiles: string;
        readyToSave: string;
    };
}
