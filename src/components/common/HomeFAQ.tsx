import { Shield, Zap, Sparkles, Laptop, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';

export function HomeFAQ() {
  const { t } = useTranslation();

  return (
    <section className="w-full space-y-16 pt-8">
      {/* 核心优势卡片 */}
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.home.whyChooseTitle}</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            {t.home.whyChooseDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">{t.home.features.privacyTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.home.features.privacyDesc}
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">{t.home.features.speedTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.home.features.speedDesc}
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">{t.home.features.freeTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.home.features.freeDesc}
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">{t.home.features.pwaTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.home.features.pwaDesc}
            </p>
          </div>
        </div>
      </div>

      {/* 常见问题 Accordion 列表 */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center space-x-2 text-primary font-semibold text-sm bg-primary/10 px-3 py-1 rounded-full">
            <HelpCircle className="w-4 h-4" />
            <span>FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">{t.home.faqTitle}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {t.home.faqs.map((faq, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm space-y-3">
              <h3 className="text-base font-bold flex items-start">
                <span className="text-primary font-black mr-2 text-lg leading-none">Q:</span>
                <span>{faq.q}</span>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
