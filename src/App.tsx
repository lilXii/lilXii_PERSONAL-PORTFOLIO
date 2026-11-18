import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { asset, brand, entries, homeCopy, nav, profile, type Lang } from './data/content';
import { projects, projectRoute } from './data/portfolio';
import { CaseStudy, DirectoryContent, ThemeContent } from './PortfolioContent';
import { playSound } from './audio';
import type { Quality } from './scene/Garage';

const Scene = lazy(() => import('./scene/Scene'));
const readRoute = () => location.hash.slice(1) || '/';
function initialLanguage(): Lang { try { return localStorage.getItem('garage-language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } }
function Icon({ name }: { name: 'arrow' | 'close' | 'sound' | 'muted' | 'reset' | 'grid' }) {
  const paths = {
    arrow: 'M5 12h14M13 6l6 6-6 6', close: 'm6 6 12 12M6 18 18 6',
    sound: 'm11 5-6 4H2v6h3l6 4V5ZM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14',
    muted: 'm11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6',
    reset: 'M3 10a9 9 0 1 1 1 7M3 3v7h7', grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLanguage);
  const [route, setRoute] = useState(readRoute);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [intro, setIntro] = useState(() => readRoute() === '/' && !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'off'>('loading');
  const [progress, setProgress] = useState(0);
  const [retry, setRetry] = useState(0);
  const [quality, setQuality] = useState<Quality>('auto');
  const [effectiveQuality, setEffectiveQuality] = useState('high');
  const [sound, setSound] = useState(false);
  const [reset, setReset] = useState(0);
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [panelVisible, setPanelVisible] = useState(route !== '/');
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const panelBody = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const transition = useRef(false);
  const lastMenuTouch = useRef(-1000);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const entry = entries.find(item => item.route === route);
  const project = projects.find(item => projectRoute(item.id) === route);
  const activeEntry = entry ?? entries.find(item => item.id === project?.group);
  const hoveredEntry = entries.find(item => item.id === hover?.id);
  const t = (en: string, zh: string) => lang === 'en' ? en : zh;
  const navigate = (next: string, fromScene = false) => {
    playSound('click', sound);
    if (route === '/') lastFocus.current = document.activeElement as HTMLElement;
    transition.current = fromScene && !reduced && status === 'ready';
    setMenu(false); setHover(null); setIntro(false);
    if (next === route) { if (next !== '/') setPanelVisible(true); return; }
    location.hash = next;
  };
  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches); query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
    try { localStorage.setItem('garage-language', lang); } catch { /* Private mode still supports session language changes. */ }
    const label = project?.title[lang] ?? entry?.title[lang] ?? nav.find(item => item.route === route)?.label[lang];
    document.title = label ? `${label} | ${brand.name}` : brand.title;
  }, [lang, route, entry, project]);
  useEffect(() => {
    setCopied(false); setHover(null);
    if (route === '/') { setPanelVisible(false); transition.current = false; return; }
    setIntro(false);
    const delay = transition.current ? 850 : 0; transition.current = false;
    if (delay) setPanelVisible(false);
    const timer = setTimeout(() => { setPanelVisible(true); panelBody.current?.scrollTo(0, 0); }, delay);
    return () => clearTimeout(timer);
  }, [route]);
  useEffect(() => {
    const el = dialog.current;
    if (panelVisible && route !== '/') {
      if (!el?.open) el?.showModal();
      closeButton.current?.focus();
    } else if (el?.open) {
      el.close();
      const target = lastFocus.current;
      if (target?.isConnected && !el.contains(target) && target !== document.body) target.focus();
      else document.querySelector<HTMLButtonElement>('[data-work-button]')?.focus();
    }
  }, [panelVisible, route]);
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => { setStatus('error'); setIntro(false); }, 20000);
    return () => clearTimeout(timer);
  }, [status, retry]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const changeLanguage = () => setLang(value => value === 'en' ? 'zh' : 'en');
  const languageButton = <button className="language" onClick={changeLanguage} aria-label={t('Switch to Chinese', 'Switch to English')}><span className={lang === 'en' ? 'active' : ''}>EN</span><span className="separator">/</span><span className={lang === 'zh' ? 'active' : ''}>中</span></button>;
  const loadAgain = () => { setStatus('loading'); setProgress(0); setRetry(value => value + 1); setIntro(false); };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); } catch { setCopied(false); }
    clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 2500);
  };
  const title = project?.title[lang] ?? entry?.title[lang] ?? nav.find(item => item.route === route)?.label[lang] ?? t('This bay is empty', '找不到這個展示區');
  return <>
    <a className="skip-link" href="#/projects" onClick={event => { event.preventDefault(); navigate('/projects'); }}>{t('Skip to work', '跳至作品')}</a>
    <header className="site-header">
      <button className="brand" onClick={() => { navigate('/'); setReset(value => value + 1); }} aria-label={t('lilXii home', 'lilXii 首頁')}>
        <img className="brand-mark" src={asset(brand.icon)} width="40" height="40" alt="" /><span><span className="brand-wordmark">{brand.name}</span><span className="brand-sub">{brand.tagline}</span></span>
      </button>
      <nav className={menu ? 'main-nav expanded' : 'main-nav'} aria-label={t('Main navigation', '主要導覽')}>
        {nav.map(item => <button key={item.route} onClick={() => navigate(item.route)} aria-current={route === item.route ? 'page' : undefined}>{item.label[lang]}{item.route === '/contact' && <span aria-hidden="true"> ↗</span>}</button>)}
      </nav>
      <div className="header-right">{languageButton}<button className="menu-toggle" aria-expanded={menu} aria-label={t('Toggle navigation', '切換導覽')}
        onPointerUp={event => { if (event.pointerType === 'touch') { lastMenuTouch.current = performance.now(); setMenu(value => !value); } }}
        onClick={event => { if (event.detail === 0 || performance.now() - lastMenuTouch.current > 700) setMenu(value => !value); }}><Icon name={menu ? 'close' : 'grid'} /></button></div>
    </header>
    <main className={`garage-page ${intro ? 'is-entering' : ''} ${route !== '/' ? 'has-panel' : ''}`}>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> {homeCopy.eyebrow[lang]}</div>
          <h1 id="hero-title">{homeCopy.title[lang]}<br /><em>{homeCopy.titleAccent[lang]}</em></h1>
          <p className="hero-focus">{profile.headline[lang]}</p>
          <p className="hero-tagline">{profile.tagline[lang]}</p>
          <div className="hero-actions"><button className="primary-button" data-work-button onClick={() => navigate('/projects')}>{homeCopy.workButton[lang]}<Icon name="arrow" /></button><button className="resume-link" onClick={() => navigate('/resume')}>{t('Résumé', '履歷')} ↗</button></div>
        </div>
      </section>
      <div className="scene-region" role="region" aria-label={t('Interactive 3D garage. Use the object list below for keyboard navigation.', '互動 3D 車庫。鍵盤使用者可使用下方物件列表。')}>
        <div className="scene-grid" aria-hidden="true" />
        {(status === 'loading' || status === 'ready') && <SceneBoundary key={retry} onError={() => { setStatus('error'); setIntro(false); }}><Suspense fallback={null}>
          <Scene selected={activeEntry?.target ?? null} blocked={route !== '/'} intro={intro} reduced={reduced} quality={quality} reset={reset}
            onReady={() => setStatus('ready')} onProgress={setProgress} onError={() => { setStatus('error'); setIntro(false); }}
            onSelect={id => { const target = entries.find(item => item.id === id); if (target) navigate(target.route, true); }}
            onHover={(id, x, y) => setHover(id ? { id, x, y } : null)} onIntroEnd={() => setIntro(false)} onQuality={setEffectiveQuality} />
        </Suspense></SceneBoundary>}
        {status === 'loading' && <div className="loading-state" role="status"><span className="loading-spinner" /><span>{t('Opening the garage', '車庫載入中')} <b>{progress}%</b></span><button onClick={() => { setStatus('off'); setIntro(false); }}>{t('Browse without 3D', '先閱讀內容')}</button></div>}
        {(status === 'error' || status === 'off') && <div className="scene-fallback" role="status"><span className="eyebrow">{t('THE STORIES ARE STILL HERE', '故事依然在這裡')}</span><h2>{status === 'error' ? t('The garage needs a moment.', '車庫需要一點時間。') : t('Explore at your own pace.', '用自己的步調探索。')}</h2><p>{t('You can browse every section using the navigation and object list.', '仍可使用導覽與物件列表閱讀所有內容。')}</p><button className="outline-button" onClick={loadAgain}>{t('Reload 3D', '重新載入 3D')}<Icon name="reset" /></button></div>}
      </div>
      <div className="viewport-meta"><span className="micro-label">{t('GARAGE / 001', '車庫／001')}</span><span className="micro-label">{t('PROCEDURAL CAR STUDIES · WORK IN PROGRESS', '程式化車輛試作 · 持續製作中')}</span></div>
      <div className="scene-toolbar">
        <div className="interaction-help"><span className="orbit-symbol" aria-hidden="true">↔</span><span>{t('Drag to orbit', '拖曳環繞')}<i />{t('Scroll / pinch to zoom', '滾輪／雙指縮放')}</span></div>
        <div className="tools">
          {intro && <button className="skip-intro" onClick={() => setIntro(false)}>{t('Skip intro', '略過入場')}<span aria-hidden="true">↗</span></button>}
          <button className="icon-button" onClick={() => { setIntro(false); setReset(value => value + 1); playSound('door', sound); }} aria-label={t('Reset view', '回到全景')} title={t('Reset view', '回到全景')}><Icon name="reset" /></button>
          <button className="icon-button" onClick={() => { setSound(value => !value); playSound('click', !sound); }} aria-pressed={sound} aria-label={sound ? t('Mute sound', '關閉音效') : t('Enable sound', '開啟音效')} title={sound ? t('Mute sound', '關閉音效') : t('Enable sound', '開啟音效')}><Icon name={sound ? 'sound' : 'muted'} /></button>
          <label className="quality-label"><span className="sr-only">{t('Graphics quality', '畫面品質')}</span><select aria-label={t('Graphics quality', '畫面品質')} value={quality} onChange={event => setQuality(event.target.value as Quality)}><option value="auto">{t('AUTO', '自動')} / {effectiveQuality === 'high' ? 'HQ' : 'LQ'}</option><option value="high">{t('HIGH', '高品質')}</option><option value="low">{t('LOW', '低品質')}</option></select></label>
        </div>
      </div>
      <section className="object-index" aria-label={t('Garage objects', '車庫物件')}>
        <div className="index-label"><span className="eyebrow">{t('PROJECT INDEX', '作品目錄')}</span><span>↓</span></div>
        {entries.map(item => <button className="object-tab" key={item.id} onClick={() => navigate(item.route, true)} style={{ '--accent': item.color } as React.CSSProperties}><span className="tab-number">{item.number}</span><span className="tab-info"><small>{item.category[lang]}</small><strong>{item.shortTitle[lang]}</strong></span><span className="tab-arrow" aria-hidden="true">↗</span></button>)}
      </section>
    </main>
    <footer className="site-footer"><span>{brand.name} <span className="footer-slash">/</span> {t('PERSONAL PORTFOLIO', '個人作品集')}</span><span>AI · XR · UX · VIDEO <span className="live-dot" /></span></footer>
    {hover && hoveredEntry && route === '/' && <div className="object-tooltip" aria-hidden="true" data-object={hoveredEntry.id} style={{ left: Math.max(12, Math.min(hover.x + 18, window.innerWidth - 230)), top: Math.max(12, hover.y - 62), '--accent': hoveredEntry.color } as React.CSSProperties}><span className="tooltip-number">{hoveredEntry.number}</span><div><strong>{hoveredEntry.title[lang]}</strong><small>{t('View project', '查看作品')}</small></div><span>↗</span></div>}
    <dialog ref={dialog} className="content-dialog" onCancel={event => { event.preventDefault(); navigate('/'); }} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), a[href], select, summary, [tabindex="0"]')].filter(element => element.offsetParent !== null);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} aria-labelledby="panel-title">
      <div className="panel-top"><span className="eyebrow">{brand.name} / {activeEntry ? activeEntry.number : t('DIRECTORY', '目錄')}</span><div>{languageButton}<button className="icon-button" ref={closeButton} onClick={() => navigate('/')} aria-label={t('Close panel', '關閉面板')}><Icon name="close" /></button></div></div>
      <div className="panel-body" ref={panelBody} key={route}>
        {project && activeEntry && <button className="breadcrumb" onClick={() => navigate(activeEntry.route)}>← {activeEntry.title[lang]}</button>}
        <div className="panel-kicker"><span className="live-dot" />{activeEntry ? activeEntry.category[lang] : t('THE PERSONAL GARAGE', '個人車庫')}</div>
        <h2 id="panel-title">{title}<span>.</span></h2>
        {project ? <CaseStudy item={project} lang={lang} navigate={navigate} /> : entry ? <ThemeContent entry={entry} lang={lang} navigate={navigate} /> : <DirectoryContent route={route} lang={lang} navigate={navigate} />}
        {(entry || project) && <div className="share-row"><button className="outline-button" onClick={copyLink}>{copied ? t('Link copied', '已複製連結') : t('Share this project', '分享此作品')}<span aria-hidden="true">↗</span></button><a href={`#${route}`} aria-label={t('Direct link to this entry', '此作品直接連結')}>{`#${route}`}</a></div>}
      </div>
      <div className="panel-bottom"><button onClick={() => navigate('/')}><span aria-hidden="true">←</span>{t('Back to the garage', '返回車庫')}</button><button onClick={() => navigate('/projects')}>{t('All work', '所有作品')}<Icon name="grid" /></button></div>
    </dialog>
  </>;
}
