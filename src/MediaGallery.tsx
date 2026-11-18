import { useEffect, useId, useRef, useState } from 'react';
import { asset, type Lang } from './data/content';
import type { PortfolioImage } from './data/media';

export function MediaImage({ image, lang, thumbnail = false, decorative = false, eager = false }: {
  image: PortfolioImage; lang: Lang; thumbnail?: boolean; decorative?: boolean; eager?: boolean;
}) {
  const src = asset(thumbnail ? image.thumbnail : image.src);
  const [failedSrc, setFailedSrc] = useState('');
  return failedSrc === src ? <span className="image-unavailable" role="img" aria-label={image.alt[lang]}>
    <span aria-hidden="true">＋</span>{lang === 'zh' ? '圖片暫時無法載入' : 'Image temporarily unavailable'}
  </span> : <img src={src} alt={decorative ? '' : image.alt[lang]} width={image.width} height={image.height}
    loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} />;
}

export function MediaGallery({ images, lang, compact = false }: { images: PortfolioImage[]; lang: Lang; compact?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const t = (en: string, zh: string) => lang === 'zh' ? zh : en;
  const current = selected === null ? undefined : images[selected];
  useEffect(() => {
    if (selected !== null && !dialog.current?.open) {
      dialog.current?.showModal();
      closeButton.current?.focus();
    }
  }, [selected]);
  function close() {
    dialog.current?.close(); setSelected(null); setZoomed(false); trigger.current?.focus();
  }
  function move(direction: number) {
    setSelected(index => index === null ? null : (index + direction + images.length) % images.length);
    setZoomed(false); viewport.current?.scrollTo(0, 0);
  }
  if (!images.length) return null;
  return <div className={`media-gallery${compact ? ' compact-gallery' : ''}`}>
    <div className="gallery-heading"><span>{t('VISUAL RECORD', '影像紀錄')}</span><span>{images.length} {t('IMAGES · SELECT TO ENLARGE', '張圖片・點選放大')}</span></div>
    <div className="gallery-grid">{images.map((image, index) => <figure className={`gallery-item${index === 0 ? ' gallery-lead' : ''}`} key={image.id} data-media-id={image.id}>
      <button type="button" className={`gallery-image image-kind-${image.kind}`} aria-label={`${t('Enlarge image', '放大圖片')}：${image.alt[lang]}`} onClick={event => {
        trigger.current = event.currentTarget; setSelected(index); setZoomed(false);
      }}>
        <MediaImage image={image} lang={lang} thumbnail={compact || index > 0} eager={index === 0} />
        <span className="image-expand" aria-hidden="true">↗</span>
      </button>
      <figcaption><span>{String(index + 1).padStart(2, '0')}</span><div className="gallery-caption-copy">{image.caption[lang]}{image.note && <small className="media-note">{image.note[lang]}</small>}</div></figcaption>
    </figure>)}</div>
    <dialog ref={dialog} className="image-dialog" aria-label={t('Image viewer', '圖片檢視器')} aria-describedby={captionId}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'ArrowRight' && images.length > 1) { event.preventDefault(); move(1); }
        if (event.key === 'ArrowLeft' && images.length > 1) { event.preventDefault(); move(-1); }
        if (event.key === 'Tab') {
          const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
          const first = elements[0]; const last = elements.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      {current && <>
        <header className="image-viewer-top"><span>{String(selected! + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span><div>
          <button onClick={() => { setZoomed(value => !value); viewport.current?.scrollTo(0, 0); }} aria-pressed={zoomed}>{zoomed ? t('Fit image', '符合畫面') : t('Actual size', '原尺寸')}</button>
          <a href={asset(current.src)} target="_blank" rel="noreferrer">{t('Open image', '另開圖片')} ↗</a>
          <button ref={closeButton} onClick={close} aria-label={t('Close image', '關閉圖片')}>×</button>
        </div></header>
        <div ref={viewport} className={`image-viewer-canvas${zoomed ? ' zoomed' : ''}`}><MediaImage image={current} lang={lang} eager /></div>
        <footer className="image-viewer-bottom"><button disabled={images.length < 2} onClick={() => move(-1)} aria-label={t('Previous image', '上一張圖片')}>←</button><p id={captionId} aria-live="polite">{current.caption[lang]}{current.note && <small className="media-note">{current.note[lang]}</small>}</p><button disabled={images.length < 2} onClick={() => move(1)} aria-label={t('Next image', '下一張圖片')}>→</button></footer>
      </>}
    </dialog>
  </div>;
}
