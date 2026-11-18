import { text as t, type Localized } from './content';

export type CreditLink = { label: Localized; url: string };
export type CreditPreview = { src: string; poster: string; width: number; height: number; alt: Localized; caption: Localized };
export type CreditItem = Localized & { links?: CreditLink[]; preview?: CreditPreview };
export type CreditGroup = { title: Localized; items: CreditItem[] };
const link = (en: string, zh: string, url: string): CreditLink => ({ label: t(en, zh), url });
const credit = (en: string, zh: string, links: CreditLink[]): CreditItem => ({ ...t(en, zh), links });
export const shortFormExperience = [
  t('2022.02–2022.07 · Sports marketing company — produced and edited short-form content for digital platforms.', '2022.02–2022.07｜運動行銷公司：製作與剪輯數位平台短影音。'),
  t('2023.07–2023.08 · Taiwan Cyclist Federation — promotional films and event highlights.', '2023.07–2023.08｜中華民國自行車騎士協會：製作與剪輯宣傳影片及活動精華。'),
];
// In broadcast credits, 攝影 refers to camera operation, not a still-photo portfolio.
export const broadcastCredits: CreditGroup[] = [
  { title: t('Badminton', '羽球'), items: [
  credit('2023 Kaohsiung Masters (Live director)', '2023 高雄羽球大師賽（導播）', [
    link('FTV news report · includes broadcast footage', '民視新聞報導（引用轉播畫面）', 'https://www.youtube.com/watch?v=H2dQrOyYbYA'),
  ]),
  credit('2023 first age-group badminton tournament (Live director)', '2023 羽球第一次分齡賽（導播）', [
    link('U15 / U17 / U19 finals', 'U15／U17／U19 冠軍戰', 'https://www.youtube.com/watch?v=94J3pXk7LX4'),
  ]),
  credit('2022–2023 Taipei badminton ranking tournaments (Camera operator / Live director)', '111–112 台北羽球排名賽（攝影 / 導播）', [
    link('2023 second ranking tournament', '2023 第二次全國羽球排名賽', 'https://www.youtube.com/watch?v=rLLmRGQMsog'),
    link('2023 first ranking tournament', '2023 第一次全國羽球排名賽', 'https://www.youtube.com/watch?v=rwjzfrmNI2U'),
    link('2022 second ranking tournament · 4:58:53', '2022 第二次全國羽球排名賽 · 4:58:53', 'https://www.youtube.com/watch?v=qMtNylkXFD8&t=17933s'),
  ]),
  ] },
  { title: t('Multi-sport events', '綜合運動賽會'), items: [
  credit('2023 National Games, Tainan (Live director)', '112 台南全國運動會（導播）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLXpYB9vilmbRQJJexA-6LSQXjrJNTfNb2'),
  ]),
  credit('2023 National Intercollegiate Athletic Games, Chung Yuan (Camera operator / Live director)', '112 中原全大運（攝影 / 導播）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLXpYB9vilmbTXrTISYte0bth1nW6EA6jj'),
  ]),
  credit('2023 National High School Games, Hsinchu (Camera operator / Live director)', '112 新竹全中運（攝影 / 導播）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLXpYB9vilmbTQEEPCXstKF5kEoYYEjCMG'),
  ]),
  credit('2022 National High School Games, Hualien (Camera operator / Live director)', '111 花蓮全中運（攝影 / 導播）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLXpYB9vilmbR6eulhK3D3mcLlR6ntFGoo'),
  ]),
  credit('2022 National Intercollegiate Athletic Games, Taoyuan (Camera operator)', '111 桃園全大運（攝影）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLXpYB9vilmbQwfwxBNONMT7iNNXeCMK_j'),
  ]),
  ] },
  { title: t('Basketball & football', '籃球與足球'), items: [
  credit('2021–2022 Central Region Basketball League (Camera operator / Live director)', '110–111 中區籃球聯賽（攝影 / 導播）', [
    link('2022 event playlist', '2022 賽事播放清單', 'https://www.youtube.com/playlist?list=PLaygDtYpyWFzfZLTG88zUvMtZELv6Zgls'),
    link('2021 event playlist', '2021 賽事播放清單', 'https://www.youtube.com/playlist?list=PLaygDtYpyWFyvIcE--TAY1Ps7yC3OSx1s'),
  ]),
  credit('2021–2023 柏釧盃 basketball tournaments (Camera operator / Live director)', '110–112 柏釧盃籃球賽（攝影 / 導播）', [
    link('Event playlist 1', '賽事播放清單 1', 'https://www.youtube.com/playlist?list=PLaygDtYpyWFwIoU6FfX70U1vmFoooQmdu'),
    link('Event playlist 2', '賽事播放清單 2', 'https://www.youtube.com/playlist?list=PLNifrgmE8CNqFDUZddr_z42MMPMJRM0kF'),
  ]),
  credit('2021 Taiwan Football Premier League (Camera operator)', '110 臺灣企業甲級足球聯賽（攝影）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLpzqKLXSYKsGzau8kjCUhKYN6mIB1Wxc1'),
  ]),
  credit('2021 Taiwan Futsal League (Camera operator)', '110 臺灣五人制足球聯賽（攝影）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLpzqKLXSYKsH9UE2GXvm3rOMaeFyLCMc0'),
  ]),
  ] },
  { title: t('Cycling', '自行車'), items: [
  credit('2022 Taiwan KOM Challenge (Camera operator)', '2022 台灣 KOM 登山王挑戰（攝影）', [
    link('Race highlights · 7 min', '賽事精華 · 7 分鐘', 'https://www.youtube.com/watch?v=4aSpQzupTOQ'),
  ]),
  credit('2022 DOSUN Suhua cycling race (Camera operator)', '2022 DOSUN 蘇花自行車賽（攝影）', [
    link('Watch race video', '觀看賽事影片', 'https://www.youtube.com/watch?v=9kOJvgijrkU'),
  ]),
  credit('2023 Taipingshan cycling challenge (Camera operator)', '2023 太平山自行車挑戰賽（攝影）', [
    link('Watch broadcast', '觀看轉播', 'https://www.youtube.com/watch?v=S1Ug3OFXe0c'),
  ]),
  ] },
  { title: t('Athletics & road running', '田徑與路跑'), items: [
  credit('2022 NTUS Camel Cup road race (Live director)', '2022 台灣體大駱駝盃路跑賽（導播）', [
    link('Watch broadcast', '觀看轉播', 'https://www.youtube.com/watch?v=Ua5c2GAgvJ0'),
  ]),
  credit('2023 NTUS sports meet and collegiate athletics championship (Live director / Camera operator)', '2023 國立台體運動會暨大專田徑錦標賽（導播 / 攝影）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLaygDtYpyWFyrUCOaKvkyj_QgckJE3Z0T'),
  ]),
  credit('2022 NTUS sports meet and collegiate athletics championship (Camera operator)', '2022 國立台體運動會暨大專田徑錦標賽（攝影）', [
    link('Day 1 broadcast', 'DAY 1 轉播', 'https://www.youtube.com/watch?v=p8ljRSPrLws'),
    link('Additional broadcast', '另一場轉播', 'https://www.youtube.com/watch?v=vQ0LEewtySs'),
  ]),
  ] },
  { title: t('Weightlifting & volleyball', '舉重與排球'), items: [
  credit('2023 President’s Cup weightlifting (Camera operator / Live director)', '2023 總統盃舉重（攝影 / 導播）', [
    link('YouTube channel · live archive', 'YouTube 頻道直播列表', 'https://www.youtube.com/@user-ob3dc2py4d/streams'),
  ]),
  credit('2022–2023 USR NTUS Cup Central Region interschool volleyball exchange (Live director)', '2022–2023 USR 台體盃中區乙組校際排球交流賽（導播）', [
    link('Event playlist', '賽事播放清單', 'https://www.youtube.com/playlist?list=PLaygDtYpyWFzPlw0UJmzbtMLXNm4Q3r9u'),
  ]),
  ] },
  { title: t('Press conferences & event broadcasts', '記者會與活動轉播'), items: [
  // Keep the two press conferences explicitly moved here in the previous request.
  credit('2022 Basketball Industry Development Project press conference (Camera operator)', '2022 籃球產業發展計畫記者會（攝影）', [
    link('Watch press conference', '觀看記者會', 'https://www.youtube.com/watch?v=ufHXxFtbVzg'),
  ]),
  credit('Second 柏釧盃 basketball invitational launch press conference (Live director)', '第二屆柏釧盃籃球邀請賽啟動記者會（導播）', [
    link('Watch press conference', '觀看記者會', 'https://www.youtube.com/watch?v=PBehWQkqZwo'),
  ]),
  credit('2022 International Sports Tourism Conference (Live director)', '2022 國際運動觀光研討會（導播）', [
    link('Facebook broadcast', 'Facebook 轉播紀錄', 'https://fb.watch/p44IYVcPOs/'),
  ]),
  ] },
];
export const productionCredits: CreditGroup[] = [
  { title: t('Programs', '節目製作'), items: [t('《臺體點將錄》— Camera operator', '《臺體點將錄》｜攝影'), t('《體壇夜話》— Executive production', '《體壇夜話》｜執行製作')] },
  { title: t('Event films', '活動影像'), items: [
    t('Department student association videos: 畢業祝福片、直屬徵信社、系遊、聖誕專案、運傳樂棒賽、皮克尼克、十年一刻 — Cinematography / Editing for all listed films.', '運傳系學會活動影片：畢業祝福片、直屬徵信社、系遊、聖誕專案、運傳樂棒賽、皮克尼克、十年一刻｜皆負責攝影 / 剪輯。'),
    t('2023 Nantou Century 100K cycling challenge and town-tour carnival: press conference and Jiji town ride — Cinematography / Editing for both productions.', '2023 南投世紀百 K 自行車挑戰暨小鎮漫遊嘉年華：記者會、集集小鎮采風漫騎｜皆負責攝影 / 剪輯。'),
  ] },
  { title: t('Sports reporting & aerial video', '體育新聞與空拍'), items: [
    t('2020 National Intercollegiate Athletic Games, woodball — Sports reporter', '2020 全大運木球項目｜體育記者'),
    t('2023 瑟飛斯盃 mountain bike race — Aerial camera work', '2023 瑟飛斯盃登山車賽｜空拍攝影'),
    { ...t('2023 柏釧盃 basketball tournament opening — Aerial camera work', '2023 柏釧盃籃球賽片頭｜空拍攝影'), preview: {
      src: 'images/video/aerial-basketball-opening.gif', poster: 'images/video/aerial-basketball-poster.webp', width: 400, height: 225,
      alt: t('Aerial footage from the 柏釧盃 basketball tournament opening', '柏釧盃籃球賽片頭空拍畫面'), caption: t('Opening sequence · Aerial excerpt', '片頭空拍節錄'),
    } },
  ] },
];
export type Film = { id: string; title: string; kind: Localized; note?: Localized; role: Localized | null; year: string | null; image: string | null; url: string | null; linkLabel?: Localized };
export const reels: Film[] = [
  { id: 'fsaej-2026-d4', title: '2026 FSAE-J · D4 Vlog', kind: t('Racing vlog / Reel', '車隊 Vlog／Reel'), role: t('Filming / Editing', '拍攝 / 剪輯'), year: '2026', image: 'images/reels/2026-fsaej-d4-cover.webp', url: 'https://www.instagram.com/nycu_vulpes_racing/', linkLabel: t('View Reels on Instagram', '前往 Instagram 查看 Reels') },
];
export const films: Film[] = [
  { id: 'infinite-gang', title: '無限之岡', kind: t('Documentary', '紀錄片'), role: t('Cinematography', '攝影'), year: null, image: null, url: null },
  { id: 'after-full-count', title: '滿球數之後', kind: t('Documentary', '紀錄片'), role: t('Cinematography', '攝影'), year: null, image: null, url: null },
  { id: 'unknown-call', title: '不明來電', kind: t('Short film', '微電影'), note: t('Selected for MOD Film Competition', '入選 MOD 電影創作大賽'), role: t('Director / Editor', '導演 / 剪輯'), year: '2019', image: null, url: null },
];
