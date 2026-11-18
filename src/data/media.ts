import assets from './media-assets.json';
import { text as t, type Localized } from './content';

export type MediaId = keyof typeof assets;
export type PortfolioImage = {
  id: MediaId; src: string; thumbnail: string; width: number; height: number;
  kind: 'photo' | 'screen' | 'document' | 'logo'; alt: Localized; caption: Localized; note?: Localized;
};
const descriptions: Record<MediaId, [PortfolioImage['kind'], string, string]> = {
  '01': ['photo', 'Graduation portrait', '畢業個人照'],
  '02': ['logo', 'National Yang Ming Chiao Tung University', '國立陽明交通大學標誌'],
  '03': ['logo', 'National Taiwan University of Sport', '國立臺灣體育運動大學標誌'],
  '04': ['photo', 'Team discussion at the OpenHCI workshop', 'OpenHCI 工作坊團隊討論'],
  '05': ['photo', 'AUO summer internship group photograph', '友達光電暑期實習合照'],
  '06': ['screen', 'AUO AR HUD product illustration', 'AUO AR HUD 產品示意圖'],
  '07': ['screen', 'FoxRAG web chat interface', '陽明交大竹狐小幫手網頁聊天介面'],
  '16': ['photo', 'NYCU Racing team group photograph', 'NYCU Racing 車隊合照'],
  '17': ['photo', 'NYCU Racing team and cars at the circuit', 'NYCU Racing 賽道上的車隊與賽車合照'],
  '18': ['photo', 'Formula Student cars on display', '學生方程式賽車展示'],
  '19': ['photo', 'Filming a Formula Student car at the circuit', '賽道上的車輛影像拍攝紀錄'],
  '20': ['screen', 'Baseball pitching analysis — paired video interface', '棒球投手動作分析：雙影片介面'],
  '21': ['document', '苦 Gym 甘來 project poster', '《苦 Gym 甘來》作品海報'],
  '22': ['document', 'NYCUKA conversational UX research — paper page', 'NYCUKA 對話互動體驗研究論文頁'],
  '23': ['document', 'Traces of Fengcheng — China Design Award certificate', '《風城藝跡》中華設計獎概念組入圍證書'],
  '24': ['document', 'WHOSE INNER VOICE project poster', 'WHOSE INNER VOICE 作品海報'],
  '25': ['screen', 'MediaPipe tracking and a Unity character', 'MediaPipe 人體追蹤與 Unity 角色同步畫面'],
  '26': ['document', 'Immersive VR attention scoring research — paper page', '沉浸式 VR 注意力評分研究論文頁'],
  '27': ['document', 'Traces of Fengcheng / NYCU AR Map project poster', '《風城藝跡》／NYCU AR Map 作品海報'],
  '28': ['screen', 'The Feather That Wandered — title artwork', '《不屬於這裡的羽毛》作品主視覺'],
  '29': ['screen', 'Symphony of the Soil — valley and field environment', 'Symphony of the Soil 山谷與麥田場景'],
  '30': ['screen', 'INSIDE apart — game title screen', '《殘室 INSIDE apart》遊戲標題畫面'],
  '31': ['document', '360° virtual exhibition usability research — paper page', '360° 線上展覽易用性研究論文頁'],
  '32': ['document', 'NYCU 1001 virtual tour research poster', '交大 1001 虛擬導覽研究海報'],
  '33': ['document', 'chicTrip research — affinity mapping process and workshop', 'chicTrip 研究：親和圖分析流程與便利貼整理'],
  '34': ['photo', 'Working at a live broadcast control desk', '現場轉播導播台工作紀錄'],
  '35': ['screen', 'NYCU 360° campus tour website interface', '陽明交大 360° 校園導覽網站介面'],
  '36': ['photo', 'NYCU Racing — on-site team work', 'NYCU Racing 車隊現場工作紀錄'],
  '37': ['photo', 'Exchanging ideas with schools from other countries', '與其他國家的學校交流'],
  '38': ['screen', 'Little Spirit — input (left) and career suggestion (right)', 'Little Spirit：資料輸入（左）與職涯建議卡片（右）'],
};

// The user approved these deck images for the website on 2026-11-18.
// Image 19 uses the high-resolution original; image 37 is a separately approved exchange photo.
export const media = Object.fromEntries(Object.entries(assets).map(([id, asset]) => {
  const [kind, en, zh] = descriptions[id as MediaId];
  return [id, { id, ...asset, kind, alt: t(en, zh), caption: t(en, zh),
    ...(id === '22' ? { note: t('AI-edited · Emails removed', 'AI 處理：已移除 Email') } : {}),
  }];
})) as Record<MediaId, PortfolioImage>;
export const images = (...ids: MediaId[]) => ids.map(id => media[id]);

export const projectImages: Record<string, PortfolioImage[]> = {
  'racing-powertrain': images('17', '18', '16', '19'),
  'racing-communication': images('37', '19', '36'),
  'ar-hud': images('06', '05'),
  'whose-inner-voice': images('24', '04'),
  'mediapipe-unity': images('25'),
  foxrag: images('07'),
  'little-spirit': images('38'),
  chictrip: images('33'),
  'inside-apart': images('30'),
  'symphony-of-the-soil': images('29'),
  feather: images('28'),
  'vr-behavior': images('26'),
  'campus-360': images('35'),
  'counseling-chatbot': images('22'),
  'ar-map': images('27', '23'),
  gym: images('21'),
  'museum-360': images('31'),
  'baseball-analysis': images('20'),
};
export const supportingResearch = {
  title: t('NYCU 1001 virtual tour study', '交大 1001 虛擬導覽研究'),
  description: t('Research poster on navigation and information-seeking in a virtual campus tour.', '虛擬校園導覽中的操作與資訊搜尋行為研究海報。'),
  images: images('32'),
};
