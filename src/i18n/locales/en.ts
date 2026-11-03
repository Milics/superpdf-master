import type { TranslationSchema } from '../types';

export const en: TranslationSchema = {
    common: {
        appName: 'PDF Master',
        brandTagline: '100% Client-Side Processing. Total Privacy.',
        localSecureBadge: '100% Local & Secure',
        privacyFooter: 'Processed securely in your browser. Your privacy is guaranteed.',
        themeToggle: 'Toggle Light / Dark Mode',
        langSwitch: 'Switch Language (语言)',
        langCurrent: 'English',
        langZh: '简体中文',
        langEn: 'English',
        backToHome: 'Back to Home',
        download: 'Download Now',
        continueOther: 'Process Another File',
        processing: 'Processing…',
        dropzoneTitle: 'Select or drop your PDF documents here',
        dropzoneDesc: 'Click to browse or drag and drop files',
        dropzoneMultiDesc: 'Multiple files supported. You can rearrange their order on the next step',
        oneClickRemove: 'Remove',
    },
    home: {
        heroTitlePrefix: 'Your Complete & Private',
        heroTitleHighlight: 'PDF Power Tools',
        heroSubtitlePrefix: 'Over 30+ professional PDF utilities. Everything runs',
        heroSubtitleHighlight: '100% locally in your browser',
        heroSubtitleSuffix: '— zero server uploads, lightning fast, and strictly confidential.',
        categories: {
            organize: 'Organize PDF',
            convert: 'Convert to PDF',
            fromPdf: 'Convert from PDF',
            editOptimize: 'Edit & Optimize',
            advanced: 'Advanced Tools',
        },
        tools: {
            merge: { title: 'Merge PDF', description: 'Combine multiple PDF files into one.' },
            split: { title: 'Split PDF', description: 'Separate one PDF or extract specific pages.' },
            organize: { title: 'Organize PDF', description: 'Sort, reorder, delete, or rotate pages visually.' },
            scan: { title: 'Scan to PDF', description: 'Capture camera documents directly to PDF.' },
            img2pdf: { title: 'JPG to PDF', description: 'Convert images (JPG, PNG) into a single PDF.' },
            word2pdf: { title: 'Word to PDF', description: 'Convert DOCX documents to PDF format.' },
            ppt2pdf: { title: 'PowerPoint to PDF', description: 'Convert PPT slides into crisp PDF files.' },
            excel2pdf: { title: 'Excel to PDF', description: 'Transform spreadsheets (XLSX) to PDF tables.' },
            html2pdf: { title: 'HTML to PDF', description: 'Turn web pages or raw HTML into PDF.' },
            pdf2jpg: { title: 'PDF to JPG', description: 'Extract pages from PDF as high-resolution images.' },
            pdf2word: { title: 'PDF to Word', description: 'Convert your PDF to editable DOCX documents.' },
            pdf2ppt: { title: 'PDF to PowerPoint', description: 'Turn PDF slides into editable PPTX.' },
            pdf2excel: { title: 'PDF to Excel', description: 'Extract tabular PDF data into Excel sheets.' },
            pdf2a: { title: 'PDF to PDF/A', description: 'Convert to ISO-standardized archival PDF.' },
            compress: { title: 'Compress PDF', description: 'Reduce PDF file size while optimizing quality.' },
            edit: { title: 'Edit PDF', description: 'Add text, annotations, shapes, and markings.' },
            sign: { title: 'Sign PDF', description: 'Add your electronic signature to any contract.' },
            watermark: { title: 'Watermark PDF', description: 'Stamp customized text or image watermarks.' },
            rotate: { title: 'Rotate PDF', description: 'Rotate orientations of specific or all pages.' },
            unlock: { title: 'Unlock PDF', description: 'Remove PDF password and permissions restrictions.' },
            protect: { title: 'Protect PDF', description: 'Encrypt your document with robust passwords.' },
            pagenumber: { title: 'Page Numbers', description: 'Add custom page numbering and footers.' },
            ocr: { title: 'OCR PDF', description: 'Extract selectable text from scans & images.' },
            compare: { title: 'Compare PDF', description: 'Side-by-side visual difference comparison.' },
            translate: { title: 'Translate PDF', description: 'Translate document contents with AI precision.' },
            crop: { title: 'Crop PDF', description: 'Trim page margins and adjust visible frame.' },
            redact: { title: 'Redact PDF', description: 'Permanently black out sensitive confidential data.' },
        },
        whyChooseTitle: 'Why Choose PDF Master?',
        whyChooseDesc: 'Eliminate clunky server uploads and privacy breaches. Enjoy faster, safer, and cleaner PDF workflows.',
        features: {
            privacyTitle: '100% Local Privacy & Security',
            privacyDesc: 'Zero server uploads. Everything runs directly inside your browser memory. Works offline with total peace of mind.',
            speedTitle: 'No Limits · Instant Processing',
            speedDesc: 'No upload waiting lines or bandwidth throttling. Directly harnesses your local CPU for lightning-fast conversions.',
            freeTitle: 'Completely Free · No Watermarks',
            freeDesc: 'Enjoy full professional-tier capabilities with zero hidden paywalls, subscriptions, or intrusive forced watermarks.',
            pwaTitle: 'Cross-Platform · Install-Free',
            pwaDesc: 'Seamlessly works across Chrome, Safari, Edge, Firefox on macOS, Windows, Linux, iOS, and Android.',
        },
        faqTitle: 'Frequently Asked Questions',
        faqs: [
            {
                q: 'Are my files uploaded to any servers? Is my data secure?',
                a: 'Never! PDF Master utilizes cutting-edge WebAssembly, Web Workers, and local Canvas engines. All parsing, merging, splitting, and rendering happen strictly inside your browser sandbox. No file ever touches our or any third-party servers.'
            },
            {
                q: 'Are there any file size or conversion limits?',
                a: 'There are no artificial limits! Unlike traditional cloud tools that cap file sizes at 10MB or restrict you to 2 files per day, PDF Master leverages your device hardware to handle large documents freely.'
            },
            {
                q: 'Why does PDF Master process files so much faster?',
                a: 'Because you skip the upload and download wait entirely! Large 100MB+ files are processed directly in your RAM, eliminating network latency and saving precious data bandwidth.'
            },
            {
                q: 'Does it work on smartphones, tablets, or Macbooks?',
                a: 'Yes, absolutely! PDF Master is a fully responsive Progressive Web App (PWA) compatible with all modern browsers on Windows, macOS, Linux, iPhone, iPad, and Android.'
            }
        ]
    },
    toolWorkspace: {
        changeOrderHint: 'To change the order of your PDF files, simply drag and drop the preview cards.',
        successTitle: 'Success!',
        successMergedFiles: 'Successfully combined into a single PDF document',
        readyToSave: 'Your file is ready. Download now.',
    }
};
