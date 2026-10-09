import { PDFDocument, degrees as pdfDegrees, rgb, StandardFonts } from 'pdf-lib';

/**
 * 将传入的多个 PDF File 对象合并为单个 PDF 并在浏览器中触发下载。
 */
export async function mergePDFs(files: File[], outputFilename: string = 'merged_document.pdf'): Promise<void> {
    if (files.length === 0) {
        throw new Error('No files provided for merging');
    }

    // 创建一个全新的、空的 PDF
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            // 解析单个传入的 PDF。注意这里可能会遇到加密文件报错，MVP版遇到加密直接报错跳过
            const loadedPdf = await PDFDocument.load(arrayBuffer);

            const copiedPages = await mergedPdf.copyPages(loadedPdf, loadedPdf.getPageIndices());

            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        } catch (e) {
            console.error(`Error processing file ${file.name}:`, e);
            throw new Error(`无法处理文件 ${file.name}，或许他被加密了？`);
        }
    }

    await downloadPdfFile(mergedPdf, outputFilename);
}

/**
 * 将传入的多个 PDF File 对象合并为单个 PDF，返回 Blob URL（不自动下载）。
 * 调用方负责在适当时机释放 URL（URL.revokeObjectURL）。
 */
export async function mergePDFsToBlob(files: File[]): Promise<string> {
    if (files.length === 0) {
        throw new Error('No files provided for merging');
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadedPdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(loadedPdf, loadedPdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (e) {
            console.error(`Error processing file ${file.name}:`, e);
            throw new Error(`无法处理文件 ${file.name}，或许他被加密了？`);
        }
    }

    const bytes = await mergedPdf.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
}


export interface PdfRange {
    start: number;
    end: number;
}

/**
 * 提取/切分 PDF，支持多段范围提取并将其无缝拼接到一个新文件。
 * 返回前端可承接和下载的 Blob URL。
 */
export async function splitPDF(file: File, ranges: PdfRange[], outputFilename: string = 'split_document.pdf'): Promise<{ url: string; filename: string }> {
    const arrayBuffer = await file.arrayBuffer();
    
    let loadedPdf;
    try {
        loadedPdf = await PDFDocument.load(arrayBuffer);
    } catch (e) {
        throw new Error('无法读取该 PDF，请确定其未加密或未损坏。');
    }

    const totalPages = loadedPdf.getPageCount();
    ranges.forEach(r => {
        if (r.start < 1 || r.end > totalPages || r.start > r.end) {
            throw new Error(`无效的范围 ${r.start}-${r.end}。该文档共有 ${totalPages} 页。`);
        }
    });

    const splitPdf = await PDFDocument.create();

    for (const r of ranges) {
        const indices = Array.from({ length: r.end - r.start + 1 }, (_, i) => (r.start - 1) + i);
        const copiedPages = await splitPdf.copyPages(loadedPdf, indices);
        copiedPages.forEach((page) => splitPdf.addPage(page));
    }

    const bytes = await splitPdf.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    return { url: URL.createObjectURL(blob), filename: outputFilename };
}

/**
 * 将提取的多段范围单独切分为多个离散文件（不合并打包）。
 * 返回多个 Blob URLs。
 */
export async function splitPDFToMultiple(file: File, ranges: PdfRange[]): Promise<{ url: string; filename: string }[]> {
    const arrayBuffer = await file.arrayBuffer();
    
    let loadedPdf;
    try {
        loadedPdf = await PDFDocument.load(arrayBuffer);
    } catch (e) {
        throw new Error('无法读取该 PDF，请确定其未加密或未损坏。');
    }

    const totalPages = loadedPdf.getPageCount();
    ranges.forEach(r => {
        if (r.start < 1 || r.end > totalPages || r.start > r.end) {
            throw new Error(`无效的范围 ${r.start}-${r.end}。该文档共有 ${totalPages} 页。`);
        }
    });

    const results = [];
    
    for (const r of ranges) {
        const splitPdf = await PDFDocument.create();
        const indices = Array.from({ length: r.end - r.start + 1 }, (_, i) => (r.start - 1) + i);
        const copiedPages = await splitPdf.copyPages(loadedPdf, indices);
        copiedPages.forEach((page) => splitPdf.addPage(page));
        
        const bytes = await splitPdf.save();
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        results.push({
            url: URL.createObjectURL(blob),
            filename: `Split_${r.start}-${r.end}_${file.name}`
        });
    }

    return results;
}

/**
 * 将一组图片文件转换为单页或多页 PDF
 */
export async function imagesToPdf(files: File[], outputFilename: string = 'images_converted.pdf'): Promise<{ url: string; filename: string }> {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let image;

        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        } else {
            // 尝试通过后缀判断，或者默认尝试 embedJpg (pdf-lib 对某些 webp 也有支持但在 MVP 中暂不扩展)
            continue;
        }

        const { width: imgWidth, height: imgHeight } = image.scale(1);

        // 添加一个新页面，尺寸与图片一致（或者使用 A4 标准，这里采用原始尺寸以保证清晰度）
        const page = pdfDoc.addPage([imgWidth, imgHeight]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight,
        });
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { url, filename: outputFilename };
}

/**
 * 旋转 PDF 页面
 * @param file 原始 PDF
 * @param degrees 旋转角度 (90, 180, 270)
 * @param pageIndices 需要旋转的页面索引（从0开始），为空则旋转全部
 */
export async function rotatePdfPages(
    file: File,
    degrees: number,
    pageIndices?: number[],
    outputFilename: string = 'rotated_document.pdf'
): Promise<{ url: string; filename: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    const indicesToRotate = pageIndices && pageIndices.length > 0
        ? pageIndices
        : pages.map((_, i) => i);

    for (const idx of indicesToRotate) {
        if (idx >= 0 && idx < pages.length) {
            const page = pages[idx];
            const currentRotation = page.getRotation().angle;
            page.setRotation(pdfDegrees((currentRotation + degrees) % 360));
        }
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { url, filename: outputFilename };
}

/**
 * 给 PDF 添加文字水印
 */
export async function addWatermark(
    file: File,
    watermarkText: string,
    options: { fontSize?: number; opacity?: number; rotation?: number } = {},
    outputFilename: string = 'watermarked_document.pdf'
): Promise<{ url: string; filename: string }> {
    const { fontSize = 48, opacity = 0.15, rotation = -45 } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
        const { width, height } = page.getSize();
        // 在页面中央绘制倾斜文字水印
        page.drawText(watermarkText, {
            x: width / 2 - (watermarkText.length * fontSize * 0.25),
            y: height / 2,
            size: fontSize,
            opacity,
            rotate: pdfDegrees(rotation),
        });
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { url, filename: outputFilename };
}

/**
 * 辅助函数：触发文件在浏览器本地下载
 */
async function downloadPdfFile(pdfDoc: PDFDocument, filename: string) {
    const mergedPdfFile = await pdfDoc.save();
    // 使用类型断言来解决 Uint8Array 到 BlobPart 的类型兼容性问题
    const blob = new Blob([mergedPdfFile as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 压缩 PDF — 通过重新序列化去除冗余对象流来减小文件体积
 * 注意：pdf-lib 本身不提供图片重采样压缩，但重新序列化可有效减少被编辑过的 PDF 体积
 */
export async function compressPdf(
    file: File,
    outputFilename: string = 'compressed_document.pdf'
): Promise<{ url: string; filename: string; originalSize: number; compressedSize: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // 通过 save 时启用对象压缩来尽量减小体积
    const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
    });

    const blob = new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    return {
        url,
        filename: outputFilename,
        originalSize: file.size,
        compressedSize: blob.size
    };
}

/**
 * 给 PDF 每一页添加页码
 */
export async function addPageNumbers(
    file: File,
    options: {
        position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
        fontSize?: number;
        startNumber?: number;
        format?: 'number' | 'dash' | 'page-of';  // "1" / "- 1 -" / "1 / N"
    } = {},
    outputFilename: string = 'numbered_document.pdf'
): Promise<{ url: string; filename: string }> {
    const { position = 'bottom-center', fontSize = 12, startNumber = 1, format = 'number' } = options;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const pageNum = startNumber + idx;

        let text: string;
        if (format === 'dash') {
            text = `- ${pageNum} -`;
        } else if (format === 'page-of') {
            text = `${pageNum} / ${startNumber + totalPages - 1}`;
        } else {
            text = `${pageNum}`;
        }

        const textWidth = font.widthOfTextAtSize(text, fontSize);

        let x: number;
        if (position.includes('center')) {
            x = (width - textWidth) / 2;
        } else if (position.includes('right')) {
            x = width - textWidth - 40;
        } else {
            x = 40;
        }

        const y = position.startsWith('top') ? height - 30 - fontSize : 30;

        page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
    });

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { url, filename: outputFilename };
}

/**
 * 加密 PDF — 添加密码保护
 * 注意：pdf-lib 暂不原生支持 PDF 加密，此函数通过元信息标记模拟
 * 真正的加密需要更底层的库支持，这里先提供 UI 占位
 */
export async function protectPdf(
    file: File,
    _password: string,
    outputFilename: string = 'protected_document.pdf'
): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    // pdf-lib 不支持原生加密，但我们可以在元数据中标记
    pdfDoc.setTitle('Protected Document');
    pdfDoc.setSubject('This document requires password protection');
    await downloadPdfFile(pdfDoc, outputFilename);
}
