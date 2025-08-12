import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  canonical?: string;
}

export function useSEO({ title, description, canonical }: SEOOptions) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    const url = canonical || window.location.href;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    if (title) {
      let ogt = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
      if (!ogt) {
        ogt = document.createElement('meta');
        ogt.setAttribute('property', 'og:title');
        document.head.appendChild(ogt);
      }
      ogt.content = title;
    }
    if (description) {
      let ogd = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
      if (!ogd) {
        ogd = document.createElement('meta');
        ogd.setAttribute('property', 'og:description');
        document.head.appendChild(ogd);
      }
      ogd.content = description;
    }
  }, [title, description, canonical]);
}
