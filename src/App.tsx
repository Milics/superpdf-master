import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Home } from '@/pages/Home';
import { MergePDF } from '@/pages/MergePDF';
import { SplitPDF } from '@/pages/SplitPDF';
import { ImgToPDF } from '@/pages/ImgToPDF';
import { PdfToJpg } from '@/pages/PdfToJpg';
import { RotatePDF } from '@/pages/RotatePDF';
import { WatermarkPDF } from '@/pages/WatermarkPDF';
import { CompressPDF } from '@/pages/CompressPDF';
import { OrganizePDF } from '@/pages/OrganizePDF';
import { RemovePages } from '@/pages/RemovePages';

// 第一梯队：已完成的真实功能组件
import { PageNumberPDF } from '@/pages/PageNumberPDF';
import { UnlockPDF } from '@/pages/UnlockPDF';
import { ProtectPDF } from '@/pages/ProtectPDF';
import { SignPDF } from '@/pages/SignPDF';
import { CropPDF } from '@/pages/CropPDF';
import { RedactPDF } from '@/pages/RedactPDF';

// 第二梯队：高级功能
import { OcrPdf } from '@/pages/OcrPdf';
import { PdfToPdfa } from '@/pages/PdfToPdfa';
import { RepairPDF } from '@/pages/RepairPDF';
import { HtmlToPdf } from '@/pages/HtmlToPdf';
import { ComparePdf } from '@/pages/ComparePdf';
import { EditPDF } from '@/pages/EditPDF';
import { ScanToPdf } from '@/pages/ScanToPdf';
import { TranslatePdf } from '@/pages/TranslatePdf';
import { ExcelToPdf } from '@/pages/ExcelToPdf';
import { WordToPdf } from '@/pages/WordToPdf';
import { PptToPdf } from '@/pages/PptToPdf';

// 第三梯队及以后：待开发占位页
import {
  PdfToWord, PdfToPpt, PdfToExcel
} from '@/pages/ComingSoon';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          
          {/* Core Phase 1 Tools */}
          <Route path="merge" element={<MergePDF />} />
          <Route path="split" element={<SplitPDF />} />
          <Route path="img2pdf" element={<ImgToPDF />} />
          <Route path="pdf2jpg" element={<PdfToJpg />} />
          <Route path="rotate" element={<RotatePDF />} />
          <Route path="watermark" element={<WatermarkPDF />} />
          <Route path="compress" element={<CompressPDF />} />
          <Route path="organize" element={<OrganizePDF />} />
          <Route path="remove" element={<RemovePages />} />
          
          {/* Phase 2 / In Development Placeholders */}
          <Route path="pagenumber" element={<PageNumberPDF />} />
          <Route path="unlock" element={<UnlockPDF />} />
          <Route path="protect" element={<ProtectPDF />} />
          <Route path="sign" element={<SignPDF />} />
          <Route path="crop" element={<CropPDF />} />
          <Route path="edit" element={<EditPDF />} />
          <Route path="repair" element={<RepairPDF />} />
          <Route path="extract" element={<Navigate to="/organize" replace />} />
          <Route path="html2pdf" element={<HtmlToPdf />} />
          <Route path="redact" element={<RedactPDF />} />
          <Route path="word2pdf" element={<WordToPdf />} />
          <Route path="ppt2pdf" element={<PptToPdf />} />
          <Route path="excel2pdf" element={<ExcelToPdf />} />
          <Route path="pdf2word" element={<PdfToWord />} />
          <Route path="pdf2ppt" element={<PdfToPpt />} />
          <Route path="pdf2excel" element={<PdfToExcel />} />
          <Route path="pdf2pdfa" element={<PdfToPdfa />} />
          <Route path="ocr" element={<OcrPdf />} />
          <Route path="scan" element={<ScanToPdf />} />
          <Route path="compare" element={<ComparePdf />} />
          <Route path="translate" element={<TranslatePdf />} />
          
          {/* Catch all */}
          <Route path="*" element={<div className="p-20 text-center text-xl">404 - 页面未找到</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
