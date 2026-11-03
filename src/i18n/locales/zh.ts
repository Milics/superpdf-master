import type { TranslationSchema } from '../types';

export const zh: TranslationSchema = {
    common: {
        appName: 'PDF Master',
        brandTagline: '纯本地安全处理，保护您的隐私',
        localSecureBadge: '完全本地化运行',
        privacyFooter: '本地安全处理，绝不泄露您的隐私。',
        themeToggle: '切换亮色 / 暗色模式',
        langSwitch: '切换语言 (Language)',
        langCurrent: '简体中文',
        langZh: '简体中文',
        langEn: 'English',
        backToHome: '返回首页',
        download: '立即下载',
        continueOther: '继续处理其它',
        processing: '正在处理中…',
        dropzoneTitle: '选择或拖放待处理的文档',
        dropzoneDesc: '点击或拖拽文件到此处',
        dropzoneMultiDesc: '支持多选，您可以在下一步拖拽缩略图调整顺序',
        oneClickRemove: '一键移除',
    },
    home: {
        heroTitlePrefix: '属于您的全能',
        heroTitleHighlight: 'PDF 专家工具',
        heroSubtitlePrefix: '提供 30+ 种专业级 PDF 工具。所有操作均在',
        heroSubtitleHighlight: '浏览器本地加密运行',
        heroSubtitleSuffix: '，无需上传，绝不泄露隐私，极速处理。',
        categories: {
            organize: '组织 PDF',
            convert: '转换 PDF',
            fromPdf: '从 PDF 转换',
            editOptimize: '编辑与优化',
            advanced: '高级工具',
        },
        tools: {
            merge: { title: '合并 PDF', description: '将多个 PDF 合并为一个。' },
            split: { title: '拆分 PDF', description: '将 PDF 拆分为多个文档。' },
            organize: { title: '整理 PDF', description: '删除、提取或拖拽重排页面顺序。' },
            scan: { title: '扫描成 PDF', description: '移动端扫描文档。' },
            img2pdf: { title: 'JPG 转 PDF', description: '将图片转换为 PDF。' },
            word2pdf: { title: 'Word 转 PDF', description: 'DOCX 转为 PDF。' },
            ppt2pdf: { title: 'PowerPoint 转 PDF', description: 'PPT 转为 PDF。' },
            excel2pdf: { title: 'Excel 转 PDF', description: 'XLSX 转为 PDF。' },
            html2pdf: { title: 'HTML 转 PDF', description: '网页转为 PDF。' },
            pdf2jpg: { title: 'PDF 转 JPG', description: '提取 PDF 中的图像或转为 JPG。' },
            pdf2word: { title: 'PDF 转 Word', description: 'PDF 转为可编辑 DOCX。' },
            pdf2ppt: { title: 'PDF 转 PowerPoint', description: 'PDF 转为 PPTX 幻灯片。' },
            pdf2excel: { title: 'PDF 转 Excel', description: 'PDF 数据导入电子表格。' },
            pdf2a: { title: 'PDF 转 PDF/A', description: '长期存档标准格式。' },
            compress: { title: '压缩 PDF', description: '减小文件体积。' },
            edit: { title: '编辑 PDF', description: '添加文字、图像、形状。' },
            sign: { title: '签署 PDF', description: '添加电子签名。' },
            watermark: { title: '水印', description: '添加文字或图片水印。' },
            rotate: { title: '旋转 PDF', description: '翻转页面方向。' },
            unlock: { title: '解锁 PDF', description: '解除密码保护。' },
            protect: { title: '保护 PDF', description: '添加加密密码。' },
            pagenumber: { title: '页码', description: '为 PDF 添加页数。' },
            ocr: { title: 'OCR PDF', description: '识别人像或扫描件文字。' },
            compare: { title: '比较 PDF', description: '查看文件差异。' },
            translate: { title: '翻译 PDF', description: '全文 AI 翻译。' },
            crop: { title: '裁剪 PDF', description: '裁剪页面边距。' },
            redact: { title: '涂黑 PDF', description: '永久隐藏敏感信息。' },
        },
        whyChooseTitle: '为什么选择 PDF Master？',
        whyChooseDesc: '摒弃传统云端工具的繁琐与泄密风险，为您提供更极速、更安全、更纯粹的 PDF 工作流。',
        features: {
            privacyTitle: '100% 纯本地隐私安全',
            privacyDesc: '文件零上传，全程在浏览器内存中运行处理。断网亦可继续操作，彻底杜绝数据泄露与隐私窃取。',
            speedTitle: '无文件限制 · 秒级完成',
            speedDesc: '无需排队，不受云端带宽限速束缚。直接调度您本地 CPU 的多线程算力，百兆大文件轻松吞吐。',
            freeTitle: '完全免费 · 无强制水印',
            freeDesc: '提供专业且纯净的 PDF 功能套件，全功能完全开放，导出文件干净无杂质。',
            pwaTitle: '全平台免安装 · 随时随地',
            pwaDesc: '完美兼容 Windows、macOS、Linux、iOS 及 Android 系统上的主流现代浏览器，体验如原生应用般流畅。',
        },
        faqTitle: '常见问题解答',
        faqs: [
            {
                q: 'PDF Master 处理文件时是否需要上传到服务器？文档安全吗？',
                a: '绝对不需要！PDF Master 采用先进的纯客户端 Web 技术（WebAssembly、Web Workers 与 Canvas 渲染引擎），所有的 PDF 解析、合并、拆分、压缩及 OCR 识别全部在您的本地浏览器沙箱中运行。您的文档绝不会上传至任何远程服务器，从源头杜绝数据泄露风险，完全符合商业级隐私保密要求。'
            },
            {
                q: '使用 PDF Master 是否有文件数量、大小限制或收费项目？',
                a: '没有任何人工限制！传统在线工具往往会因为服务器带宽成本限制单文件 10MB 或每天只能处理 2 次，而 PDF Master 基于您的本地计算机硬件性能，无论是几十兆甚至上百兆的高清文档都可以随意处理，并且永久免费、无任何强制附加水印。'
            },
            {
                q: '为什么 PDF Master 处理大文件的速度如此之快？',
                a: '因为免去了“上传文件到云端服务器”和“处理完毕再下载回本地”的漫长网络传输时间。整个处理流程在您本机的内存中直接完成，省去数百兆的上传带宽消耗，点下按钮即可瞬间导出完成。'
            },
            {
                q: 'PDF Master 支持在手机、平板或 Mac 上使用吗？',
                a: '完全支持！PDF Master 是一套全平台通用的渐进式 Web 应用程序（PWA 体验），完美兼容 Windows、macOS、Linux、iOS 及 Android 系统上的主流现代浏览器（Chrome、Edge、Safari、Firefox 等），无需安装任何笨重的第三方桌面端软件。'
            }
        ]
    },
    toolWorkspace: {
        changeOrderHint: '要更改 PDF 文件的顺序，只需拖拽缩略图卡片即可重新排列。',
        successTitle: '处理成功！',
        successMergedFiles: '已成功将多个文件合并为一个 PDF',
        readyToSave: '文件已就绪，立即保存',
    }
};
