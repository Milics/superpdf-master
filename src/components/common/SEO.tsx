import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
}

// 全局路由与 SEO 元信息映射字典
const ROUTE_SEO_MAP: Record<string, { title: string; description: string; keywords: string }> = {
  '/': {
    title: 'PDF Master - 免费在线PDF万能工具箱 | 纯本地隐私安全处理',
    description: 'PDF Master 是一款免费、无限制的专业级 PDF 在线万能工具箱。提供 PDF 合并、拆分、压缩、OCR 文字识别、PDF 与 Office/图片互转等 30+ 种实用功能。所有处理均在浏览器本地加密运行，免上传服务器，100% 保护文档隐私。',
    keywords: 'PDF Master, PDF工具箱, 在线PDF合并, PDF拆分, PDF压缩, PDF转Word, PDF转图片, OCR文字识别, PDF解密, 免费PDF转换器, 本地PDF处理'
  },
  '/merge': {
    title: '在线合并 PDF - 免费无限制组合拼接多个 PDF 文件 | PDF Master',
    description: '快速将多个 PDF 文档按指定顺序合并为一个文件。支持拖拽调整页面顺序，纯浏览器本地极速运算，无需上传，绝不泄露隐私。',
    keywords: '合并PDF, PDF拼接, 在线合并PDF, PDF组合, 免费合并PDF, 本地合并PDF'
  },
  '/split': {
    title: '在线拆分 PDF - 免费将 PDF 分割为单独页面或页面范围 | PDF Master',
    description: '轻松将大型 PDF 文档按指定页码、范围或每页独立拆分为多个 PDF 文件。完全在浏览器本地运行，高效安全。',
    keywords: '拆分PDF, PDF分割, PDF提取页面, PDF切分, 在线拆分PDF'
  },
  '/compress': {
    title: '在线压缩 PDF - 极速缩小 PDF 文件体积同时保持高清晰度 | PDF Master',
    description: '强大的本地 PDF 智能压缩算法，显著减少 PDF 文件大小，适合邮件发送与在线上传。无需上传到第三方服务器。',
    keywords: '压缩PDF, PDF瘦身, PDF减小体积, 在线压缩PDF, PDF无损压缩'
  },
  '/organize': {
    title: '整理 PDF 页面 - 自由拖拽排序、旋转与提取 PDF 页面 | PDF Master',
    description: '可视化整理 PDF 页面顺序。支持鼠标拖拽重排、顺逆时针旋转、选择性提取页面。完全在本地浏览器完成。',
    keywords: '整理PDF, 排序PDF页面, 调整PDF顺序, 提取PDF页面, PDF页面管理'
  },
  '/remove': {
    title: '删除 PDF 页面 - 免费快速移除不需要的空白页或指定页面 | PDF Master',
    description: '一键删除 PDF 中的多余页面或空白页，生成干净紧凑的最新文档。本地离线处理，保障商业与个人隐私。',
    keywords: '删除PDF页面, 移除PDF页面, 删除PDF空白页, PDF去页'
  },
  '/img2pdf': {
    title: 'JPG/PNG 图片转 PDF - 多图批量一键转换为高清 PDF 文档 | PDF Master',
    description: '支持将 JPG、PNG、WEBP 等多种格式图片批量合成为单一 PDF 文档。支持设置页面边距与排版，极速本地生成。',
    keywords: '图片转PDF, JPG转PDF, PNG转PDF, 批量图片合成PDF, 照片转PDF'
  },
  '/pdf2jpg': {
    title: 'PDF 转 JPG/PNG 图片 - 高清逐页导出 PDF 为图像 | PDF Master',
    description: '将 PDF 文档的每一页无损转换为高分辨率 JPG 或 PNG 图片。支持整篇提取或单页导出，纯本地渲染。',
    keywords: 'PDF转图片, PDF转JPG, PDF转PNG, 导出PDF为图片, PDF截图'
  },
  '/watermark': {
    title: 'PDF 添加水印 - 免费为 PDF 批量添加文字或图像水印防盗防盗印 | PDF Master',
    description: '为 PDF 文档添加个性化文字水印或透明图片印章。可自定义透明度、倾斜角度、字体大小及平铺方式。',
    keywords: 'PDF加水印, PDF文字水印, PDF图片水印, PDF防伪, 在线加水印'
  },
  '/rotate': {
    title: '旋转 PDF - 批量旋转倒置或横向 PDF 页面为正向 | PDF Master',
    description: '轻松修正颠倒或方向错误的 PDF 页面。支持 90度、180度、270度批量旋转并永久保存。',
    keywords: '旋转PDF, 翻转PDF, 修正PDF方向, PDF横屏变竖屏'
  },
  '/protect': {
    title: 'PDF 加密保护 - 为敏感 PDF 设置高强度打开密码与权限 | PDF Master',
    description: '使用行业标准加密算法为 PDF 文档设置密码，防止未经授权的查看、复制与打印。本地加密，密码绝不上云。',
    keywords: 'PDF加密, PDF设置密码, 保护PDF, PDF加锁, 安全PDF'
  },
  '/unlock': {
    title: 'PDF 解密解除限制 - 移除已知密码与防打印防编辑权限限制 | PDF Master',
    description: '输入授权密码后，永久移除 PDF 文档的打开密码及各种防复制、防打印权限限制。安全离线完成。',
    keywords: 'PDF解密, 移除PDF密码, PDF解除限制, 去除PDF密码'
  },
  '/sign': {
    title: 'PDF 电子签名 - 手写签名或上传印章快速签署电子合同 | PDF Master',
    description: '在浏览器中直接手绘签名、键入文字或导入印章图片，并精确放置在 PDF 合同的指定签名区域。',
    keywords: 'PDF签名, PDF电子签名, 签署PDF, 合同电子签章, 在线签名'
  },
  '/crop': {
    title: '裁剪 PDF 页面 - 精确修剪白边与调整 PDF 可视区域 | PDF Master',
    description: '通过直观的矩形框选，裁剪掉 PDF 页面多余的留白边缘或仅保留关键内容区域。',
    keywords: '裁剪PDF, 切割PDF, PDF切白边, 调整PDF尺寸'
  },
  '/pagenumber': {
    title: 'PDF 添加页码 - 自定义格式、位置与起始页码标注 | PDF Master',
    description: '为长篇 PDF 文档批量编排并插入页码。支持顶部、底部、居中或靠右对齐，可自由定义起始序号。',
    keywords: 'PDF添加页码, PDF页码编排, PDF标注页数, 批量加页码'
  },
  '/redact': {
    title: 'PDF 涂黑擦除脱敏 - 永久遮盖身份证、账号等敏感机密信息 | PDF Master',
    description: '合规脱敏工具。永久抹除并遮盖 PDF 页面上的个人隐私、商业机密、手机号或敏感信息，不可逆防逆向。',
    keywords: 'PDF涂黑, PDF脱敏, 遮盖PDF敏感信息, PDF信息抹除'
  },
  '/ocr': {
    title: 'PDF OCR 文字识别 - 免费识别扫描件与图像中的汉字与外文 | PDF Master',
    description: '基于先进的本地机器学习 OCR 引擎，精准提取扫描版 PDF 或图片中的文字内容，支持复制与导出。数据完全不出本机。',
    keywords: 'PDF OCR, 文字识别, 扫描件转文字, 提取PDF文字, 本地OCR'
  },
  '/word2pdf': {
    title: 'Word 转 PDF - 在线将 DOCX 文档转换为排版完美的 PDF | PDF Master',
    description: '高保真将 Microsoft Word (.docx) 文件转换为跨平台通用的 PDF 格式，保留文字排版与样式。',
    keywords: 'Word转PDF, DOCX转PDF, 在线转换Word为PDF'
  },
  '/excel2pdf': {
    title: 'Excel 转 PDF - 将电子表格 XLSX 规范导出为清晰 PDF 报表 | PDF Master',
    description: '一键将 Excel 表格数据渲染并转换为整洁的 PDF 报告，避免跨设备打开时表格格式错乱。',
    keywords: 'Excel转PDF, XLSX转PDF, 表格转PDF'
  },
  '/ppt2pdf': {
    title: 'PowerPoint 转 PDF - 将演示文稿 PPTX 转换为易于阅读的 PDF | PDF Master',
    description: '将 PPT 演示幻灯片导出为标准 PDF 格式，便于投影、打印和通过邮件无损分享。',
    keywords: 'PPT转PDF, PPTX转PDF, 幻灯片转PDF'
  },
  '/html2pdf': {
    title: 'HTML 网页转 PDF - 将代码或网页内容保存为静态文档 | PDF Master',
    description: '支持输入 HTML 代码或富文本内容，快速渲染并生成精美的标准 PDF 文档。',
    keywords: 'HTML转PDF, 网页存为PDF, 代码转PDF'
  },
  '/repair': {
    title: '修复受损 PDF - 尝试分析并修复损坏或无法正常打开的 PDF 文档 | PDF Master',
    description: '智能扫描并重构受损 PDF 文件的结构目录（XRef）和对象树，尽最大可能挽救丢失的重要文件。',
    keywords: '修复PDF, 恢复PDF, 损坏PDF打开, PDF文件抢救'
  },
  '/compare': {
    title: 'PDF 双文件比对 - 像素级高亮对比两个版本的不同差异 | PDF Master',
    description: '并排对比两份 PDF 文档，通过像素差值算法自动红绿高亮标出修改、新增或删除的文字与图形细节。',
    keywords: 'PDF对比, 比较PDF差异, PDF版本比对, 查找PDF不同'
  },
  '/scan': {
    title: '文档扫描转 PDF - 手机相机拍摄或上传多页快速生成电子文档 | PDF Master',
    description: '随身扫描仪。支持图像增强与透视矫正，快速将手头纸质文件转录为规范的 PDF 电子文档。',
    keywords: '扫描转PDF, 手机扫描文档, 纸质文件转电子版, 在线扫描仪'
  },
  '/translate': {
    title: 'PDF 文档翻译 - 智能解析并翻译 PDF 内容为多国语言 | PDF Master',
    description: '保留原文档上下文，辅助进行跨语种 PDF 文档阅读与快速对照翻译。',
    keywords: 'PDF翻译, 文档翻译, 在线翻译PDF'
  },
  '/pdf2pdfa': {
    title: 'PDF 转 PDF/A - 转换为长期归档保存的国际标准 ISO 规范格式 | PDF Master',
    description: '确保您的 PDF 满足电子政务、学术论文和司法档案长期有效可读的 ISO 19005 标准。',
    keywords: 'PDF转PDFA, 长期归档PDF, PDF/A标准'
  }
};

export function SEOHead({ title, description, keywords, canonical }: SEOProps) {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();
  const mapped = ROUTE_SEO_MAP[currentPath] || ROUTE_SEO_MAP['/'];

  const finalTitle = title || mapped.title;
  const finalDesc = description || mapped.description;
  const finalKeywords = keywords || mapped.keywords;
  const finalCanonical = canonical || `https://superpdf-master.pages.dev${location.pathname === '/' ? '' : location.pathname}`;

  useEffect(() => {
    // 动态更新网页标题
    document.title = finalTitle;

    // 辅助更新或创建 Meta 标签
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMeta('description', finalDesc);
    setMeta('keywords', finalKeywords);
    setMeta('og:title', finalTitle, true);
    setMeta('og:description', finalDesc, true);
    setMeta('og:url', finalCanonical, true);
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDesc);

    // 动态更新 canonical 链接
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', finalCanonical);

    // 触发 Google Analytics SPA 页面浏览量上报 (PV)
    trackPageView(location.pathname + location.search, finalTitle);
  }, [finalTitle, finalDesc, finalKeywords, finalCanonical, location.pathname, location.search]);

  return null;
}
