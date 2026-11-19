export type Lang = 'en' | 'zh';
export type Localized = Record<Lang, string>;
export const text = (en: string, zh: string): Localized => ({ en, zh });
export const brand = {
  name: 'lilXii',
  tagline: 'AI · XR · UX',
  title: 'lilXii | Portfolio',
  icon: 'lilxii-icon.svg',
};
export const profile = {
  name: text('ChenShi Liu', '劉宸希'),
  headline: text('AI Product Strategy · XR Development · UX Research', 'AI 產品規劃 · XR 開發 · UX 研究'),
  tagline: text('From user research to interactive prototypes, connecting AI, XR and human experience.', '從使用者研究到互動原型，連結 AI、XR 與人的體驗。'),
  bio: text('My work spans AI product planning, XR development and user research. With Unity, Python and video production, I turn research questions and creative ideas into experiences that can be tested.', '我的工作橫跨 AI 產品規劃、XR 互動開發與使用者研究，結合 Unity、Python 與影音製作經驗，將研究問題與創意轉化為可體驗、可測試的互動原型。'),
  current: text('Currently an AI Strategy & Product Management Intern at ITRI.', '目前於工業技術研究院擔任 AI 策略與產品管理實習生。'),
  email: 'charlie011215@gmail.com',
  socials: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/chenshiliu-lilxii/' }],
  resume: 'documents/chenshi-liu-resume.pdf',
};
export const homeCopy = {
  eyebrow: text('RESEARCH · DEVELOPMENT · EXPERIENCE', '研究 · 開發 · 體驗'),
  title: text('AI · XR', 'AI · XR'), titleAccent: text('& UX.', '& UX.'),
  workButton: text('View projects', '看作品'),
};
export type Entry = {
  id: string; route: string; number: string; title: Localized; shortTitle: Localized; category: Localized;
  summary: Localized; color: string; target: string; kind: 'collection' | 'story' | 'video';
  model?: string; placement?: { position: [number, number, number]; rotationY: number; scale: number };
};
export const entries: Entry[] = [
  { id: 'car-a', route: '/cars/car-a', number: '01', title: text('Racing & Project Management', '車隊與專案管理'), shortTitle: text('Team & Projects', '車隊與管理'), category: text('FORMULA STUDENT', '學生方程式'), summary: text('Coordinating people, schedules and powertrain development at NYCU Racing.', '在 NYCU Racing 動力組，協調人員、時程與動力系統開發。'), color: '#ff4da6', target: 'car-a', kind: 'story', model: 'models/fsae-car-a-prototype.glb', placement: { position: [-2.35, .045, 1], rotationY: Math.PI / 2, scale: 1.35 } },
  { id: 'car-b', route: '/cars/car-b', number: '02', title: text('Racing Brand & Communication', '車隊品牌與傳播'), shortTitle: text('Brand & Stories', '品牌與傳播'), category: text('FORMULA STUDENT', '學生方程式'), summary: text('Connecting the team with sponsors, media and the public through stories and visual content.', '透過社群、影音與宣傳素材，連結車隊、贊助商、媒體與公眾。'), color: '#53d9ed', target: 'car-b', kind: 'story', model: 'models/fsae-car-b-prototype.glb', placement: { position: [2.35, .045, 1], rotationY: Math.PI / 2, scale: 1.35 } },
  { id: 'arcade-01', route: '/projects/arcade-01', number: '03', title: text('Interactive Development', '互動開發'), shortTitle: text('Development', '互動開發'), category: text('INTERACTIVE SYSTEMS', '互動系統'), summary: text('Interactive prototypes, computer vision and technical collaboration—from concepts to working systems.', '從互動原型、電腦視覺到技術協作，將概念轉化為可運作的系統。'), color: '#b7f87a', target: 'arcade-01', kind: 'collection' },
  { id: 'arcade-02', route: '/projects/arcade-02', number: '04', title: text('User Research & Analysis', '使用者研究與分析'), shortTitle: text('User Research', '使用者研究'), category: text('UX & MULTIMODAL DATA', 'UX／多模態資料'), summary: text('Understanding interaction through usability studies, interviews and multimodal behavioral data.', '透過易用性測試、訪談與多模態行為資料，理解使用者的互動經驗。'), color: '#b99aff', target: 'arcade-02', kind: 'collection' },
  { id: 'xr-lab', route: '/projects/xr-lab', number: '05', title: text('XR Experiences', 'XR 體驗'), shortTitle: text('XR Experiences', 'XR 體驗'), category: text('AR / VR / IMMERSIVE', 'AR／VR／沉浸體驗'), summary: text('Spatial interfaces, interactive stories and sound-led experiences built for AR and VR.', '從空間介面到互動敘事，透過程式、視覺與聲音製作 AR／VR 體驗。'), color: '#53d9ed', target: 'xr-lab', kind: 'collection' },
  { id: 'photography', route: '/photography', number: '06', title: text('Video & Live Production', '影像與轉播'), shortTitle: text('Video & Live', '影像與轉播'), category: text('FILM / REELS / LIVE', '影片／REELS／轉播'), summary: text('Sports broadcasts, short-form video and visual storytelling. Camera operation, live directing and editing across different productions.', '運動賽事轉播、短影音與視覺敘事，涵蓋不同專案中的攝影機操作、多機導播與剪輯。'), color: '#f3bf83', target: 'photography', kind: 'video', model: 'models/portfolio-camera.glb', placement: { position: [.5, 1.19, -3.65], rotationY: .15, scale: .8 } },
];
export const nav = [
  { route: '/about', label: text('About', '關於') }, { route: '/projects', label: text('Work', '作品') },
  { route: '/experience', label: text('Experience', '經歷') }, { route: '/education', label: text('Education', '教育背景') },
  { route: '/resume', label: text('Résumé', '履歷') },
  { route: '/contact', label: text('Contact', '聯絡') },
];
export function asset(path: string) { return `${import.meta.env.BASE_URL}${path}`; }
