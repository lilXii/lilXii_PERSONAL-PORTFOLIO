import { useState, type CSSProperties } from 'react';
import { asset, entries, profile, type Entry, type Lang } from './data/content';
import { about, awards, contactCopy, education, experience, featuredIds, projects, projectRoute, skills, type Project } from './data/portfolio';
import { broadcastCredits, productionCredits, shortFormExperience, reels, films, type CreditGroup, type CreditPreview } from './data/video';
import { images, media, supportingResearch } from './data/media';
import { MediaGallery, MediaImage } from './MediaGallery';

type Props = { lang: Lang; navigate: (route: string) => void };
const translate = (lang: Lang) => (en: string, zh: string) => lang === 'en' ? en : zh;
export function ThemeCards({ lang, navigate, items = entries }: Props & { items?: Entry[] }) {
  return <div className="theme-list">{items.map(item => <button key={item.id} className="theme-row" onClick={() => navigate(item.route)} style={{ '--accent': item.color } as CSSProperties}>
    <span className="theme-number">{item.number}</span><span><strong>{item.title[lang]}</strong><small>{item.summary[lang]}</small></span><span aria-hidden="true">↗</span>
  </button>)}</div>;
}
export function CaseCards({ items, lang, navigate }: Props & { items: Project[] }) {
  const t = translate(lang);
  return <div className="case-grid">{items.map(item => <button className="case-card" key={item.id} onClick={() => navigate(projectRoute(item.id))} style={{ '--accent': entries.find(e => e.id === item.group)?.color } as CSSProperties}>
    {item.image && <span className={`case-card-visual image-kind-${item.image.kind}`}><MediaImage image={item.image} lang={lang} thumbnail decorative /></span>}
    <span className="case-card-meta">{item.dates[lang]}</span><strong>{item.title[lang]}</strong><span className="case-card-subtitle">{item.subtitle[lang]}</span>
    <span className="case-card-role">{item.role[lang]}</span><span className="case-card-footer"><span>{item.gallery.length ? `${item.gallery.length} ${t('images · View project', '張圖片・查看作品')}` : t('View project', '查看作品')}</span><span aria-hidden="true">↗</span></span>
  </button>)}</div>;
}
function Media({ item, lang }: { item: Project; lang: Lang }) {
  const t = translate(lang);
  return <section className="case-media" aria-label={t('Project media', '作品媒體')}>
    {item.gallery.length ? <MediaGallery images={item.gallery} lang={lang} /> : <div className="media-placeholder"><span className="media-frame" aria-hidden="true">＋</span><div><strong>{t('Project images to be added', '作品圖片待補')}</strong><p>{t('Screenshots, prototypes or process documentation.', '預留畫面截圖、原型或製作過程紀錄。')}</p></div></div>}
    {item.videoUrl ? <a className="text-link" href={item.videoUrl} target="_blank" rel="noreferrer">{t('Watch project video', '觀看作品影片')} ↗</a> : <p className="media-status">{t('Video / demo link to be added', '影片／展示連結待補')}</p>}
  </section>;
}
function AwardList({ lang, ids, navigate }: Props & { ids?: string[] }) {
  const t = translate(lang); const list = ids ? awards.filter(a => ids.includes(a.id)) : awards;
  return <ul className="award-list">{list.map(item => <li key={item.id}><span className="award-year">{item.year ?? t('Year pending', '年份待補')}</span><div><strong>{item.title[lang]}</strong><p>{item.detail[lang]}</p>{!ids && item.projectId && <button className="text-link" onClick={() => navigate(projectRoute(item.projectId!))}>{t('View project', '查看作品')} ↗</button>}</div></li>)}</ul>;
}
export function CaseStudy({ item, lang, navigate }: Props & { item: Project }) {
  const t = translate(lang);
  return <>
    <p className="panel-lead">{item.summary[lang]}</p>
    <div className="project-facts"><div><span>{t('MY ROLE', '個人角色')}</span><p>{item.role[lang]}</p></div><div><span>{t('TIMELINE', '參與時間')}</span><p>{item.dates[lang]}</p></div></div>
    <div className="tag-list">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    <Media item={item} lang={lang} />
    {item.sections.map(section => <section className="detail-section" key={section.title.en}><h3>{section.title[lang]}</h3><p>{section.body[lang]}</p></section>)}
    {!!item.awards.length && <section className="detail-section"><h3>{t('Recognition', '獎項與入選')}</h3><AwardList ids={item.awards} lang={lang} navigate={navigate} /></section>}
    {!!item.related?.length && <section className="detail-section"><h3>{t('Related projects', '相關作品')}</h3><CaseCards items={projects.filter(p => item.related!.includes(p.id))} lang={lang} navigate={navigate} /></section>}
  </>;
}
function CreditPreviewMedia({ preview, lang }: { preview: CreditPreview; lang: Lang }) {
  const [playing, setPlaying] = useState(false);
  const t = translate(lang);
  return <figure className="credit-preview">
    <img src={asset(playing ? preview.src : preview.poster)} alt={preview.alt[lang]} width={preview.width} height={preview.height} loading="lazy" decoding="async" />
    <figcaption><span>{preview.caption[lang]}</span><button type="button" aria-pressed={playing} onClick={() => setPlaying(value => !value)}>{playing ? t('Stop playback', '停止播放') : t('Play aerial clip', '播放空拍片段')} {playing ? 'Ⅱ' : '▶'}</button></figcaption>
  </figure>;
}
function CreditList({ groups, lang }: { groups: CreditGroup[]; lang: Lang }) {
  return <div className="credit-list">{groups.map(group => <details key={group.title.en}>
    <summary>{group.title[lang]}<span aria-hidden="true">＋</span></summary>
    <ul>{group.items.map(item => <li key={item.en}>
      <span>{item[lang]}</span>
      {item.preview && <CreditPreviewMedia key={item.preview.src} preview={item.preview} lang={lang} />}
      {!!item.links?.length && <div className="credit-links">{item.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${item[lang]} — ${link.label[lang]}${lang === 'zh' ? '（另開分頁）' : ' (opens in a new tab)'}`}>
        <span>{link.label[lang]}</span><span aria-hidden="true">↗</span>
      </a>)}</div>}
    </li>)}</ul>
  </details>)}</div>;
}
function VideoPortfolio({ lang, navigate }: Props) {
  const [tab, setTab] = useState('reels'); const t = translate(lang);
  const broadcastAward = awards.find(item => item.id === 'broadcast-team')!;
  const tabs = [{ id: 'reels', label: t('Short films / Reels', '短片／Reels') }, { id: 'live', label: t('Live broadcasts', '現場轉播') }, { id: 'films', label: t('Film & production', '影像製作') }];
  return <>
    <div className="video-tabs" role="tablist" aria-label={t('Video categories', '影音分類')}>{tabs.map((item, index) => <button key={item.id} id={`tab-${item.id}`} role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`video-${item.id}`} onClick={() => setTab(item.id)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
      if (next >= 0) { event.preventDefault(); setTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus(); }
    }}>{item.label}</button>)}</div>
    <section id={`video-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="video-tab-panel">
      {tab === 'reels' ? <>
        <div className="reel-list">{reels.map(reel => <article className="reel-card" key={reel.id}>
          {reel.image && <img className="reel-cover" src={asset(reel.image)} alt={`${reel.title}${t(' cover', ' 封面')}`} width="1080" height="1920" decoding="async" />}
          <div className="reel-copy"><span className="eyebrow">SELECTED REELS</span><h3>{reel.title}</h3><p>{reel.kind[lang]}</p><p>{reel.role?.[lang] ?? t('Individual role to be added', '個人職責待補')}</p>
            {reel.url ? <a className="text-link" href={reel.url} target="_blank" rel="noopener noreferrer">{reel.linkLabel?.[lang] ?? t('Watch Reel', '觀看 Reel')} ↗</a> : <span className="media-status">{t('Reel link to be added', 'Reel 連結待補')}</span>}
          </div>
        </article>)}</div>
        <section className="detail-section"><h3>{t('Short-form & promotional video', '短影音與宣傳影片')}</h3>{shortFormExperience.map((item, i) => <p key={i}>{item[lang]}</p>)}</section>
        <button className="text-link" onClick={() => navigate('/cars/car-b')}>{t('Explore racing-team communication', '查看車隊品牌與傳播')} ↗</button>
      </> : tab === 'live' ? <>
        <p className="section-intro">{t('Explore each category for events and production roles. Video and playlist links open in a new tab.', '依類別展開，逐場查看活動與攝影／導播職責。影片與播放清單將另開分頁。')}</p>
        <ul className="broadcast-list">
          <li className="broadcast-recognition"><strong>{lang === 'zh' ? Number(broadcastAward.year) - 1911 : broadcastAward.year} {broadcastAward.title[lang]}</strong><small>{broadcastAward.detail[lang]}</small></li>
        </ul>
        <MediaGallery images={images('34')} lang={lang} />
        <CreditList groups={broadcastCredits} lang={lang} />
      </> : <>
        <div className="film-grid">{films.map(film => <article className="film-card" key={film.id}><span className="eyebrow">{film.kind[lang]}</span><h3>{film.title}</h3>{film.note && <p className="film-award">{film.note[lang]}</p>}<p>{film.role?.[lang] ?? t('Individual role to be added', '個人職責待補')} · {film.year ?? t('Year pending', '年份待補')}</p>{film.image && <img src={asset(film.image)} alt={film.title} loading="lazy" />}{film.url ? <a className="text-link" href={film.url} target="_blank" rel="noreferrer">{t('Watch film', '觀看影片')} ↗</a> : <span className="media-status">{t('Cover / video link to be added', '封面／影片連結待補')}</span>}</article>)}</div>
        <h3 className="section-heading">{t('Production credits', '節目與活動經歷')}</h3><CreditList groups={productionCredits} lang={lang} />
      </>}
    </section>
  </>;
}
export function ThemeContent({ entry, lang, navigate }: Props & { entry: Entry }) {
  const t = translate(lang); const items = projects.filter(p => p.group === entry.id);
  if (entry.kind === 'story') return <>
    <CaseStudy item={items[0]} lang={lang} navigate={navigate} />
    <p className="model-note">{t('This model is a stylized placeholder. The vehicle name, year and relationship to this experience are to be added.', '場景車輛為風格化占位模型。正式車名、年份與這段經歷的對應關係待補。')}</p>
    {entry.id === 'car-b' && <button className="text-link" onClick={() => navigate('/photography')}>{t('Explore video & live production', '查看影像與轉播')} ↗</button>}
  </>;
  return <><p className="panel-lead">{entry.summary[lang]}</p>{entry.kind === 'video' ? <VideoPortfolio lang={lang} navigate={navigate} /> : <>
    <div className="collection-meta"><span>{t('PROJECT COLLECTION', '作品選集')}</span><span>{String(items.length).padStart(2, '0')} {t('PROJECTS', '件作品')}</span></div>
    <CaseCards items={items} lang={lang} navigate={navigate} />
    {entry.id === 'arcade-02' && <section className="detail-section supporting-research"><h3>{supportingResearch.title[lang]}</h3><p>{supportingResearch.description[lang]}</p><MediaGallery images={supportingResearch.images} lang={lang} compact /></section>}
    {entry.id === 'xr-lab' && <section className="detail-section"><h3>{t('Related research', '相關研究')}</h3><CaseCards items={projects.filter(p => p.id === 'vr-behavior')} lang={lang} navigate={navigate} /></section>}
  </>}</>;
}
function Timeline({ lang, navigate, compact = false }: Props & { compact?: boolean }) {
  const t = translate(lang);
  return <ol className={`timeline ${compact ? 'compact' : ''}`}>{experience.map((item, i) => <li key={i}>
    <span className="timeline-date">{item.dates[lang]}</span>
    <div className="timeline-content">
      <div className="timeline-heading">
        <span className={`organization-logo${item.logo?.dark ? ' personal-logo' : ''}${!item.logo ? ' organization-icon' : ''}`}>
          {item.logo ? <img src={asset(item.logo.src)} alt={item.logo.alt[lang]} width={item.logo.width} height={item.logo.height} decoding="async" /> : <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4" y="8" width="18" height="16" rx="2" /><path d="m22 13 6-4v14l-6-4M11 12l6 4-6 4z" /></svg>}
        </span>
        <div><h3>{item.organization[lang]}</h3><strong>{item.role[lang]}</strong><span className="timeline-location">{item.location[lang]}</span></div>
      </div>
      {!compact && <p>{item.description[lang]}</p>}
      {!compact && item.gallery && <MediaGallery images={item.gallery} lang={lang} compact />}
      {item.projectId && <button className="text-link" onClick={() => navigate(projectRoute(item.projectId!))}>{t('Related project', '相關作品')} ↗</button>}
    </div>
  </li>)}</ol>;
}
function Education({ lang }: { lang: Lang }) {
  return <div className="education-list">{education.map(item => <article key={item.school.en}><div className="education-heading"><span className="school-logo"><MediaImage image={item.logo} lang={lang} thumbnail /></span><div><span className="timeline-date">{item.dates}</span><h3>{item.school[lang]}</h3><strong>{item.program[lang]}</strong></div></div><p>{item.description[lang]}</p></article>)}</div>;
}
export function DirectoryContent({ route, lang, navigate }: Props & { route: string }) {
  const t = translate(lang);
  if (route === '/projects') return <>
    <p className="panel-lead">{t('Selected work in XR development, user research and interactive systems.', 'XR 開發、使用者研究與互動系統的精選作品。')}</p>
    <h3 className="section-heading">{t('Selected projects', '精選作品')}</h3><CaseCards items={featuredIds.map(id => projects.find(p => p.id === id)!)} lang={lang} navigate={navigate} />
    <h3 className="section-heading">{t('Explore all six themes', '依主題探索')}</h3><ThemeCards lang={lang} navigate={navigate} />
  </>;
  if (route === '/about') return <>
    <div className="about-intro"><figure className="profile-portrait"><MediaImage image={media['01']} lang={lang} eager /></figure><div><p className="panel-lead">{profile.bio[lang]}</p><div className="current-role"><span className="live-dot" />{profile.current[lang]}</div></div></div>
    <div className="about-prose">{about.map((p, i) => <p key={i}>{p[lang]}</p>)}</div>
    <h3 className="section-heading">{t('Focus & tools', '專業領域與工具')}</h3><div className="skills-grid">{skills.map((skill, i) => <section key={skill.title.en}><span className="theme-number">0{i + 1}</span><h3>{skill.title[lang]}</h3><p>{skill.body[lang]}</p></section>)}</div>
    <button className="outline-button" onClick={() => navigate('/resume')}>{t('View résumé', '查看履歷')} ↗</button>
  </>;
  if (route === '/experience') return <><p className="panel-lead">{t('AI product planning, interactive development and production across teams and disciplines.', '從 AI 產品規劃、互動開發到影音製作，跨團隊與跨領域的實務經歷。')}</p><Timeline lang={lang} navigate={navigate} /><h3 className="section-heading">{t('Broadcast & production credits', '轉播與製作經歷')}</h3><button className="outline-button" onClick={() => navigate('/photography')}>{t('View video & live production', '查看影像與轉播')} ↗</button></>;
  if (route === '/education') return <Education lang={lang} />;
  if (route === '/resume') return <>
    <p className="panel-lead">{profile.headline[lang]}</p><p className="resume-name">{profile.name[lang]}</p><p className="section-intro">{profile.bio[lang]}</p>
    <div className="resume-download">{profile.resume ? <a className="outline-button" href={asset(profile.resume)} download="ChenShi Liu.pdf">{t('Download résumé', '下載履歷')} ↗</a> : <><button className="outline-button" disabled>{t('PDF not yet available', '尚未提供 PDF')}</button><span>{t('Public résumé PDF to be added', '公開版履歷 PDF 待補')}</span></>}</div>
    <h3 className="section-heading">{t('Experience', '工作經歷')}</h3><Timeline lang={lang} navigate={navigate} compact />
    <h3 className="section-heading">{t('Education', '教育背景')}</h3><Education lang={lang} />
    <h3 className="section-heading">{t('Skills', '專業技能')}</h3><ul className="resume-skills">{skills.map(s => <li key={s.title.en}><strong>{s.title[lang]}</strong><p>{s.body[lang]}</p></li>)}</ul>
    <h3 className="section-heading">{t('Awards & exhibitions', '獎項、入選與展出')}</h3><AwardList lang={lang} navigate={navigate} />
  </>;
  if (route === '/contact') return <><p className="panel-lead">{contactCopy[lang]}</p><div className="contact-item"><span className="eyebrow">EMAIL</span>{profile.email ? <a href={`mailto:${profile.email}`}>{profile.email} ↗</a> : <p>{t('Public email to be added', '公開 Email 待補')}</p>}</div><div className="contact-item"><span className="eyebrow">{t('ELSEWHERE', '其他平台')}</span>{profile.socials.length ? profile.socials.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>) : <p>{t('Social links to be added', '社群連結待補')}</p>}</div></>;
  return <><p className="panel-lead">{t('This link does not match an entry in the garage.', '這個連結沒有對應的車庫內容。')}</p><button className="primary-button" onClick={() => navigate('/projects')}>{t('Browse the work', '瀏覽作品')}<span aria-hidden="true">↗</span></button></>;
}
