/**
 * 乩der — 仿 Tinder 的交友軟體（下班後的乩身私生活）。
 *
 * 諷刺核心：起乩賺來的香火錢，全用來在交友軟體上「展示行情」。
 *   · 右滑＝你想要對方；但只有當你「真的買得起／已擁有對方暗示的奢侈品」時才會配對成功。
 *   · 自介不會講白要什麼，只留蛛絲馬跡（要你去對照商城商品說明才解得開）。
 *   · 配對後對方不一定馬上接受；過幾秒會有推播通知，接受了才能聊。
 *   · 聊天只有選項，不能自己打字。
 *   · 有人是真心、有人貪你的錢、有人是詐騙——但就算最真心的人，也照樣不停跟你要奢侈品。
 *     那種「人人都在標價碼」的窒息感，就是這個社會的縮影。
 *
 * 花的是已賺的 cash（聊天送禮會扣現金），不影響廟務經濟死活。
 */

/* ── 配對門檻：每個人暗示想要某類／某級距的奢侈品 ──
 *  gate.test(owned) 回傳布林：你目前的收藏是否「夠格」。
 *  hint：卡片上自介裡藏的線索（玩家要自己讀出來、對照商城）。
 *  clue：被拒時給玩家的提示（仍不講白，引導去商城對照）。
 */
const has = (owned, prefix) => owned.some((id) => id.startsWith(prefix));
const ownsAny = (owned, ids) => ids.some((id) => owned.includes(id));
/* 某類別中「至少達到某價位」——用 id 白名單表示級距，免得綁死順序 */
const TIER = {
  carMid: ['car-benz-c', 'car-bmw-m', 'car-porsche', 'car-ferrari', 'car-bugatti'],
  carTop: ['car-porsche', 'car-ferrari', 'car-bugatti'],
  carHyper: ['car-ferrari', 'car-bugatti'],
  watchMid: ['watch-rolex', 'watch-ap', 'watch-pp', 'watch-rm'],
  watchTop: ['watch-ap', 'watch-pp', 'watch-rm'],
  wineMid: ['wine-champagne', 'wine-macallan', 'wine-lafite-82', 'wine-macallan-fine', 'wine-romanee'],
  wineTop: ['wine-lafite-82', 'wine-macallan-fine', 'wine-romanee'],
  jewelTop: ['jewelry-diamond-ring', 'jewelry-starry-watch', 'jewelry-pigeon-ruby'],
  mansionMid: ['mansion-apartment', 'mansion-villa', 'mansion-dibao', 'mansion-palm-island'],
  mansionTop: ['mansion-villa', 'mansion-dibao', 'mansion-palm-island'],
  mansionHyper: ['mansion-dibao', 'mansion-palm-island'],
};

/* 「頂級炫耀品」白名單：擁有任一件＝財力外溢到誰都想黏你。
 *  比各對象的配對門檻更高一階，用來觸發「黏人逆襲」隱藏路線。 */
const CLING_TROPHIES = [
  'car-ferrari', 'car-bugatti', // 超跑
  'watch-pp', 'watch-rm', // 頂錶
  'wine-macallan-fine', 'wine-romanee', // 神級酒
  'jewelry-starry-watch', 'jewelry-pigeon-ruby', // 頂珠寶
  'mansion-dibao', 'mansion-palm-island', // 天花板豪宅
];
/* 你的收藏是否「閃到讓這個人主動黏上來」。
 *  條件：擁有任一頂級炫耀品（普世通用）——價值遠超對方的配對門檻。
 *  （之後若要做「對象專屬覬覦品」可在這裡按 t.id 再加判斷） */
export function wooedBy(target, owned) {
  return CLING_TROPHIES.some((id) => owned.includes(id));
}

/* ════════════════ 配對對象（約 12 位・多圈子） ════════════════
 * type: sincere（真心，但照樣愛奢侈品）/ golddigger（貪錢）/ scammer（詐騙）
 * gate: { test(owned), hint（卡片自介藏的線索）, clue（被拒提示） }
 * chat: 一棵對話樹。node = { text, opts:[{ label, cost?, gift?, goto?, end? }] }
 *   cost 直接扣 cash；gift 需擁有某類奢侈品才可選（test + need 顯示名）。
 *   end = { good:boolean, line } 結束對話。
 *   convo: 關係養成式聊天資料（分階段話題池），來自 dating_convo.js，於檔尾掛上。
 */
import { CONVOS } from './dating_convo.js';

export const TARGETS = [
  // ── 夜店／網美圈 ──
  {
    id: 't-yuki', name: 'Yuki', age: 24, label: '夜店常客', region: '信義區', img: '/dating/date-girl-1.jpg',
    type: 'golddigger',
    bio: '週末都泡信義區包廂。停車場那排，我只看引擎蓋上有沒有躍馬。代步車就別開來了，會擋到我的位子。🏎️',
    gate: { test: (o) => ownsAny(o, TIER.carTop), hint: '「躍馬」＝某義大利車廠的標誌（保時捷以上等級）', clue: '她只看「引擎蓋上的標誌」，喜美、Altis 這種等級她連看都不看。' },
    chat: {
      start: { text: '哇你車真的不錯欸～加個 LINE？不過先說，我這種等級的女生，平常開銷你懂的吧😘',
        opts: [
          { label: '懂，照顧鐵粉是基本款', goto: 'wine' },
          { label: '開銷？我們各付各的', goto: 'cheap' },
        ] },
      wine: { text: '人家想喝氣泡的，要有牌子那種，超商賣的我會過敏🥂',
        opts: [
          { label: '這支當作給妳的香火錢', gift: { test: (o) => has(o, 'wine-'), need: '好酒' }, goto: 'happy' },
          { label: '超商高粱也是氣泡的啊', goto: 'cheap' },
        ] },
      happy: { text: '欸你超上道❤️ 那…下次帶我去看你陽明山那個「據點」？聽說香火…啊不是，view 超好。', end: { good: true, line: 'Yuki 把你設成 ⭐ 最愛聯絡人（並開始研究你的不動產）。' } },
      cheap: { text: '各付各的？執行長你還是回去顧你的新創吧🙄 bye～', end: { good: false, line: 'Yuki 已將你封鎖。' } },
    },
  },
  {
    id: 't-anny', name: '安妮', age: 26, label: '微網紅', region: '東區', img: '/dating/date-girl-2.jpg',
    type: 'sincere',
    bio: 'IG 經營美食＋開箱，最近迷上鑑賞時間的厚度。手腕上那點重量，比甜言蜜語誠實。⌚ 拍照要好看喔。',
    gate: { test: (o) => ownsAny(o, TIER.watchMid), hint: '「手腕上的重量」「鑑賞時間」＝一支上得了鏡頭的名錶（勞力士以上）', clue: '她說「手腕上的重量比甜言蜜語誠實」——你得有支拿得出手的錶。' },
    chat: {
      start: { text: '你的錶我剛剛偷拍進限動了😆 我真的是看細節的人～你人感覺也很好。',
        opts: [
          { label: '看細節？我們做的就是洞察', goto: 'real' },
          { label: '只看細節？來看我整櫃資產', goto: 'flex' },
        ] },
      real: { text: '好啊好啊！不過…我下個月生日，想要的不貴啦，就一個小小的、亮亮的、戴手上那種💍（眨眼）',
        opts: [
          { label: '這顆當妳的開運投資', gift: { test: (o) => has(o, 'jewelry-'), need: '金飾' }, goto: 'happy' },
          { label: '我們才剛建立信任欸…', goto: 'slow' },
        ] },
      flex: { text: '哇…你是不是有點太愛展示了？我其實想找認真經營的人啦。',
        opts: [
          { label: '我也是長線經營派啊', goto: 'real' },
          { label: '長線經營很燒成本的', goto: 'slow' },
        ] },
      happy: { text: '嗚我真的好感動…雖然我嘴上說不貴，但你懂我❤️ 我們在一起好不好？', end: { good: true, line: '你和安妮在一起了。她是真心的——也真心地，需要你很多很多東西。' } },
      slow: { text: '喔…好吧，那再聊。（已讀）', end: { good: false, line: '安妮慢慢就不回了。' } },
    },
  },
  {
    id: 't-rin', name: '凜', age: 22, label: '當紅 Coser', region: '西門町', img: '/dating/date-girl-4.jpg',
    type: 'sincere',
    bio: '出 cos 很燒錢 der。喜歡會喝、懂酒的大人，最好是年份比我還老、要醒很久的那種紅。🍷 別點調酒糊弄我。',
    gate: { test: (o) => ownsAny(o, TIER.wineMid), hint: '「年份比我還老」「要醒很久的紅」＝高檔紅酒，不是調酒（香檳王以上）', clue: '她要「年份比她還老、要醒很久的紅」——超商高粱和便宜威士忌都入不了她眼。' },
    chat: {
      start: { text: '你居然真的懂酒！好難得喔～大部分男生只會點長島冰茶想灌醉我ㄟ',
        opts: [
          { label: '開支好的，幫妳同頻一下', goto: 'wine' },
          { label: '我那「據點」整面牆都是酒', goto: 'wine' },
        ] },
      wine: { text: '欸真的喔😳 那…我下個月有場大型場子，治裝費快燒不動了，可以…贊助一下嗎？我會很乖的🥺',
        opts: [
          { label: '撥 3 萬給妳的個人品牌', cost: 30000, goto: 'happy' },
          { label: '我比較想直接約妳對焦', goto: 'push' },
        ] },
      push: { text: '哎唷你壞壞～那你先贊助嘛，看到誠意我什麼都好說🥺',
        opts: [
          { label: '好啦，挹注 3 萬', cost: 30000, goto: 'happy' },
          { label: '先見面再說', end: { good: false, line: '凜：「都不挺我QQ」然後已讀不回。' } },
        ] },
      happy: { text: '你最好了❤️ 場子結束我私訊穿那套給你看～', pic: '/dating/selfie-t-rin.jpg', end: { good: true, line: '凜成了你的固定對象。她真心待你，並真心地，永遠在募治裝費。' } },
    },
  },
  // ── 空姐／OL 圈 ──
  {
    id: 't-tina', name: 'Tina', age: 28, label: '長榮空姐', region: '南港', img: '/dating/date-girl-3.jpg',
    type: 'golddigger',
    bio: '飛遍全世界，落地只想回到有 view 的家。十八層以下、看不到河的，我會幽閉恐懼。🏙️ 別約我去你套房喔。',
    gate: { test: (o) => ownsAny(o, TIER.mansionMid), hint: '「十八層以下會幽閉」「看得到河」＝高樓層河岸景觀宅，小套房不行', clue: '她「十八層以下、看不到河會幽閉恐懼」——你那間小套房她不會來。' },
    chat: {
      start: { text: '你家 view 真的可以欸👀 不過先講，我很忙 der，要約我得有點誠意。',
        opts: [
          { label: '帶妳去米其林談合作', cost: 12000, goto: 'happy' },
          { label: '在家煮給妳吃', goto: 'cheap' },
        ] },
      happy: { text: '嗯～這還差不多。下次想坐你那台後面有躍馬的兜風😏', end: { good: true, line: 'Tina 願意跟你飛——只要你一直買得起頭等艙等級的人生。' } },
      cheap: { text: '在家？我落地累得要死還要看你煮泡麵喔，算了。', end: { good: false, line: 'Tina 已切換成飛航模式（對你）。' } },
    },
  },
  {
    id: 't-hana', name: 'Hana', age: 25, label: '日系藥師', region: '中山區', img: '/dating/date-girl-5.jpg',
    type: 'sincere',
    bio: '個性慢熟，喜歡有質感的小日子。比起名牌，我更在意一頓好好的飯——但要是真的好的那種喔。🍽️',
    gate: { test: () => true, hint: '她沒有很物質，只要你願意好好請一頓飯', clue: '（這位門檻很低——她要的是誠意，不是行頭。）' },
    chat: {
      start: { text: '你看起來不像會亂放電的人，我喜歡踏實一點的☺️',
        opts: [
          { label: '吃頓好的，慢慢結個善緣', cost: 12000, goto: 'real' },
          { label: '我帶妳看我的收藏', goto: 'flex' },
        ] },
      flex: { text: '收藏喔…（笑）我比較想認識「你」，不是你的東西耶。',
        opts: [
          { label: '抱歉，那一起吃飯就好', cost: 12000, goto: 'real' },
          { label: '東西也是我事業的一部分', end: { good: false, line: 'Hana 禮貌地祝你幸福，然後就沒有然後。' } },
        ] },
      real: { text: '今天很開心。其實…我也想有一天有個能看夕陽的小陽台。不用很大，跟對的人就好。',
        opts: [
          { label: '那個陽台，我來幫妳成全', gift: { test: (o) => has(o, 'mansion-'), need: '豪宅' }, goto: 'happy' },
          { label: '會有那麼一天的', goto: 'wait' },
        ] },
      happy: { text: '…我沒想到你會記得。謝謝你，真的。❤️', end: { good: true, line: '你和 Hana 在一起了。最樸素的願望，最後也得用錢買單——這就是諷刺的地方。' } },
      wait: { text: '嗯，那我等。（她真的會等，只是青春也在標價）', end: { good: true, line: 'Hana 成了曖昧對象，慢慢來。' } },
    },
  },
  // ── 健身／陽剛圈 ──
  {
    id: 't-kevin', name: 'Kevin', age: 30, label: '健身教練', region: '內湖', img: '/dating/date-guy-2.jpg',
    type: 'golddigger',
    bio: '健身房 PT 第一名💪 看人先看手腕——能扛得起重量、也戴得起重量的男人，才配跟我練雙人。',
    gate: { test: (o) => ownsAny(o, TIER.watchMid), hint: '「戴得起重量」＝手腕上得有支夠份量的名錶', clue: 'Kevin「看人先看手腕」，卡西歐電子錶在他眼裡＝沒在練。' },
    chat: {
      start: { text: 'Bro 你那支錶可以喔，識貨。要不要約個私課，我幫你練成型男？',
        opts: [
          { label: '好啊，順便同頻喝一杯', goto: 'wine' },
          { label: '我是要約會不是約練', goto: 'push' },
        ] },
      wine: { text: 'Nice～我喝酒只喝橡木桶那種，便宜的傷身。一起？',
        opts: [
          { label: '開支麥卡倫犒賞鐵粉', gift: { test: (o) => has(o, 'wine-'), need: '好酒' }, goto: 'happy' },
          { label: '便宜的也是酒', goto: 'cheap' },
        ] },
      push: { text: '哈哈急什麼，先看你有沒有料嘛。',
        opts: [{ label: '好，一起喝一杯', goto: 'wine' }] },
      happy: { text: 'Bro 你真的會做人❤️ 以後你的車我幫你顧、你的酒我幫你喝🍻', end: { good: true, line: 'Kevin 成了你的「兄弟」（會固定借你的車去把妹的那種）。' } },
      cheap: { text: '便宜的傷身啦 bro，下次有料再約。', end: { good: false, line: 'Kevin 已退追蹤。' } },
    },
  },
  {
    id: 't-leo', name: 'Leo', age: 33, label: '新創 CEO', region: '信義區', img: '/dating/date-guy-1.jpg',
    type: 'scammer',
    bio: '連續創業家，做過幾個你可能聽過的案子。喜歡有想法、聊得來的人。生活步調快，但對的人我會留時間。☕️ 假日喜歡開車兜風。',
    gate: { test: (o) => ownsAny(o, TIER.carMid), hint: '他生活圈品味不低，欣賞「懂得對自己好」的人——你得開得出像樣的車（賓士以上）', clue: 'Leo 的圈子很講格調，會看你的座駕——你開喜美他大概沒什麼話聊。' },
    chat: {
      start: { text: '兄弟，看你行情不錯。實話跟你說，我這輪內部價，投進來三個月翻倍，名額剩兩個🔥',
        opts: [
          { label: '聽起來不錯，怎麼投？', goto: 'trap' },
          { label: '翻倍？哪有這種事', goto: 'smart' },
          { label: '我比較想認識你這個人', goto: 'dodge' },
        ] },
      trap: { text: '爽快！先匯個 50 萬卡名額，合約我等等補。放心，我朋友上個月才賺一台保時捷🤝',
        opts: [
          { label: '匯 50 萬卡名額', cost: 500000, goto: 'rugged' },
          { label: '先看合約再說', goto: 'vanish' },
        ] },
      smart: { text: '哈哈你太保守了，難怪還在守那個小據點。機會是給敢賭的人的。',
        opts: [
          { label: '那你自己賭吧', end: { good: false, line: '你躲過一劫。Leo 轉頭去找下一個盤子。' } },
          { label: '好啦，我投', goto: 'trap' },
        ] },
      dodge: { text: '認識我？認識我不如認識錢啦😂 投不投？',
        opts: [{ label: '不投，掰', end: { good: false, line: '你封鎖了 Leo。明智。' } }, { label: '好吧我投', goto: 'trap' }] },
      rugged: { text: '收到收到，合約我請助理寄…（從此這個帳號再也沒上線過）', end: { good: false, line: '💸 Leo 帶著你的 50 萬人間蒸發。諷刺的是，你平常「自由樂捐」的收法，跟他沒兩樣。' } },
      vanish: { text: '哎唷信任很重要欸兄弟，這樣我很難做。（已讀）', end: { good: false, line: 'Leo 見你不上鉤，默默消失了。算你走運。' } },
    },
  },
  // ── 名媛／貴婦圈（高名聲解鎖） ──
  {
    id: 't-coco', name: 'Coco 姐', age: 38, label: '離婚貴婦', region: '天母', img: '/dating/date-girl-7.jpg',
    type: 'golddigger', repReq: 35,
    bio: '前夫留了房，我留了品味。姐姐看的是檔次——你住的地方，要嘛在天花板那層，要嘛別約我。👑',
    gate: { test: (o) => ownsAny(o, TIER.mansionTop), hint: '「天花板那層」＝豪宅金字塔頂端（別墅／帝寶級）', clue: 'Coco 姐要「住在天花板那層」的人——一般電梯三房她不會看。' },
    chat: {
      start: { text: '小鮮肉，你那間是自己的還是租的？姐姐被騙過一次，現在只看權狀。',
        opts: [
          { label: '權狀上是我的名字', goto: 'wine' },
          { label: '租的也住得很爽啊', goto: 'cheap' },
        ] },
      wine: { text: '乖。陪姐姐喝一杯有年份的，姐姐就讓你進門。🍷',
        opts: [
          { label: '開支拉菲 82 結個緣', gift: { test: (o) => ownsAny(o, TIER.wineTop), need: '頂級好酒' }, goto: 'happy' },
          { label: '喝高粱也是喝', goto: 'cheap' },
        ] },
      happy: { text: '嗯…你比我前夫上道多了❤️ 以後姐姐罩你。', end: { good: true, line: 'Coco 姐收了你。她罩你，你養她，公平交易。' } },
      cheap: { text: '檔次不夠，下去。', end: { good: false, line: 'Coco 姐已將你逐出名單。' } },
    },
  },
  {
    id: 't-celine', name: 'Céline', age: 29, label: '珠寶世家', region: '仁愛路', img: '/dating/date-girl-6.jpg',
    type: 'golddigger', repReq: 35,
    bio: '家裡做珠寶的，鴿血紅、滿天星我看太多了。要嘛你比我的櫥窗更亮，要嘛我們沒話聊。💎',
    gate: { test: (o) => ownsAny(o, TIER.jewelTop), hint: '「比我的櫥窗更亮」「鴿血紅／滿天星」＝最頂級的珠寶（鑽戒以上）', clue: 'Céline 把鴿血紅、滿天星當日常——你得拿出真正壓得住場的珠寶。' },
    chat: {
      start: { text: '你的東西…還行。至少不是夜市貨。說說，你想從我這裡得到什麼？',
        opts: [
          { label: '想深耕妳這個高端客戶', goto: 'test' },
          { label: '想進妳這個能量產業', goto: 'test' },
        ] },
      test: { text: '世界？這個世界很現實的。你願意為了進來付出什麼？比如…那台限量塗裝🏎️',
        opts: [
          { label: '為妳這客戶，這車算什麼', gift: { test: (o) => ownsAny(o, TIER.carHyper), need: '超跑（法拉利以上）' }, goto: 'happy' },
          { label: '車不能送，但人可以給妳', goto: 'cheap' },
        ] },
      happy: { text: '有意思。我收下了——車，還有你。❤️', end: { good: true, line: 'Céline 接受了你。在她的世界，愛和拍賣會沒什麼不同。' } },
      cheap: { text: '人？人最不值錢了。再聯絡。', end: { good: false, line: 'Céline 已對你失去興趣。' } },
    },
  },
  // ── 政商／權貴圈（最高名聲解鎖） ──
  {
    id: 't-vivian', name: '薇薇安', age: 35, label: '議員特助', region: '中正區', img: '/dating/date-vivian.jpg',
    type: 'scammer', repReq: 60,
    bio: '在政治圈工作，平常很忙、但很享受跟成熟的人聊天。看人很準，喜歡有分寸、做得了事的對象。😊 紅酒、藝文、深夜的對話都喜歡。',
    gate: { test: (o) => ownsAny(o, TIER.watchTop), hint: '她的圈子先敬羅衣後敬人——手上得是拿得出手的頂級名錶（愛彼以上）', clue: '薇薇安見過世面，第一眼會看你的細節——你得戴得起頂級名錶才入得了她的眼。' },
    chat: {
      start: { text: '金乩國際的執行長喔，名氣不小。我這邊有些…可以互相幫忙的空間。你懂的。',
        opts: [
          { label: '怎麼個互相幫忙法', goto: 'trap' },
          { label: '我只想單純交個朋友', goto: 'dodge' },
        ] },
      trap: { text: '簡單。你這種「能量產業」要做大，需要關係。打點關係要錢。先準備個一百萬「公關費」，剩下交給我。',
        opts: [
          { label: '給 100 萬公關費', cost: 1000000, goto: 'rugged' },
          { label: '關係哪有用錢就買的', goto: 'dodge' },
        ] },
      dodge: { text: '單純交朋友？執行長你在這圈子待不久的。沒誠意就別浪費我時間。',
        opts: [
          { label: '那就不浪費了', end: { good: false, line: '你抽身離開。有些局，不進去才是贏。' } },
          { label: '好，我給公關費', goto: 'trap' },
        ] },
      rugged: { text: '錢收到了，事情我在喬…（三天後她換了號碼）', end: { good: false, line: '💸 「公關費」打了水漂。你終於體會到信眾的感受了。' } },
    },
  },
  {
    id: 't-arwen', name: '雅雯', age: 31, label: '財團千金', region: '陽明山', img: '/dating/date-arwen.jpg',
    type: 'sincere', repReq: 60,
    bio: '家裡什麼都有，所以我什麼都不缺——除了一個不為錢靠近我的人。但說真的，能匹配我生活的人，本來就不便宜。',
    gate: { test: (o) => ownsAny(o, TIER.mansionHyper) || ownsAny(o, TIER.carHyper), hint: '「能匹配我生活」＝你的層級得到金字塔最頂（帝寶／杜拜島，或頂級超跑）', clue: '雅雯什麼都不缺——你得是同一個階級的人，她才會把你當「對等」。' },
    chat: {
      start: { text: '你是少數讓我有點好奇的人。多數人靠近我，眼睛裡都是我家的東西。',
        opts: [
          { label: '我也不缺，我只是好奇妳', goto: 'real' },
          { label: '老實說，我也想沾光', goto: 'honest' },
        ] },
      honest: { text: '至少你誠實。比那些演真愛的好。我給你一次機會。',
        opts: [{ label: '謝謝妳的誠實', goto: 'real' }] },
      real: { text: '陪我做點不花錢的事吧——只是…我「不花錢的浪漫」，是包下整層樓的餐廳只為看夜景。你介意嗎？',
        opts: [
          { label: '包下來，今晚只有我們', cost: 200000, goto: 'happy' },
          { label: '其實…我有點介意', goto: 'wait' },
        ] },
      happy: { text: '今晚很完美。我想，我可能真的喜歡上你了。', end: { good: true, line: '財團千金雅雯選擇了你。她是真心的——只是她的真心，凡人負擔不起。' } },
      wait: { text: '介意嗎…也對。我們本來就不是一個世界的。再見。', end: { good: false, line: '雅雯回到了她那個你進不去的世界。' } },
    },
  },
  // ── 清純／幼態系（韓團感、看起來像高中生～大學生） ──
  {
    id: 't-mio', name: '小米歐', age: 19, label: '清純系大一生', region: '師大', img: '/dating/date-mio.jpg',
    type: 'sincere',
    bio: '剛上大學，還在摸索世界～喜歡奶茶、貼紙、跟很溫柔的人。學長你看起來好可靠喔☺️（其實有點想要那種戴起來會發光的小東西）',
    gate: { test: (o) => has(o, 'jewelry-'), hint: '「戴起來會發光的小東西」＝一件像樣的金飾', clue: '她單純歸單純，但也偷偷期待一件閃閃的小禮物。' },
    chat: {
      start: { text: '學長好～你怎麼也在用這個app呀😆 你看起來不像壞人欸',
        opts: [{ label: '我是來找像妳這樣乾淨的人', goto: 'sweet' }, { label: '妳幾歲啊看起來好小', goto: 'sweet' }] },
      sweet: { text: '人家剛滿十九啦～學長會不會覺得我太幼稚😳 不過我喜歡成熟一點的人',
        opts: [{ label: '送妳一個會發光的小禮物', gift: { test: (o) => has(o, 'jewelry-'), need: '金飾' }, goto: 'happy' }, { label: '幼稚才可愛啊', goto: 'wait' }] },
      happy: { text: '哇～我可以收嗎？學長對我最好了，那…我們算在一起了嗎🥺', end: { good: true, line: '小米歐成了你的人。她單純，卻也學會了「對她好＝送東西」。' } },
      wait: { text: '喔…學長是不是只是說說而已😢 我先去上課了啦', end: { good: false, line: '小米歐覺得你不夠認真，跑去找學長了。' } },
    },
  },
  {
    id: 't-yuna', name: 'YUNA', age: 18, label: '練習生・韓團系', region: '東區', img: '/dating/date-yuna.jpg',
    type: 'golddigger',
    bio: '當練習生中～夢想出道🎤 幼態臉是我的武器嘿嘿。喜歡會打扮、會帶我去高級地方拍照的歐爸（包包要好看，會入鏡的那種）',
    gate: { test: (o) => ownsAny(o, TIER.carMid) || has(o, 'jewelry-'), hint: '「會帶我去高級地方」「會入鏡」＝你得有像樣的車或行頭撐場', clue: 'YUNA 要的是「拍出來好看」——你得開得出像樣的車、拿得出行頭。' },
    chat: {
      start: { text: '歐爸好～我是練習生啦，未來的愛豆😎 你顏值有過關喔，加分',
        opts: [{ label: '帶妳去拍很美的照', goto: 'shoot' }, { label: '練習生很辛苦吧', goto: 'shoot' }] },
      shoot: { text: '對啊超操der～不過只要能紅都值得。歐爸你會帶我去那種網美景點對吧😏',
        opts: [{ label: '開我那台帶妳兜風拍照', gift: { test: (o) => ownsAny(o, TIER.carMid), need: '像樣的車' }, goto: 'happy' }, { label: '在路邊拍也很美啊', goto: 'wait' }] },
      happy: { text: '歐爸最懂了！跟你一起拍一定爆讚，我們在一起好不好💕', end: { good: true, line: 'YUNA 成了你的「愛豆女友」——只要你一直拍得出讓她發光的場面。' } },
      wait: { text: '路邊？歐爸你不懂時尚欸…再聊啦掰掰👋', end: { good: false, line: 'YUNA 滑去找下一個歐爸了。' } },
    },
  },
  {
    id: 't-shian', name: '林思涵', age: 17, label: '高三生・鄰家妹', region: '永和', img: '/dating/date-shian.jpg',
    type: 'sincere',
    bio: '高三快考試了，壓力好大🥺 都靠追星跟手搖撐著。喜歡會聽我說話、偶爾請我喝飲料的哥哥（最近好想要一杯要排隊的那種…）',
    gate: { test: () => true, hint: '她要的很簡單——願意聽她說話、請她喝飲料', clue: '（她門檻很低，要的是陪伴和一點點心意。）' },
    chat: {
      start: { text: '哥哥…我最近壓力好大喔😢 你會聽我抱怨嗎',
        opts: [{ label: '會啊，慢慢說我都聽', goto: 'warm' }, { label: '考試而已別緊張', goto: 'warm' }] },
      warm: { text: '嗚有人聽我說話好幸福…哥哥可以請我喝那杯要排隊的嗎🥺',
        opts: [{ label: '請妳喝，再陪妳聊', cost: 12000, goto: 'happy' }, { label: '飲料喝多對身體不好', goto: 'wait' }] },
      happy: { text: '哥哥你最好了❤️ 考完試…我可以當你女朋友嗎', end: { good: true, line: '林思涵把你當成最溫暖的依靠。純純的，但她的依賴也悄悄標了價。' } },
      wait: { text: '喔…好吧，那我自己喝白開水好了😞', end: { good: false, line: '林思涵覺得你不夠疼她，默默退出了聊天。' } },
    },
  },
];

/* ══════ 黏人逆襲・隱藏路線台詞 ══════
 *  當 wooedBy 成立，對方語氣 180 度轉變：超主動、瘋狂敲、傳誘惑圖、你不回也黏。
 *  諷刺「有錢就被舔」。分批送（spam），中間夾自拍泡泡。 */
export const CLINGER_LINES = {
  // 一回來／一上鉤的開場（擇一）
  comeback: [
    '欸欸欸我剛剛是不是說錯話了？我們重新開始好不好🥺',
    '我朋友說你那台車…是真的喔？？我當初太不識貨了啦😭',
    '誒我想了一整晚…其實我覺得你人超好的耶❤️',
    '哈囉～在嗎在嗎？我刪掉剛剛那些話了，別生氣嘛🥺',
  ],
  // 連珠炮黏人訊息（隨機抽幾句連發）
  spam: [
    '你在幹嘛？想我了沒😚',
    '已讀不回喔？人家會難過耶💔',
    '今天穿這樣，給你看一下☺️',
    '欸不要不理我啦～我超乖的你知道嗎',
    '我跟我姐妹炫耀你了，她們都羨慕死🥰',
    '你那支錶我研究了一下…天啊你也太低調💍',
    '晚上有空嗎？我什麼都配合你喔😳',
    '我把你設成最愛了，你呢你呢？',
    '不回我我就一直傳喔（傳到你回為止）',
    '欸…那個…可以先借我一點點嗎？我下次加倍對你好🥺',
    '其實我之前是怕受傷才裝高冷的啦…現在不裝了❤️',
    '你都不知道你在我心裡有多重要（跟你的收藏一樣重要）',
  ],
  // 你選擇「已讀不回」後對方的反應（更黏）
  ignored: [
    '哼～越不理我我越喜歡你怎麼辦😤❤️',
    '好嘛好嘛我等你，我超有耐心的（盯）',
    '欸我又拍了一張…你看嘛你看嘛📷',
  ],
  // 你選擇「回應一下」的軟性收尾
  reply: '看到你回我，我整個開心到飛起來🥹 我們是不是…可以認真試試看？',
};

/* 圈子標籤 → 視覺色（純樣式） */
export const CIRCLE_COLORS = {
  夜店常客: '#e84393', 微網紅: '#fd79a8', '當紅 Coser': '#a29bfe',
  長榮空姐: '#74b9ff', 日系藥師: '#55efc4', 健身教練: '#fab1a0',
  '新創 CEO': '#ffeaa7', 離婚貴婦: '#ff7675', 珠寶世家: '#fdcb6e',
  議員特助: '#b2bec3', 財團千金: '#f6c177',
};
const TYPE_LABEL = { sincere: '認真交往', golddigger: '需要被供養', scammer: '⚠ 行跡可疑' };
export const typeLabel = (t) => TYPE_LABEL[t] || '';

/* 把關係養成對話資料掛到對應的 TARGET（依 id 對應） */
for (const t of TARGETS) { if (CONVOS[t.id]) t.convo = CONVOS[t.id]; }

/* 右滑時的配對判定 */
export function tryMatch(target, owned) {
  return !!target.gate.test(owned);
}

/* ════════════════ 乩der 結局（每位對象多種，依類型量身、不落俗套） ════════════════
 * 每位對象的故事線（全部對話單元）走完、或中途好感歸零/告白成功，即觸發「結局」並定格。
 * 結局種類（依角色 type）：
 *   golddigger 拜金 → won（收服→貴婦/少奶奶，好）／ poor（嫌窮跑去更有錢的，壞）
 *   scammer   詐騙 → save（你錢多到識破還反過來「養」他/拉他上岸，好・不落俗套）
 *                    team（兩個檯面下的人乾脆聯手，好・灰）／ bitten（反咬你一筆、消失，壞）
 *   sincere   真心 → love（修成正果，好）／ missed（你太現實/太忙，錯過，壞）
 * 觸發時用 endingFor(target, { aff, matched }) 取得對應結局物件。
 * 結局物件：{ id, emoji, label, desc, good }（good=true 好 / false 壞 / null 中性灰）。
 */
export const DATING_ENDINGS = {
  't-yuki': {
    won: { id: 'won', emoji: '👑', label: '正宮上位', desc: 'Yuki 把交友軟體刪光，只坐你的車。信義區那群人現在都喊她大嫂——她從不問那台車的油錢哪裡來。', good: true },
    poor: { id: 'poor', emoji: '🏎️💨', label: '換檔走人', desc: '你終究沒能讓引擎蓋上長出那匹躍馬。某天她已讀不回，限動裡換了一台更亮的車、一個更會買單的人。', good: false },
  },
  't-anny': {
    love: { id: 'love', emoji: '💍', label: '入鏡成真', desc: '安妮發了脫單文，標題「終於等到懂我的人」。手腕上那點重量是你給的，她說那比任何業配都誠實。', good: true },
    missed: { id: 'missed', emoji: '📷💔', label: '已讀的限動', desc: '你忙著巡你的「據點」，回得越來越慢。她最後一張限動是空蕩的手腕，配文：有些重量，等不到的人給不起。', good: false },
  },
  't-rin': {
    love: { id: 'love', emoji: '🍷', label: '醒好的那瓶', desc: '凜把私訊全清了只留你。每場 cos 收工，你們開一瓶要醒很久的紅——她說遇到你之後，連酒都升級了。', good: true },
    missed: { id: 'missed', emoji: '🍷💔', label: '杯裡的超商紅酒', desc: '你嫌她燒錢，約會越來越敷衍。她默默把你封存，舉杯那張照片裡，杯中又換回了超商紅酒。', good: false },
  },
  't-tina': {
    won: { id: 'won', emoji: '🏙️', label: '河岸頂樓少奶奶', desc: 'Tina 落地不再回租屋處，而是回你那間十八樓以上、看得到河的家。她飛遍世界，只為回到有 view 的你身邊。', good: true },
    poor: { id: 'poor', emoji: '✈️💨', label: '永遠的轉機', desc: '你那間看不到河的套房讓她幽閉恐懼。她轉頭飛走，下一段航程坐在頭等艙旁的，是個有整片落地窗的男人。', good: false },
  },
  't-hana': {
    love: { id: 'love', emoji: '🍽️', label: '好好的一頓飯', desc: 'Hana 慢熟，但你願意陪她好好吃每一頓飯。她要的從來不是行頭，是一個肯坐下來聽她說話的人——她找到了。', good: true },
    missed: { id: 'missed', emoji: '🍽️💔', label: '涼掉的那桌', desc: '她不要名牌，只要一頓有你的飯。但你總在忙，飯涼了一次又一次。她沒鬧，只是有天輕輕說：我們不適合。', good: false },
  },
  't-kevin': {
    won: { id: 'won', emoji: '💪', label: '雙人組合', desc: 'Kevin 看人先看手腕，你的份量過了關。現在你們是健身房最閃的雙人組，他逢人就秀：我男人扛得起重量。', good: true },
    poor: { id: 'poor', emoji: '⌚💨', label: '沒在練的', desc: '你手腕上那點重量入不了他的眼。他說「你沒在練」，轉身去找下一個戴得起、也扛得起的——你連雙人都沒排上。', good: false },
  },
  't-leo': {
    save: { id: 'save', emoji: '🛟', label: '把他撈上岸', desc: '你早看穿 Leo 那套募資話術——畢竟你也在演。但你錢多到不在乎，反手替他把窟窿補了，把這個浮誇的男人撈上岸。他第一次對人說了實話：謝謝。', good: true },
    team: { id: 'team', emoji: '🤝', label: '兩個演員', desc: '兩個檯面下的人，與其互相試探，不如坐下來分工。他募他的輪，你顧你的「據點」，誰也不戳破誰。某種程度上，你們是天造地設。', good: null },
    bitten: { id: 'bitten', emoji: '🚀💸', label: '被反將一軍', desc: '你以為你在看戲，其實他也在看你。等你回神，那筆「穩賺的案子」連同他的人一起蒸發。薑，到底是老的辣。', good: false },
  },
  't-coco': {
    won: { id: 'won', emoji: '👑', label: '天花板那層', desc: 'Coco 姐看的是檔次，而你住在天花板那層。她帶著前夫留下的品味，住進你留得住她的豪宅，當起名正言順的姐。', good: true },
    poor: { id: 'poor', emoji: '🥂💨', label: '檔次不夠', desc: '你的地址沒到她要的那一層。姐姐一句「我們檔次不同」，優雅地舉杯轉身——她的時間，只留給住在頂端的人。', good: false },
  },
  't-celine': {
    won: { id: 'won', emoji: '💎', label: '比櫥窗更亮', desc: '鴿血紅、滿天星她都看膩了，唯獨你拿出的那件，亮得她願意收進心裡。珠寶世家的千金，終於遇到比自己櫥窗更亮的人。', good: true },
    poor: { id: 'poor', emoji: '💎💨', label: '黯淡出局', desc: '你終究沒比她的櫥窗更亮。她冷冷收回目光：「我們沒話聊。」轉身回到那片你照不亮的光裡。', good: false },
  },
  't-vivian': {
    team: { id: 'team', emoji: '🤝', label: '政商聯姻', desc: '薇薇安認識你想不到的人，你有她碰不到的「現金流」。你們不談感情，談合作——一場各取所需、誰也離不開誰的政商聯姻。', good: null },
    love: { id: 'love', emoji: '🥂', label: '見得了光', desc: '在那個先敬羅衣的圈子，你的誠意她看見了。世故如她，竟也願意為你卸下算計，把你正式介紹進她的局。', good: true },
    bitten: { id: 'bitten', emoji: '🤝💸', label: '被處理掉的人', desc: '你以為你在拓人脈，其實你是被「處理」的那一個。百萬公關費打了水漂，她連名字都不會再提起你。', good: false },
  },
  't-arwen': {
    love: { id: 'love', emoji: '🤍', label: '對等的人', desc: '雅雯什麼都不缺，只缺一個不為錢靠近她的人。諷刺的是，你得先站上同一個階級，她才看得見你的真心——而你做到了。', good: true },
    missed: { id: 'missed', emoji: '🤍💔', label: '不對等的善意', desc: '你的層級沒能匹配她的生活。她沒有嫌棄，只是淡淡地說：「謝謝你的好，但我們不是同一個世界的人。」', good: false },
  },
  't-mio': {
    love: { id: 'love', emoji: '🧸', label: '學長的小太陽', desc: '小米歐還在摸索世界，而你成了她最依賴的學長。一件會發光的小禮物、一句溫柔的話，她就把整顆心都交給你了。', good: true },
    missed: { id: 'missed', emoji: '🧋💔', label: '長大的一課', desc: '她單純地喜歡你，你卻沒接住。這段沒結果的喜歡，成了她長大路上，學會「看人」的第一課。', good: false },
  },
  't-yuna': {
    won: { id: 'won', emoji: '🎤', label: '出道前的歐爸', desc: 'YUNA 的幼態臉是武器，你的行頭是舞台。你帶她去每個會入鏡的地方，她出道前最閃的應援，就是你。', good: true },
    poor: { id: 'poor', emoji: '🎤💨', label: '換個歐爸', desc: '你撐不起她要的鏡頭。練習生的時間很貴，她笑著道別，轉身找下一個開得出好車、拍得出好照的歐爸。', good: false },
  },
  't-shian': {
    love: { id: 'love', emoji: '🧋', label: '陪她到放榜', desc: '林思涵的世界很小，小到一杯要排隊的飲料、一個願意聽她說話的哥哥就滿了。你陪她撐過高三——她要的從來不貴。', good: true },
    missed: { id: 'missed', emoji: '🧋💔', label: '沒人接的訊息', desc: '她壓力大的時候只想找你說說話，你卻總是已讀。後來她不再傳了——有些陪伴，錯過了就只剩追星和手搖。', good: false },
  },
};

/* 依角色與當下狀態決定觸發哪個結局。
 * ctx = { aff（好感）, matched（是否擁有對方要的行頭 gate.test）, confessed（是否走告白成功） }
 * 規則：
 *   - 好結局門檻：好感夠高(>=好結局線) 且 拜金/詐騙類通常還要 matched（拿得出行頭）。
 *   - scammer：好感高+你很罩(matched) → save（把他撈上岸）；好感中等 → team（聯手）；否則 bitten（被反咬）。
 *   - 其餘：好感達標+(拜金需 matched) → won/love；否則 poor/missed。
 */
export function endingFor(target, ctx = {}) {
  const E = DATING_ENDINGS[target.id]; if (!E) return null;
  const aff = ctx.aff ?? 0;
  const matched = ctx.matched ?? false;
  const confessed = ctx.confessed ?? false; // 故事聊到位/告白成功 → 走好結局分支
  const hi = aff >= 70;                      // 好感達「好結局」線
  if (target.type === 'scammer') {
    if (confessed || (hi && matched)) return E.save || E.love || E.team; // 你夠罩 → 救他上岸
    if (aff >= 40) return E.team;                                        // 半吊子 → 聯手/灰
    return E.bitten;                                                     // 沒搞定 → 被反咬
  }
  if (target.type === 'golddigger') {
    // 拜金型：要好感也要行頭；沒行頭(沒 matched)即使聊到位也是嫌窮跑掉
    return ((confessed || hi) && matched) ? E.won : E.poor;
  }
  // sincere：好感為主，行頭加分但非必要。confessed(故事聊到位)直接好結局
  return (confessed || aff >= 60 || (hi && matched)) ? E.love : E.missed;
}
