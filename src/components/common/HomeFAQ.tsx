import { Shield, Zap, Sparkles, HelpCircle, CheckCircle } from 'lucide-react';

const faqs = [
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
];

export function HomeFAQ() {
  return (
    <section className="w-full space-y-16 pt-8">
      {/* 核心优势三列卡片 */}
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">为什么选择 PDF Master？</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            摒弃传统云端工具的繁琐与泄密风险，为您提供更极速、更安全、更纯粹的 PDF 工作流。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">100% 纯本地隐私安全</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              文件零上传，全程在浏览器内存中运行处理。断网亦可继续操作，彻底杜绝数据泄露与隐私窃取。
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">无文件限制 · 秒级完成</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              无需排队，不受云端带宽限速束缚。直接调度您本地 CPU 的多线程算力，百兆大文件轻松吞吐。
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">完全免费 · 无强制水印</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              不强制登录，不添加第三方丑陋水印。保持导出的原版 PDF 干净规范，专注纯粹的高效体验。
            </p>
          </div>
        </div>
      </div>

      {/* 常见问答 FAQ 板块 */}
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            常见问题与解答
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">关于 PDF Master 的常见疑问</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 sm:p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm space-y-2.5">
              <h3 className="text-base sm:text-lg font-bold flex items-start gap-2.5 text-foreground">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7.5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 注入 FAQPage 结构化微数据 (针对 Google/Bing 搜索富文本折叠摘要) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(item => ({
              "@type": "Question",
              "name": item.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
              }
            }))
          })
        }}
      />
    </section>
  );
}
