/**
 * Google Analytics (GA4) 工具库
 * 支持单页应用 (SPA) 路由切换自动追踪与自定义事件上报
 */

// 声明全局 gtag 与 dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

// 测量 ID：优先读取环境变量 VITE_GA_MEASUREMENT_ID，若无则使用默认配置
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-KQFL6BHJ1W';

/**
 * 初始化 Google Analytics 脚本
 * 若未配置 GA_MEASUREMENT_ID 则处于静默观察模式，不影响应用正常运行
 */
export function initGA(measurementId: string = GA_MEASUREMENT_ID) {
  if (!measurementId || typeof window === 'undefined') return;

  // 避免重复注入脚本
  if (document.getElementById('google-analytics-script') || (window.gtag && window.dataLayer?.length)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false // 由 React Router 手动控制 SPA 路由上报，避免重复计算
  });

  const script = document.createElement('script');
  script.id = 'google-analytics-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  console.log(`[Analytics] Google Analytics 4 (${measurementId}) 已成功初始化`);
}

/**
 * 手动上报页面浏览量 (用于 SPA 路由切换)
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href
  });
}

/**
 * 上报自定义业务埋点事件 (如使用工具、点击下载等)
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', eventName, params);
}
