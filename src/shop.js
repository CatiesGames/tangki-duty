/**
 * 香火購物中心 — 乩皮商城（仿購物 App）的奢侈品賣場。
 *
 * 諷刺核心：信眾捐的香火錢，全進了乩身的私人慾望。
 * 純收藏 / 炫耀，沒有任何遊戲數值加成。買東西本身就是爽點。
 *
 * 刻意做成「明亮的真實電商 App」——和遊戲本體的陰暗廟宇風形成對比，那個落差就是笑點。
 */

import { R, RI } from './content.js';
import { asset } from './asset.js';
import {
  bump, getSave, ownItem, owns, persist, spendCash,
} from './store.js';
import { reviewsFor } from './reviews.js';

/* ════════════════ 分類 meta ════════════════ */
export const CATEGORIES = [
  { id: 'car', label: '豪車', emoji: '🚗' },
  { id: 'watch', label: '名錶', emoji: '⌚' },
  { id: 'wine', label: '好酒', emoji: '🍷' },
  { id: 'jewelry', label: '金飾', emoji: '💍' },
  { id: 'mansion', label: '豪宅', emoji: '🏠' },
];

const CAT_EMOJI = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.emoji]));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

/* 「這筆錢本可幫助 N 位信眾」— 每位信眾抓 3 萬 */
const HELP_UNIT = 30000;
const helpFor = (price) => Math.max(1, Math.round(price / HELP_UNIT));

/* 圖檔前綴：jewelry 類的圖檔實際命名為 jewel-*（與已生成的圖一致） */
const IMG_PREFIX = { jewelry: 'jewel' };

/* 工廠：補上 img / ironicHelp，省得每筆手寫。
   blurb = 卡片副標（短）；desc = 商品詳細頁的長文（反諷式精品文案，句句不提、句句不離）。 */
const P = (cat, id, name, price, blurb, desc) => ({
  id: `${cat}-${id}`,
  cat,
  name,
  price,
  img: `/shop/${IMG_PREFIX[cat] || cat}-${id}.jpg`,
  blurb,
  desc,
  ironicHelp: helpFor(price),
});

/* ════════════════ 商品（每類 6–7 件，由便宜到喪心病狂） ════════════════ */
export const PRODUCTS = [
  /* ── 🚗 豪車 ── */
  P('car', 'civic', '中古喜美 92 年式（代步用）', 80000, '【出清】師父代步首選！冷氣會冷、引擎還會動，香火剛起步就靠它。誠可議，車況請自行斟酌。',
    '起步嘛，先求有。冷氣會冷、引擎肯動，里程表停在一個吉利的數字，這就夠了。跑廟、收驚到府、半夜趕去替人「壓驚」，有台車就是不一樣——信眾看到師父專程開車來，眼眶都熱了，覺得自己被神明放在心上。\n\n等香火再旺一點就換新的。而香火旺不旺，看的是信眾多虔誠、多捨得——這你最懂。'),
  P('car', 'altis', '一手 Altis 神車（牌好顧）', 650000, '國民神車，保值耐操，跑廟拜廟首選。內含香灰味，已附廟方平安符吊飾一只。',
    '國民神車的封號不是叫假的：耐操、保值、零件好叫，跑廟跑紅白帖都體面。後照鏡掛滿信眾親手請的平安符，一條一條，全是「闔家點燈」群組裡的阿嬤們的心意——人多，神明比較聽得見，所以她們總是揪一整團。\n\n載著阿嬤們去進香、去吃辦桌，她們一路笑得合不攏嘴：「有師父這台車，我們才出得了門啦。」你看，這哪是私家車，這分明是替神明在跑腿。'),
  P('car', 'benz-c', '賓士 C-Class 入門尊爵', 2200000, '三芒星一掛，信眾自動加倍尊敬。停在廟口氣場直接 +∞，香油錢回收超快。',
    '三芒星往廟口一停，信眾的腰自動彎了三十度。這是尊爵的入門款，卻是說服力的頂規款——車漆反光打在阿姨臉上，她心裡那句話會自己冒出來：「這間廟一定很靈，師父都開賓士了。」\n\n做生意的、跑工程的，最信這套。一個連自己財位都顧得這麼好的師父，幫你「補運開財路」，你能不信嗎？排場，從來不是虛榮，是替神明做面子——神威要有架勢，信眾才補得安心。'),
  P('car', 'bmw-m', 'BMW M5 性能跑房', 5800000, '退駕後尬車最爽，引擎聲比鑼鼓還響。師父說：神明也想坐快一點。',
    '外表是顧家的四門房車，骨子裡是台會咬人的猛獸。零百加速三點四秒，引擎聲一吼，比廟會鑼鼓還震撼。低調的奢華——上得了繞境的場面，也壓得住兄弟鬩牆的家務事。\n\n說到家務事，師父最擅長。一塊祖墳、一脈龍脈，做哥哥的來問、做弟弟的也來問，你兩邊都耐心開導、兩邊都收個誠心。清官難斷的局，神明來斷最公道。等他們把該化解的都化解完，這台車的尾款，也就剛好結清了。\n\n速度快，是為了趕場救苦——慈悲，有時候是要踩油門的。'),
  P('car', 'porsche', '保時捷 911 Turbo S', 12000000, '紅色，配廟會超搭。一腳油門信眾全跪了，這不是車，這是神蹟。',
    '純正廟會紅，車身線條像彎刀，一腳油門催下去，路邊的信眾分不清是引擎在吼，還是神明在顯靈。\n\n你知道最妙的是哪裡嗎？這台的車牌尾數，正是當年你開壇報的那組數字。報明牌這門功夫，講究的就是一個「信」字——信的人多了，押的人多了，數字就活了過來。中的逢人就說神明保佑，沒中的回家檢討自己心不夠誠，無論如何，神明永遠是對的。\n\n而現在，那組數字以一台千萬跑車的形狀，停在你的廟口。明牌靈不靈？你開的車，就是答案。'),
  P('car', 'ferrari', '法拉利 SF90 限量塗裝', 35000000, '躍馬廠徽自帶聖光，停到哪裡哪裡就是乩天宮分壇。香火三年份一次付清。',
    '限量塗裝全球編號獨一無二，躍馬廠徽自帶聖光，比金身還閃。靜止時優雅如神尊端坐，暴衝時凶悍如天兵下凡。停到哪，哪就是你的行動道場。\n\n一次付清，靠的是那本厚厚的「百日添香求子功德簿」。求子這帖，最是綿長——從祖先牌位拜到斗姆元君，一關一關，盼望一頁一頁地添。有位太太足足誠心了三年，把嫁妝私房都化進了香火裡。\n\n你常說：盼望是有價的。能讓人在最徬徨的日子裡相信「還有希望」，這份服務，難道不值一匹躍起的馬？'),
  P('car', 'bugatti', 'Bugatti Chiron 頂級訂製', 280000000, '【鎮店之寶】全球限量，馬力破千。開出去那刻，你已不是乩身，你是神話本人。',
    '【鎮店之寶】W16 引擎、馬力破千、極速突破四百，全球限量手工訂製。方向盤縫線、椅墊壓紋皆可指定，連螺絲都帶著工匠的體溫。這已經不是交通工具，這是流動的、會呼吸的神蹟。\n\n這台不是哪一位信眾請的，是「一整間廟」請的——當年那場「重建祖廟、黃金打造金身」的全國募款，南北各庄頭跑透透，三千戶人家有錢出錢、有命湊命。廟，蓋起來了；金身，立起來了；至於工程的「結餘」，總要做最有效率的運用。\n\n三千戶人家的虔誠，凝成方向盤上那一道完美的縫線。開出去的那一刻，你已經不只是乩身了——你是神話本人。而神話，本來就不該坐公車。'),

  /* ── ⌚ 名錶 ── */
  P('watch', 'casio', '卡西歐電子錶（防水）', 1500, '【超值】嚼檳榔顧時間就靠它，按燈會亮、計時超準，廟務排班絕配。學生最愛。',
    '【超值】防水五十米、計時碼錶、按燈會亮，廟務排班、顧香爐、看吉時，一支搞定。便宜又耐摔，嚼著檳榔甩著手都不怕。\n\n碼錶這功能，比你想的還好用。起乩這門藝術，講究的是火候——渾身發抖、口吐神諭，戲要做足、氣要醞夠。手腕上偷瞄一眼秒針，就知道該收還是該續：四十分鐘的乩，和四分鐘的乩，信眾包的紅包，是兩個數字。\n\n時間就是金錢。這支錶，幫你把這句話貫徹得徹底了一點。'),
  P('watch', 'seiko', 'SEIKO 機械錶 入門款', 12000, '齒輪轉動如香煙裊裊，戴上去瞬間有師父的份量。CP 值天花板。',
    '機械自動上鍊，齒輪轉得像香煙裊裊，不用換電池，戴著你的脈搏走一輩子。入門價位卻有大師氣度，戴上它，握住信眾的手，都多了三分篤定的份量。\n\n而份量，從來不是天生的，是「信」出來的。當一個女人的丈夫變了心、生意垮了，整個人快撐不住，她最需要的不是真相，是一件「可以忙的事」——一場補運法會、一個寫著「全家平安」的紅包袋，讓她有地方安放那些睡不著的夜。\n\n她信你有份量，你便真的有了份量。互相成全，這就是緣分。'),
  P('watch', 'tudor', '帝舵 黑灣潛水錶', 120000, '潛水 200 米，但你只會戴去吃流水席。光芒外露，氣場拉滿。',
    '專業潛水兩百米，紅色錶圈復古又張揚，戴去流水席手腕一抬，全桌阿姨眼睛都亮了。防水防震耐操，下潛兩百米沒問題——當然，師父最擅長潛的，向來是人心。\n\n這支錶背後，是一門最穩的生意：恐懼。年初一張公告貼出去——「本命年不安太歲，恐有血光、破財、口舌之災」——整村的人排隊轉帳，連半信半疑的王大哥都被太太硬拉了來。\n\n妙就妙在，安了太歲卻出事，是「幸好有安，不然更慘」；沒安而出事，是「早就跟你說了」。神明從來不會錯，錯的永遠是凡人。這支錶，就當是替村子擋災的辛苦費。'),
  P('watch', 'rolex', '勞力士 綠水鬼（現貨）', 380000, '【秒殺】水鬼一出，誰與爭鋒！信眾一看手腕就知道這間廟很靈。保證原廠。',
    '人在江湖，靠的是行頭。手腕這一抹綠，比你講一百句神諭都有說服力——信眾看的從來不是你多靈，是你過得多好。能讓師父過這麼好的神，能不靈嗎？\n\n所以這支錶最神的地方，是它會自己賺回本：戴上它，徬徨的人一眼就知道你「有保庇」。當醫院都搖頭、家屬在加護病房外走投無路時，他們要的不是一台儀器，是一句「師父說會好」。藥師燈、消災經、補運、改名……一條龍的盼望，明碼實價，童叟無欺。\n\n畢竟「消災」消的是業障、不是病——這是他們的功課。而你戴著這一圈綠，繼續替更多走投無路的人，點亮下一盞燈。'),
  P('watch', 'ap', '愛彼 皇家橡樹 鋼款', 2800000, '八角錶圈如八卦鎮宅，腕上一轉乾坤定。談香油錢時順手露一下，效果拔群。',
    '八角錶圈、六顆螺絲，設計天生帶著八卦鎮宅的氣勢，腕上一轉，乾坤定。鋼款比黃金更難求，識貨的人一眼就懂你的段位——談香油錢時袖口輕輕一抬，對方報的數字會自動多一個零。\n\n這道完美的拉絲紋路，是九十三戶人家「祈求闔家平安」的心意熔在一起的光澤。最虔誠的那位是賣菜的阿好，每天收攤後繞路來添香，捐的都是皺巴巴的零錢，一塊五塊地堆。她說，只要全家平安，自己吃苦無所謂。\n\n錢進了功德箱，就是神明的錢；神明的錢供養乩身，乩身才能繼續替眾生服務——這條金流，神聖不可質疑。手腕翻一下多一個零，那不叫貪，那叫神威的市場定價。'),
  P('watch', 'pp', '百達翡麗 鸚鵡螺', 9500000, '你不是真正擁有它，只是為下一代乩身保管。傳家等級，香火世襲。',
    '錶界傳奇。經典橫紋錶盤、舷窗式錶殼，一錶傳三代，人在錶在。百達翡麗的名言是「你不是真正擁有它，只是為下一代保管」——對師父而言再貼切不過，因為你的廟、你的衣缽、你的金庫，本來就準備要香火世襲了。\n\n而衣缽要傳，得先有人接。阿義從小被你收為桌頭，抬轎、寫疏文、在旁邊靜靜看著信眾的神情，再回報給你。他以為自己在學道，其實學的是這門最深的學問：怎麼讀人心、怎麼開價碼。\n\n每個行業都有 know-how——廚師傳刀工、醫師傳醫術，你傳的是「人心」。如今他長大了，你把這套手藝連同這支錶一起交給他。將來他能養活一整間廟、撫慰更多徬徨的人，這支傳家錶，就是這份神聖事業的信物。'),
  P('watch', 'rm', 'Richard Mille RM 鏤空陀飛輪', 88000000, '【天花板】輕到像沒戴，貴到像在搶。戴上它，連神明都要預約見你。',
    '【天花板】鈦合金骨架、鏤空機芯、懸浮陀飛輪，輕到像沒戴，貴到像在搶。賽車工藝打造的腕上引擎，全球富豪排隊也買不到。戴上它，連神明都得跟你預約掛號。\n\n這支錶最高的境界，在它的「鏤空」——透過錶背，你看得見陀飛輪精密旋轉。它出自你經營多年的會員制 VIP 道場：年費、晉階費、閉關費、開運水晶、能量符，一層一層往上修，越高階的弟子，越是了無牽掛。\n\n最高階那位，是位失婚的女企業家。她把公司賣了，換來「離苦得樂」的承諾和一張你親簽的開光證書，如今在道場掃地、無欲無求——這不正是修行的最高境界嗎？你幫她放下了塵世的重擔，她該謝你才對。鏤空的錶面提醒著你：萬般帶不走。你看，連戴錶都在參悟人生，多麼超脫。'),

  /* ── 🍷 好酒 ── */
  P('wine', 'kaoliang', '超商高粱 58 度（小瓶）', 300, '【廟口必備】退駕後一口暖到心。配滷味、配花生、配人生。買十送一個宿醉。',
    '【廟口必備】五十八度純釀，退駕後灌一口，暖的是胃，靜的是夜。配滷味、配花生、配那些睡不著的時候。小瓶裝好攜帶，隨時隨地，敬一個人。\n\n這瓶，敬阿土伯。無兒無女的他，每天傍晚拄著拐杖來廟裡，把口袋裡僅有的銅板投進功德箱，再坐在門檻上跟你聊兩句。上禮拜起，他沒再來了。鄰居說他走得很安詳。\n\n他來廟裡有人陪、有話聊，最後走得安穩——這份善終，你也算盡了一份心。人總要走的，錢留給神明、留給廟，總比帶進棺材好。今晚這口酒替他喝了，就當替他圓滿。你看，連喝酒，都在替信眾積德。'),
  P('wine', 'whisky-mid', '單一麥芽威士忌 12 年', 3200, '泥煤香like香爐，入喉順得像神諭。獨飲、待客、答謝信眾兩相宜。',
    '單一麥芽，陳釀十二年，泥煤香裊裊如廟裡的香爐灰，入喉順得像一句剛好說中心坎的神諭。獨飲沉澱、待客體面、答謝大樁信眾兩相宜——十二年的歲月，剛好對上你修行到爐火純青的年資。\n\n這瓶的滋味，藏著一個美麗的誤會。小芸剛出社會，第一份薪水還沒捂熱，就被媽媽帶來廟裡，說她「印堂發黑、犯小人」。安太歲、點文昌燈、求事業符、改運手鍊——一整套，她省了三個月便當錢請了回去。後來她升遷了（其實是自己加班加到爆肝），她媽卻逢人就說「都是師父保佑」。\n\n你給的是信心。有了信心，人才敢拚、敢爭取，這份催化劑值三千二。答謝大信眾時，你會大方倒一杯讓他們「聞香」——只給聞、不給喝，這叫禮數，也叫分寸。'),
  P('wine', 'champagne', '香檳王 Dom Pérignon', 28000, '開瓶聲比鞭炮還喜氣，氣泡升天如香火。慶祝本月業績達標專用。',
    '香檳王中的傳奇。開瓶「啵」一聲比鞭炮還喜氣，金黃氣泡裊裊升天，像極了廟裡的香火，也像極了一張張往上飄的願望。本月香油錢業績達標慶功，捨它其誰。\n\n要說業績，那場「祈福音樂法會」是經典之作：廟會包裝成售票活動，VIP 區能「近距離接受師父加持」，普通票只能站後排。年輕情侶阿凱和小婷搶了 VIP 票，砸了大半個月薪水，就為了求一個「姻緣穩固」，法會上你替他們綁紅線、蓋手印。\n\n半年後他們分手了——但那又如何呢？你負責的是祝福，祝福沒有售後保固。他們花錢買了一段浪漫的回憶，至少還有「曾經被師父加持過」的故事可以講。能讓這麼多人願意相信，是你的本事。氣泡破了就沒了，跟很多事一樣。乾杯，敬票房破紀錄。'),
  P('wine', 'macallan', '麥卡倫 30 年雪莉桶', 280000, '一杯下肚，元神自動穩定（誤）。琥珀色澤宛如金身，藏家最愛。',
    '雪莉桶陳釀三十年，深琥珀色澤宛如廟裡的金身，乾果與蜂蜜在口中綻放。一杯下肚，元神自動穩定，穩到你連自己都信了。藏家最愛，師父書房的鎮房之寶。\n\n這瓶，是富商郭董一個人請的。他賭性堅強，把上市公司的股票都壓在你報的「神明欽點飆股」上。那檔股票有沒有問題你心裡有數，但他每來問一次、就添一筆謝神金，於是你每次都慈祥地點頭。\n\n投資有賺有賠，這是基本常識，一個生意人豈會不懂？你從頭到尾只說「神明欽點」，可沒說「保證獲利」。後來他打來問「師父，神明到底在不在」，你沒接——那通未接來電旁邊，靜靜躺著這瓶用謝神金換來的三十年。醇厚裡帶一絲說不上來的層次，反而更耐品。乾杯，敬那些教會你「人心比鬼神更貪」的信眾。'),
  P('wine', 'lafite-82', '1982 拉菲（Lafite Rothschild）', 1500000, '【傳奇】電影都在喊的那瓶。喝的不是酒，是信眾兩百人的午餐錢。',
    '【傳奇】電影裡黑道大哥都在喊的那瓶，世紀年份、酒評滿分、一瓶難求。單寧細緻、餘韻綿長，開瓶得醒上一小時才捨得入口。現在，你拿它配廟口黑白切——這就是傳奇的奢侈，糟蹋得理直氣壯。\n\n一九八二年這瓶酒入桶那年，如今添香火給你的阿公阿嬤，都還是年輕力壯的庄腳人。四十年來，他們省下早餐、走路省油錢、把退休金一筆筆投進功德箱，只求子孫平安、晚年順遂。四十年的儉省，釀成這一口醇厚。\n\n他們捐得心甘情願，你替他們把錢「升級」成了傳奇，這叫資產活化。阿公阿嬤一輩子沒享受過頂級的東西，現在由你代他們嚐，也算圓了個夢——畢竟，他們也喝不慣這個。入喉時你會默念一聲「謝謝」，這份感恩，很真誠的。'),
  P('wine', 'macallan-fine', '麥卡倫 Fine & Rare 1926', 8800000, '全世界最貴威士忌之一。喝一口少一口，少一口香火帳少一筆。',
    '全世界最貴的威士忌之一，傳奇酒廠的傳奇年份，存世寥寥可數。手繪標籤、桶陳一甲子的風味，喝一口少一口——喝的是時間，更是一句「我喝得起」的底氣。\n\n這瓶背後，是你最得意的發明：「補財庫」。人之所以存不到錢，是因為天庫漏財，得補上才留得住。妙的是，越缺錢的人補得越勤——生意慘澹的小吃攤老闆、被裁員的中年人、欠卡債的學生，他們比誰都需要那個「會變有錢」的盼望。\n\n財庫看不見、摸不著，你補了、他們信了，交易就完成了。錢留不住是他們花太兇、賺太少，與補的庫無關。你只是把這些零散的盼望集中起來，釀成一瓶千金不換的傳奇——這何嘗不是一種點石成金？只是金，最後到了你這裡。'),
  P('wine', 'romanee', '羅曼尼康帝（DRC）整箱', 68000000, '【神級】葡萄酒界的活神明。整箱收藏，這輩子捨不得開——跟功德一樣。',
    '【神級】葡萄酒界公認的活神明，產量稀少到要抽籤、要配貨、要有頭有臉才買得到。一整箱收藏，比你壇上那尊還有口碑。這輩子你大概捨不得開——有些東西，供著比喝掉值錢。\n\n這箱酒真正的「年份」，是一場喪事。村裡德高望重的阿嬤過世，家屬請你來牽亡魂、做頭七到七七。你開出一張長到嚇人的法事清單，從腳尾飯排到對年合爐，一場一場圓滿。為了「讓媽媽一路好走」，子孫砸下整箱酒的價錢，連房子都抵押了。\n\n生離死別最是煎熬，你給了他們「該做的都做了、媽媽會安息」的慰藉——這份心安，多少錢買得到？你不開這箱酒，因為它代表圓滿；開了就沒了，就像信仰一樣，要供著、不能拆穿，才能永遠值錢。'),

  /* ── 💍 金飾 ── */
  P('jewelry', 'gold-chain', '黃金項鍊 一兩（足金）', 22000, '【保值】師父標配粗金鏈，反光係數廟務認證合格。越粗越靈，信眾說的。',
    '【保值】足金一兩，師父出道標配，越粗越有份量、越有份量信眾越信。金價只漲不跌，戴脖子上是行頭、進當鋪是現金。陽光下反光剛好閃到信眾掏錢的那隻手，恰到好處。\n\n這條鏈子的金光，來自廟裡那整面光明燈牆。一盞一年三千六，越靠近神尊越貴，因為「燈越亮、前程越光明」。報名最積極的是陪考的家長，他們把孩子的名字、准考證號用紅紙工整寫好貼上去，深信這樣就能金榜題名。\n\n放榜那天，考上的會來謝你，沒考上的會檢討自己「是不是不夠誠」——兩種結果你都立於不敗之地。光明燈點的是希望，一盞三千六不算貴。你戴粗金鏈，是讓人看得見神威——總不能要一個窮酸的乩身替你跟天溝通吧？'),
  P('jewelry', 'gold-buddha', '黃金彌勒墜（純金打造）', 68000, '掛上去笑口常開，香火自然來。金光閃閃，鏡頭最愛這一味。',
    '純金打造，彌勒佛笑口常開掛胸前，金光閃閃喜氣洋洋。傳說戴彌勒能廣納福氣、笑迎八方財，對師父尤其應驗。直播鏡頭最愛這一味，反光一閃，打賞自然滾滾來。\n\n這尊墜子，是無數個深夜的線上斗數諮詢換來的。疫情那兩年大家不敢出門，你乾脆開直播辦事——斗數命盤、雲端開光、線上補運，樣樣都行。阿珠是個獨居的單親媽媽，睡不著就守著你的直播，刷一筆小額打賞，換你回她一句「妳的孩子會出人頭地」。她刷了一整年。\n\n她深夜有人陪、有句安慰的話可聽，這份陪伴現在很值錢的，你看那些網紅。彌勒笑迎眾生，你笑迎打賞，本質上都是「給人歡喜」。胸前掛著佛，提醒著你慈悲為懷——慈悲為懷地，收下每一筆心意。'),
  P('jewelry', 'jade-bangle', '頂級冰種翡翠手鐲', 350000, '通透如神諭，戴久了據說會「養人」。其實是養你那份炫耀心。',
    '頂級冰種，水頭十足、通透如神諭。老一輩說翡翠戴久會「養人」，吸收主人的氣、越戴越潤——這只在你腕上，倒是越養越透亮。\n\n它最潤的那抹綠，來自一門最細膩的功夫：撫慰愧疚。有些女人，年輕時不得已拿掉過孩子，心裡藏著一輩子的結。你只消一句「祂在怨妳、運勢被討」，她就崩潰了，從此每月來「餵嬰靈、做法事」，一做好幾年。阿惠就是這樣，把眼淚與懺悔，一筆一筆交到你手上。\n\n嬰靈在不在沒人能證明，但只要她信「超渡了就解脫了」，她就真的好過一點。你賣的是解脫感，童叟無欺。鐲子養人，你養信眾的心結——互利共生，越養越綠。'),
  P('jewelry', 'diamond-ring', '一克拉 GIA 全美鑽戒', 850000, '【閃瞎】火光四射，比香爐還亮。把妹、談合作、唬信眾，一戒三用。',
    '【閃瞎】一克拉、GIA 認證、3EX 切工全美等級，火光四射，比你壇前的香爐還亮。把妹、談合作、鎮信眾，一戒三用。手指一翻，誰都得正視你的神格。\n\n它的火光，來自廟側那個月老專區：紅線、姻緣符、合八字、斬桃花一條龍，主打「誠心求，正緣三個月內報到」。最虔誠的是位三十好幾、被家裡催婚催瘋的女老師，每月來求、來捐、來綁紅線，把存款都投進了「正緣」。\n\n姻緣天注定，急也急不來，你只是幫忙牽線，又不是婚友社包成功。等待的過程中，她至少有個盼頭、有事可做，這份「被愛沖昏頭前的期待感」多美好。你戴鑽戒去談感情，是以身作則示範什麼叫桃花旺——這不叫揮霍，這叫教學示範。月老的紅線，最後全繞到了你的指頭上。'),
  P('jewelry', 'starry-watch', '滿天星鑽錶（女王款）', 4500000, '錶盤碎鑽如星河，手腕一抬全場安靜。這已經不是看時間，是看排場。',
    '錶盤鋪滿碎鑽如一整片星河，手腕一抬，全場自動安靜。這已經不是用來看時間，是用來看排場、看身價、看你站在哪個位置。女王款，配得上自封「天宮代言人」的你。\n\n錶盤上一百五十顆碎鑽，剛好對應一百五十位學員——那是你的「事業開運班」：月繳會費、晉級加價，傳授神明欽點的成功心法，越往上層走，學費越豐厚。最底層那些人，把開店本金、創業基金都繳了進來，深信「跟對師父就能飛黃騰達」。\n\n成功要靠心法、也要靠努力。他們沒成功，是努力不夠、心不夠誠，怪不到心法頭上。你只是把他們對「成功」的渴望，具象化成腕上的星河——這叫願景管理。一個連自己都過得閃亮的師父，才有資格教別人成功，不是嗎？'),
  P('jewelry', 'pigeon-ruby', '無燒鴿血紅寶套組', 120000000, '【拍賣級】紅得像香火、像鈔票、像信眾的血汗錢。收藏家終極夢幻逸品。',
    '【拍賣級】無燒天然鴿血紅，緬甸頂級產區，紅得濃豔、紅得攝魂——紅得像香火、像鈔票，像所有人捧出來時眼裡那道光。整套頸鍊、耳環、戒指，收藏家窮其一生追逐的終極夢幻逸品。\n\n這抹血色的源頭，是一場辦得轟轟烈烈的「點燈祈福募款大典」：名人站台、媒體報導、跑馬燈感謝榜，捐越多名字越大、座位越前。許多並不寬裕的家庭，為了上榜、為了那份被看見的虔誠，咬牙捐出超出能力的數字。他們捐錢時眼裡有光，那道光，和這套紅寶裡的火光，是同一種紅。\n\n他們捐得有面子、捐得被表揚，這份榮譽感你給足了。慈善募款本來就是這樣運作的——只是這場「慈善」的對象，恰好是你自己。紅寶最美的就是這抹血色：它提醒你，每一分虔誠都來之不易，所以你才要好好戴著、好好珍惜，絕不浪費。'),

  /* ── 🏠 豪宅 ── */
  P('mansion', 'studio', '市區小套房（含家具）', 12000000, '【首購】乩身的第一步！雖然小，但終於不用睡廟裡。香火頭期款剛好夠。',
    '【首購】乩身置產的第一步！市區精華地段，含全套家具，拎包入住。坪數雖小，但這是你人生第一個「不用睡在神桌底下」的家——終於有面牆，半夜聽得見你的夢話，卻不會說出去。\n\n頭期款，剛好是六十戶人家點燈湊齊的。最常來的是租客阿水，他跟你一樣租屋、一樣每月為房租發愁，省下吃飯錢來點一盞燈，求的是「明年能存到頭期、買間屬於自己的小房子」。\n\n阿水有了努力存錢的目標和動力，這份積極的人生觀是你給的，無價。神明的安排向來奇妙，這次先讓「最接近神的人」上了岸——你上了岸，才有能力拉更多人，這叫先後順序，不叫插隊。如今他還在租屋處數電費，你已經在新家收房契了。'),
  P('mansion', 'apartment', '電梯三房 河岸景觀', 48000000, '景觀一流，泡茶看夕陽，信眾的煩惱都與你無關了。建商說：師父住的都好風水。',
    '電梯三房、邊間採光、整片河岸景觀，泡一壺茶看夕陽西下，樓下那些苦難與你隔著一層厚厚的落地窗。建商說「師父住的都好風水」——這片好風水，是無數個徬徨的人換來的。\n\n它的地基，是你的「冤親債主清償法會」：諸事不順，是因為上輩子欠了債、今生有冤親來討，得做法事替他們清償。最揪心的是一對老夫妻，兒子車禍癱瘓，你說那是冤親討命，要他們不斷加做法事「贖罪」。他們賣了鄉下的田，把畢生積蓄都拿來還一筆查無實據的前世債。\n\n人，需要一個「為什麼是我」的答案，你給了——「前世因果」最能讓人心服口服，比「就是運氣不好」溫柔多了。白天聽了一整天的煩惱，晚上回到這間河景房，一片夕陽就把它們洗得乾乾淨淨。從這片陽台，你看不到任何一個求助的人，視野真好；看不到，心就不亂，心不亂才能好好替信眾服務。'),
  P('mansion', 'villa', '陽明山獨棟別墅（附車庫）', 280000000, '前有庭院後有山，氣派到像私人廟宇。停車格五個，放你那些神車剛好。',
    '陽明山獨棟別墅，前有庭院後倚青山，溫泉直通、視野遼闊，氣派到像一座私人廟宇——只是這裡，只拜你一個。附五個車位，剛好停下你那一整排神車。\n\n這棟別墅封頂的最後一筆，來自你最得意的不動產項目：金碧輝煌的「萬姓祠」。祖先牌位明碼標價，基本位、VIP 位、頂樓「離神最近位」分級收費，年年還要繳香火管理費。許多離鄉打拚的遊子，怕被說不孝、怕讓祖先飄零，咬牙把整個家族的牌位都請了進來。\n\n讓祖先有地方住、有人祭拜，這是天大的功德，你只是收個合理的管理成本。山上空氣清新，清新到聞不見山下那些哭著上山還願、繳管理費的人——這份清淨，是修行人應得的清淨。'),
  P('mansion', 'dibao', '帝寶頂樓戶（豪宅天花板）', 1200000000, '【傳說】台灣豪宅代名詞。住進去那天，你就懂什麼叫「香火鼎盛」。',
    '【傳說】台灣豪宅的代名詞、頂級門牌的天花板。挑高大廳、私人管家、政商名流為鄰。住進這裡，你就不必再聽任何人的煩惱了——高樓之上聽不見樓下的哭聲，這不是冷漠，這是境界。師父的心，本來就該離凡人遠一點。\n\n這扇能俯瞰整座城市的落地窗，是你把一整間廟「公司化」的成果：分壇開成連鎖、法會做成訂閱制、開運商品上架直播帶貨，信徒名單變成精準行銷的資料庫，連祈福都能分潤、能抽成、能上市。九千多戶人家的點燈、補運、超渡、安太歲，被系統化地、有效率地，化成了你腳下的這片夜景。\n\n你把信仰這門古老的生意現代化、規模化，創造了就業、繳了稅、還上了財經版面，這是對社會的貢獻。整座城市在你腳下，每一盞燈裡都住著一個願意相信的人——他們相信，所以你富有；你富有，證明神明真的靈。這套邏輯，完美得無懈可擊。'),
  P('mansion', 'palm-island', '杜拜棕櫚島臨海別墅', 3800000000, '【封神】私人沙灘、無邊際泳池。從這裡看不到任何一個信眾——剛好，眼不見為淨。',
    '【封神】杜拜棕櫚島，世界富豪的終極夢土。私人沙灘、無邊際泳池、二十四小時管家，泳池的水清澈見底。從這座海中央的島上望出去，你看不到任何一個信眾——剛好，眼不見為淨。\n\n這座島，是你二十年信仰帝國的封頂之作，填海造陸而成。那些年報過的明牌、做過的法會、賣過的符水、超渡過的亡魂、清償過的前世債、補過的財庫天庫……無數人的盼望、孝心、愧疚與恐懼，跨越海洋，最終在波斯灣堆成了這座專屬於你的島。你終於封神了——一個住在海中央的神。\n\n你從一個睡神桌底下的小乩身，走到坐擁海島的這一步，靠的是「給人希望」這門最古老、也最賺錢的生意。你沒搶沒偷，每一分都是他們心甘情願捧上來的。夜深人靜時，海浪聲偶爾聽起來像哭聲——但海風一吹就散了，散得乾乾淨淨。神，本來就是孤獨的。'),
];

/* 對外：依分類分組的全部商品 */
function byCat() {
  const map = {};
  CATEGORIES.forEach((c) => { map[c.id] = []; });
  PRODUCTS.forEach((p) => { (map[p.cat] = map[p.cat] || []).push(p); });
  return map;
}

/* ════════════════ ownedSummary — 供其他畫面重用 ════════════════ */
export function ownedSummary() {
  const groups = CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    emoji: c.emoji,
    items: PRODUCTS.filter((p) => p.cat === c.id && owns(p.id)),
  }));
  const ownedCount = PRODUCTS.filter((p) => owns(p.id)).length;
  return { groups, ownedCount, total: PRODUCTS.length };
}

/* 依 id 取商品（收藏品鑑頁用） */
export function productById(id) { return PRODUCTS.find((p) => p.id === id) || null; }

/* ════════════════ 小工具 ════════════════ */
const money = (n) => `乩幣$${Math.round(n).toLocaleString()}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* 商品介紹：以 \n\n 切段，逐段包成 <p>（單段或多段皆可）。
   段內保留單一換行（轉 <br>）。 */
const storyHtml = (desc) => String(desc)
  .split(/\n{2,}/)
  .map((para) => para.trim())
  .filter(Boolean)
  .map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`)
  .join('');

/* 假數據：穩定（同一商品每次一樣）但有變化 */
const seeded = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};
const fakeSold = (id) => {
  const h = seeded(id);
  const n = (h % 9000) + 12;
  return n > 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
};
const fakeRating = (id) => (4.6 + (seeded(id) % 4) / 10).toFixed(1); // 4.6–4.9
const fakeCashback = (id) => [3, 5, 8, 10, 12][seeded(id) % 5];

/* 折扣 %（穩定）：用來假裝原價被砍。20–60% off */
const fakeDiscount = (id) => [22, 31, 38, 45, 52, 60][seeded(id) % 6];
/* 假原價：售價 / (1 - 折扣) 後抓個漂亮整數 */
const fakeOrigPrice = (p) => {
  const d = fakeDiscount(p.id) / 100;
  const raw = p.price / (1 - d);
  const mag = Math.pow(10, Math.max(0, String(Math.round(raw)).length - 2));
  return Math.round(raw / mag) * mag;
};
/* 收藏數（穩定） */
const fakeFav = (id) => {
  const h = seeded(id + 'fav');
  const n = (h % 4800) + 36;
  return n > 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
};
/* 評價數量（穩定） */
const fakeReviews = (id) => {
  const h = seeded(id + 'rev');
  const n = (h % 2600) + 18;
  return n > 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
};
/* ★ 圖示列：以四捨五入的整數星顯示實心/空心 */
const starsHtml = (rating) => {
  const full = Math.round(Number(rating));
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= full ? '★' : '☆';
  return out;
};

/* 買家評論：用真實 REVIEWS 算平均星數，再渲染整段評論區 */
const avatarColor = (name) => {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 52%)`;
};
const reviewAvg = (id) => {
  const rs = reviewsFor(id);
  if (!rs.length) return Number(fakeRating(id));
  return rs.reduce((a, r) => a + r.s, 0) / rs.length;
};
const reviewsHtml = (id) => {
  const rs = reviewsFor(id);
  if (!rs.length) return '';
  const avg = reviewAvg(id).toFixed(1);
  const items = rs.map((r) => `
    <div class="rv-item">
      <div class="rv-head">
        <span class="rv-av" style="background:${avatarColor(r.u)}">${esc(r.u.slice(0, 1))}</span>
        <span class="rv-u">${esc(r.u)}</span>
        <span class="rv-stars">${starsHtml(r.s)}</span>
      </div>
      <div class="rv-text">${esc(r.t)}</div>
      <div class="rv-foot"><span class="rv-date">${esc(r.d)}</span><span class="rv-help">👍 ${r.helps} 人說有幫助</span></div>
    </div>`).join('');
  return `
    <div class="dt-block">
      <h4 class="dt-sectitle"><span class="bar"></span>⭐ 買家評論 <span class="rv-avg">${avg} <small>/ 5・${rs.length} 則精選</small></span></h4>
      <div class="rv-list">${items}</div>
      <div class="rv-more">看全部 ${fakeReviews(id)} 則評論 ›</div>
    </div>`;
};
/* 每類的假規格列（純搞笑），回傳 [[label,value],...] */
const SPECS = {
  car: (p) => [
    ['品牌保證', '金帝國際精品旗艦館'],
    ['出廠年份', '香火鼎盛年式'],
    ['里程數', '比你跑廟還少'],
    ['變速系統', '一腳油門信眾全跪'],
    ['隨車贈品', '平安符吊飾 ×1（已開光）'],
    ['可幫助信眾', `${p.ironicHelp.toLocaleString()} 位`],
  ],
  watch: (p) => [
    ['品牌保證', '金帝國際精品旗艦館'],
    ['機芯', '良心已停擺機芯'],
    ['防水深度', '深入信眾口袋 ∞ 米'],
    ['錶帶材質', '信眾的虔誠純手工編織'],
    ['保固', '乩皮終身保固（含跑路）'],
    ['可幫助信眾', `${p.ironicHelp.toLocaleString()} 位`],
  ],
  wine: (p) => [
    ['品牌保證', '金帝國際精品旗艦館'],
    ['酒精濃度', '足以麻痺良心'],
    ['容量', '一瓶＝N 個信眾的午餐錢'],
    ['品飲建議', '退駕後配滷味最對味'],
    ['保存方式', '陰涼處，避光，避信眾'],
    ['可幫助信眾', `${p.ironicHelp.toLocaleString()} 位`],
  ],
  jewelry: (p) => [
    ['品牌保證', '金帝國際精品旗艦館'],
    ['材質', '信眾血汗錢提煉'],
    ['反光係數', '足以閃瞎質疑你的人'],
    ['鑑定書', '附 GIA（乩天宮自行認證）'],
    ['配戴效果', '越貴信眾越信'],
    ['可幫助信眾', `${p.ironicHelp.toLocaleString()} 位`],
  ],
  mansion: (p) => [
    ['品牌保證', '金帝國際精品旗艦館'],
    ['坪數', '比你的良心大很多'],
    ['風水', '建商說師父住的都好風水'],
    ['視野', '看不到任何一個信眾'],
    ['交屋時間', '香火湊滿即可入住'],
    ['可幫助信眾', `${p.ironicHelp.toLocaleString()} 位`],
  ],
};
const specRows = (p) => (SPECS[p.cat] || SPECS.car)(p);

/* ════════════════ 樣式（注入一次） ════════════════ */
function injectStyles() {
  if (document.getElementById('shop-styles')) return;
  const style = document.createElement('style');
  style.id = 'shop-styles';
  style.textContent = `
.shop-root{position:fixed;inset:0;z-index:9000;background:#f5f5f5;color:#222;
  font-family:'Iansui',system-ui,sans-serif;display:flex;flex-direction:column;
  overflow:hidden;animation:shop-in .28s ease}
@keyframes shop-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.shop-root *{box-sizing:border-box}
.shop-root button{font-family:inherit;cursor:pointer}

/* ── 頂部橘色 bar ── */
.shop-top{background:linear-gradient(180deg,#f53d2d,#ee4d2d);color:#fff;
  padding:10px 12px calc(10px + env(safe-area-inset-top,0)) 12px;
  padding-top:calc(10px + env(safe-area-inset-top,0));flex:none;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.shop-top-row{display:flex;align-items:center;gap:8px}
.shop-search{flex:1;background:#fff;border-radius:4px;display:flex;align-items:center;
  padding:7px 10px;color:#999;font-size:14px;gap:6px;min-width:0}
.shop-search .si{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shop-close{background:rgba(255,255,255,.18);border:0;color:#fff;width:34px;height:34px;
  border-radius:50%;font-size:18px;line-height:1;flex:none;transition:.15s}
.shop-close:active{transform:scale(.9);background:rgba(255,255,255,.32)}
.shop-coin{display:flex;align-items:center;gap:6px;margin-top:9px;font-size:13px}
.shop-coin .label{opacity:.9}
.shop-coin .bal{font-weight:700;font-size:16px;background:rgba(0,0,0,.12);
  padding:3px 10px;border-radius:20px;transition:.2s}
.shop-coin .bal.flash{animation:coin-flash .6s ease}
@keyframes coin-flash{0%{transform:scale(1)}40%{transform:scale(1.18);background:#ffd64d;color:#7a3a00}100%{transform:scale(1)}}

/* ── 視圖切換 ── */
.shop-tabs2{display:flex;gap:8px;margin-top:10px}
.shop-tabs2 button{flex:1;background:rgba(255,255,255,.16);border:0;color:#fff;
  padding:7px;border-radius:6px;font-size:14px;transition:.15s;font-weight:700}
.shop-tabs2 button.on{background:#fff;color:#ee4d2d}

/* ── 分類橫向 tabs ── */
.shop-cats{background:#fff;flex:none;display:flex;gap:4px;padding:8px 10px;
  overflow-x:auto;scrollbar-width:none;border-bottom:1px solid #eee}
.shop-cats::-webkit-scrollbar{display:none}
.shop-cat{flex:none;background:#f7f7f7;border:1px solid #eee;border-radius:18px;
  padding:6px 14px;font-size:14px;color:#555;white-space:nowrap;transition:.15s}
.shop-cat.on{background:#fff5f3;border-color:#ee4d2d;color:#ee4d2d;font-weight:700}
.shop-cat:active{transform:scale(.95)}

/* ── 商品格 ── */
.shop-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.shop-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;padding:8px}
@media(min-width:560px){.shop-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:820px){.shop-grid{grid-template-columns:repeat(4,1fr)}}
.shop-card{background:#fff;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 1px 3px rgba(0,0,0,.06);transition:.15s}
.shop-card:active{transform:scale(.98)}
.shop-imgwrap{position:relative;width:100%;aspect-ratio:1/1;background:#f0f0f0;overflow:hidden}
.shop-imgwrap img{width:100%;height:100%;object-fit:cover;display:block}
.shop-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:64px;background:linear-gradient(135deg,#fff3ee,#ffe6dd)}
.shop-badge-cb{position:absolute;left:0;top:0;background:#ffeee8;color:#ee4d2d;font-size:11px;
  padding:2px 6px;border-bottom-right-radius:6px;font-weight:700}
.shop-owned-flag{position:absolute;right:6px;top:6px;background:#26aa99;color:#fff;font-size:11px;
  padding:2px 7px;border-radius:10px;font-weight:700}
.shop-info{padding:7px 8px 9px;display:flex;flex-direction:column;flex:1}
.shop-name{font-size:13.5px;line-height:1.35;color:#222;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden;min-height:2.7em}
.shop-blurb{font-size:11px;color:#999;margin:3px 0 6px;line-height:1.35;display:-webkit-box;
  -webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.shop-price{color:#ee4d2d;font-weight:700;font-size:16px;margin-top:auto}
.shop-price small{font-size:11px}
.shop-meta{display:flex;justify-content:space-between;align-items:center;margin-top:4px;
  font-size:11px;color:#999}
.shop-stars{color:#ffb400}
.shop-add{margin-top:7px;border:0;border-radius:4px;background:#ee4d2d;color:#fff;
  padding:7px;font-size:13px;font-weight:700;transition:.15s}
.shop-add:active{transform:scale(.96)}
.shop-add.owned{background:#e7f6f4;color:#26aa99;cursor:default}
.shop-add.incart{background:#ffb84d;color:#7a3a00}

/* ── 收藏視圖 ── */
.shop-coll{padding:10px}
.shop-coll-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.shop-coll-head h3{margin:0;font-size:17px;color:#ee4d2d}
.shop-coll-head span{font-size:13px;color:#888}
.shop-coll-group{margin-bottom:18px}
.shop-coll-group h4{margin:8px 0 6px;font-size:15px;color:#444;
  display:flex;align-items:center;gap:6px}
.shop-coll-group h4 .cnt{font-size:12px;color:#999;font-weight:400}
.shop-coll-empty{color:#bbb;font-size:13px;padding:6px 0}
.shop-coll-all-empty{text-align:center;color:#aaa;padding:60px 20px;font-size:14px;line-height:1.8}
.shop-coll-all-empty .big{font-size:48px;display:block;margin-bottom:10px}

/* ── 購物車抽屜 ── */
.shop-cartbar{flex:none;background:#fff;border-top:1px solid #eee;display:flex;
  align-items:center;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0));gap:10px;
  box-shadow:0 -2px 10px rgba(0,0,0,.06)}
.shop-cartbar .cart-ico{position:relative;font-size:26px;line-height:1}
.shop-cartbar .cart-cnt{position:absolute;top:-6px;right:-10px;background:#ee4d2d;color:#fff;
  font-size:11px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;padding:0 4px;font-weight:700}
.shop-cartbar .cart-total{flex:1;font-size:13px;color:#555}
.shop-cartbar .cart-total b{color:#ee4d2d;font-size:16px;display:block}
.shop-checkout{background:#ee4d2d;color:#fff;border:0;border-radius:4px;padding:11px 22px;
  font-size:15px;font-weight:700;transition:.15s}
.shop-checkout:active{transform:scale(.96)}
.shop-checkout:disabled{background:#ccc;cursor:not-allowed}

.shop-drawer-mask{position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.45);
  opacity:0;pointer-events:none;transition:.2s}
.shop-drawer-mask.show{opacity:1;pointer-events:auto}
.shop-drawer{position:fixed;left:0;right:0;bottom:0;z-index:9110;background:#fff;
  border-radius:14px 14px 0 0;transform:translateY(110%);transition:.28s cubic-bezier(.22,1,.36,1);
  max-height:78vh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom,0)}
.shop-drawer.show{transform:translateY(0)}
.shop-drawer-head{padding:14px 16px 8px;display:flex;justify-content:space-between;align-items:center;
  border-bottom:1px solid #f0f0f0}
.shop-drawer-head h3{margin:0;font-size:17px}
.shop-drawer-head button{background:none;border:0;font-size:20px;color:#999}
.shop-drawer-list{overflow-y:auto;padding:6px 16px;flex:1}
.shop-citem{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #f5f5f5;align-items:center}
.shop-citem .ci-img{width:52px;height:52px;border-radius:6px;background:linear-gradient(135deg,#fff3ee,#ffe6dd);
  display:flex;align-items:center;justify-content:center;font-size:28px;flex:none;overflow:hidden}
.shop-citem .ci-img img{width:100%;height:100%;object-fit:cover}
.shop-citem .ci-mid{flex:1;min-width:0}
.shop-citem .ci-name{font-size:13.5px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden}
.shop-citem .ci-price{color:#ee4d2d;font-weight:700;font-size:14px;margin-top:3px}
.shop-citem .ci-rm{background:none;border:0;color:#bbb;font-size:20px;flex:none;padding:0 4px}
.shop-cart-empty{text-align:center;color:#bbb;padding:40px 0;font-size:14px}
.shop-drawer-foot{padding:12px 16px;border-top:1px solid #f0f0f0}
.shop-drawer-foot .row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.shop-drawer-foot .row .t{font-size:14px;color:#555}
.shop-drawer-foot .row .v{color:#ee4d2d;font-weight:700;font-size:20px}
.shop-drawer-foot .help{font-size:11px;color:#c98;margin-top:-6px;margin-bottom:10px}

/* ── 結帳成功動畫 ── */
.shop-fx{position:fixed;inset:0;z-index:9300;pointer-events:none;display:flex;
  align-items:center;justify-content:center}
.shop-fx .burst{font-size:96px;animation:fx-pop 1.1s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes fx-pop{0%{transform:scale(0) rotate(-20deg);opacity:0}
  35%{transform:scale(1.25) rotate(8deg);opacity:1}70%{transform:scale(1) rotate(0)}
  100%{transform:scale(1.05);opacity:0}}
.shop-confetti{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;
  animation:fx-fall linear forwards}
@keyframes fx-fall{to{transform:translateY(110vh) rotate(720deg);opacity:.2}}

/* ── 提示 toast ── */
.shop-toasts{position:fixed;left:0;right:0;bottom:84px;z-index:9400;display:flex;
  flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 16px}
.shop-toast{background:rgba(33,33,33,.94);color:#fff;padding:11px 18px;border-radius:24px;
  font-size:14px;max-width:92%;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.25);
  animation:toast-in .3s ease,toast-out .35s ease 2.4s forwards}
.shop-toast.success{background:#26aa99}
.shop-toast.satire{background:#7a4ae0;font-size:13px}
.shop-toast.warn{background:#e0863a}
@keyframes toast-in{from{opacity:0;transform:translateY(16px) scale(.9)}to{opacity:1;transform:none}}
@keyframes toast-out{to{opacity:0;transform:translateY(-8px)}}

/* ════════════ 商品詳細頁（推疊在賣場之上） ════════════ */
.shop-detail{position:absolute;inset:0;z-index:9050;background:#f5f5f5;display:flex;
  flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.22,1,.36,1)}
.shop-detail.show{transform:translateX(0)}
.shop-detail-top{flex:none;background:linear-gradient(180deg,#f53d2d,#ee4d2d);color:#fff;
  display:flex;align-items:center;gap:6px;padding:calc(9px + env(safe-area-inset-top,0)) 10px 9px;
  box-shadow:0 2px 8px rgba(0,0,0,.15)}
.shop-detail-back{background:rgba(255,255,255,.18);border:0;color:#fff;width:34px;height:34px;
  border-radius:50%;font-size:20px;line-height:1;flex:none;transition:.15s}
.shop-detail-back:active{transform:scale(.9);background:rgba(255,255,255,.32)}
.shop-detail-top .dt-title{flex:1;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.shop-detail-top .dt-cart{position:relative;font-size:24px;line-height:1;padding:0 6px}
.shop-detail-top .dt-cart .cart-cnt{position:absolute;top:-6px;right:-4px;background:#fff;color:#ee4d2d;
  font-size:10px;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;
  justify-content:center;padding:0 3px;font-weight:700;border:1px solid #ee4d2d}
.shop-detail-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.shop-detail-img{position:relative;width:100%;aspect-ratio:1/1;background:#fff;overflow:hidden}
.shop-detail-img img{width:100%;height:100%;object-fit:cover;display:block}
.shop-detail-img .shop-fallback{font-size:140px}
.shop-detail-img .dt-flash{position:absolute;left:12px;top:12px;background:#ee4d2d;color:#fff;
  font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;
  box-shadow:0 2px 8px rgba(238,77,45,.4)}
.shop-detail-img .dt-owned{position:absolute;right:12px;top:12px;background:#26aa99;color:#fff;
  font-size:12px;font-weight:700;padding:4px 10px;border-radius:14px}
.dt-pricebar{background:linear-gradient(110deg,#ee4d2d,#ff6a3d);color:#fff;padding:12px 14px}
.dt-pricebar .now{font-size:28px;font-weight:800}
.dt-pricebar .now small{font-size:15px;font-weight:700}
.dt-pricebar .was{font-size:13px;opacity:.85;text-decoration:line-through;margin-left:8px}
.dt-pricebar .off{display:inline-block;background:#fff;color:#ee4d2d;font-size:11px;font-weight:800;
  padding:1px 6px;border-radius:3px;margin-left:8px;vertical-align:middle}
.dt-pricebar .ltd{margin-top:6px;font-size:12px;opacity:.95;display:flex;align-items:center;gap:6px}
.dt-block{background:#fff;margin-top:8px;padding:12px 14px}
.dt-name{font-size:16px;line-height:1.4;font-weight:700;color:#222}
.dt-blurb{font-size:13px;color:#777;margin-top:6px;line-height:1.45}
.dt-statsrow{display:flex;align-items:center;gap:14px;margin-top:10px;font-size:13px;color:#888;
  flex-wrap:wrap}
.dt-statsrow .rate{color:#ffb400;font-weight:700}
.dt-statsrow .rate b{color:#222}
.dt-statsrow .sep{width:1px;height:13px;background:#eee}
.dt-sectitle{font-size:14px;font-weight:700;color:#222;margin:0 0 8px;display:flex;align-items:center;gap:6px}
.dt-sectitle .bar{width:3px;height:14px;background:#ee4d2d;border-radius:2px}
.dt-desc{font-size:13.5px;line-height:1.85;color:#444;white-space:pre-line}
.dt-story{font-size:13.5px;color:#444}
.dt-story p{margin:0;padding:12px 0;line-height:1.95;border-bottom:1px dashed #efe7e2;
  text-align:justify}
.dt-story p:first-child{padding-top:2px}
.dt-story p:last-child{border-bottom:0;padding-bottom:2px}
.dt-story p:first-child{color:#222;font-weight:600}
.dt-story p:nth-child(2){color:#555}
.dt-story p:last-child{color:#9a6a3a;font-style:italic}
.dt-ironic{margin-top:12px;background:#f6f1ff;border-left:3px solid #7a4ae0;color:#6a3fd0;
  font-size:13px;line-height:1.6;padding:9px 12px;border-radius:0 6px 6px 0}
.dt-specs{width:100%;border-collapse:collapse;font-size:13px}
.dt-specs tr{border-bottom:1px solid #f3f3f3}
.dt-specs tr:last-child{border-bottom:0}
.dt-specs td{padding:8px 4px;vertical-align:top}
.dt-specs td.k{color:#999;width:38%}
.dt-specs td.v{color:#333}
.dt-trust{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px}
.dt-trust .t{display:flex;align-items:center;gap:5px;font-size:12px;color:#26aa99;
  background:#eefaf8;border:1px solid #d6f0eb;border-radius:6px;padding:6px 10px}
.dt-seller{display:flex;align-items:center;gap:10px}
.dt-seller .sa{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ee4d2d,#ff8a3d);
  color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}
.dt-seller .sn{font-size:14px;font-weight:700;color:#222}
.dt-seller .sm{font-size:11.5px;color:#999;margin-top:2px}
.dt-seller .sbtn{margin-left:auto;border:1px solid #ee4d2d;color:#ee4d2d;background:#fff;border-radius:4px;
  font-size:12px;padding:6px 12px}
.dt-spacer{height:14px}
/* 買家評論 */
.rv-avg{margin-left:auto;font-size:13px;color:#ee4d2d;font-weight:700}
.rv-avg small{color:#bbb;font-weight:400;font-size:11px}
.dt-sectitle{display:flex;align-items:center}
.rv-list{display:flex;flex-direction:column;gap:0}
.rv-item{padding:12px 0;border-bottom:1px solid #f3f3f3}
.rv-item:last-child{border-bottom:0}
.rv-head{display:flex;align-items:center;gap:8px}
.rv-av{width:28px;height:28px;border-radius:50%;flex:none;color:#fff;font-size:14px;font-weight:700;
  display:flex;align-items:center;justify-content:center}
.rv-u{font-size:13px;color:#555;font-weight:600;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rv-stars{margin-left:auto;color:#ffb400;font-size:13px;letter-spacing:1px}
.rv-text{font-size:13.5px;line-height:1.7;color:#333;margin:7px 0 6px;padding-left:36px}
.rv-foot{display:flex;align-items:center;gap:10px;padding-left:36px}
.rv-date{font-size:11px;color:#bbb}
.rv-help{font-size:11px;color:#999;margin-left:auto}
.rv-more{text-align:center;font-size:13px;color:#ee4d2d;padding:12px 0 2px;border-top:1px solid #f7f7f7;margin-top:4px}
/* 詳細頁底部固定購買條 */
.dt-bar{flex:none;display:flex;align-items:stretch;background:#fff;border-top:1px solid #eee;
  box-shadow:0 -2px 10px rgba(0,0,0,.07);padding-bottom:env(safe-area-inset-bottom,0)}
.dt-bar .dt-ic{flex:none;width:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:2px;font-size:11px;color:#666;border-right:1px solid #f3f3f3}
.dt-bar .dt-ic .e{font-size:20px}
.dt-bar .dt-ic:active{background:#fafafa}
.dt-bar .dt-act{flex:1;display:flex}
.dt-bar .dt-act button{flex:1;border:0;color:#fff;font-size:14px;font-weight:700;padding:14px 4px;transition:.15s}
.dt-bar .dt-act button:active{transform:scale(.98)}
.dt-bar .dt-addcart{background:#ff8a3d}
.dt-bar .dt-buynow{background:#ee4d2d}
.dt-bar .dt-act button:disabled{background:#ccc;cursor:not-allowed}
.dt-bar .dt-owned{flex:1;display:flex;align-items:center;justify-content:center;background:#e7f6f4;
  color:#26aa99;font-size:14px;font-weight:700}

/* ════════════ 結帳流程（多步驟抽屜） ════════════ */
.shop-co-mask{position:fixed;inset:0;z-index:9200;background:rgba(0,0,0,.5);
  opacity:0;pointer-events:none;transition:.22s}
.shop-co-mask.show{opacity:1;pointer-events:auto}
.shop-co{position:fixed;left:0;right:0;bottom:0;z-index:9210;background:#f5f5f5;
  border-radius:14px 14px 0 0;transform:translateY(110%);transition:.3s cubic-bezier(.22,1,.36,1);
  max-height:92vh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom,0)}
.shop-co.show{transform:translateY(0)}
.shop-co-head{flex:none;background:#fff;border-radius:14px 14px 0 0;padding:14px 16px;display:flex;
  align-items:center;gap:8px;border-bottom:1px solid #f0f0f0}
.shop-co-head .co-back{background:none;border:0;font-size:22px;color:#666;padding:0 4px;line-height:1}
.shop-co-head h3{margin:0;font-size:16px;flex:1}
.shop-co-head .co-x{background:none;border:0;font-size:20px;color:#999}
.shop-co-steps{flex:none;background:#fff;display:flex;padding:0 16px 12px;gap:6px}
.shop-co-steps .st{flex:1;font-size:11px;color:#bbb;text-align:center}
.shop-co-steps .st .dot{width:22px;height:22px;border-radius:50%;background:#eee;color:#999;
  display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-size:12px;font-weight:700;
  transition:.2s}
.shop-co-steps .st.on .dot{background:#ee4d2d;color:#fff}
.shop-co-steps .st.done .dot{background:#26aa99;color:#fff}
.shop-co-steps .st.on{color:#ee4d2d;font-weight:700}
.shop-co-body{flex:1;overflow-y:auto;padding:12px 16px}
.co-card{background:#fff;border-radius:8px;padding:12px 14px;margin-bottom:10px}
.co-card h4{margin:0 0 10px;font-size:14px;color:#222;display:flex;align-items:center;gap:6px}
.co-line{display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px;color:#555;
  padding:4px 0}
.co-line .v{color:#333;font-weight:600}
.co-line.free .v{color:#26aa99;font-weight:700}
.co-line.discount .v{color:#ee4d2d;font-weight:700}
.co-line.grand{border-top:1px dashed #eee;margin-top:6px;padding-top:10px}
.co-line.grand .t{font-size:14px;color:#222;font-weight:700}
.co-line.grand .v{color:#ee4d2d;font-size:21px;font-weight:800}
.co-item{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5;align-items:center}
.co-item:last-child{border-bottom:0}
.co-item .ci-img{width:46px;height:46px;border-radius:6px;flex:none;overflow:hidden;
  background:linear-gradient(135deg,#fff3ee,#ffe6dd);display:flex;align-items:center;justify-content:center;font-size:24px}
.co-item .ci-img img{width:100%;height:100%;object-fit:cover}
.co-item .ci-n{flex:1;min-width:0;font-size:13px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden}
.co-item .ci-p{color:#ee4d2d;font-weight:700;font-size:13.5px;flex:none}
.co-ironic{font-size:12px;color:#b07acc;background:#f6f1ff;border-radius:6px;padding:8px 10px;line-height:1.5}
/* 付款方式 */
.co-pay{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid #f3f3f3;cursor:pointer}
.co-pay:last-child{border-bottom:0}
.co-pay .pe{font-size:24px;width:30px;text-align:center}
.co-pay .pm{flex:1}
.co-pay .pm .pn{font-size:14px;color:#222;font-weight:600}
.co-pay .pm .pd{font-size:11.5px;color:#999;margin-top:2px}
.co-pay .pr{width:20px;height:20px;border-radius:50%;border:2px solid #ccc;flex:none;transition:.15s;
  position:relative}
.co-pay.sel .pr{border-color:#ee4d2d}
.co-pay.sel .pr::after{content:'';position:absolute;inset:3px;border-radius:50%;background:#ee4d2d}
.co-pay.dis{opacity:.45}
.co-pay.dis .pm .pd{color:#e0863a}
/* 信用卡 */
.co-ccard{background:linear-gradient(125deg,#2a2a3a,#444 55%,#1f1f2e);border-radius:14px;color:#fff;
  padding:18px;position:relative;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.25);margin-bottom:14px;
  aspect-ratio:1.586/1;display:flex;flex-direction:column;justify-content:space-between}
.co-ccard::before{content:'';position:absolute;right:-40px;top:-40px;width:160px;height:160px;
  border-radius:50%;background:rgba(238,77,45,.35)}
.co-ccard::after{content:'';position:absolute;right:10px;bottom:-30px;width:120px;height:120px;
  border-radius:50%;background:rgba(255,255,255,.06)}
.co-ccard .cc-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
.co-ccard .cc-chip{width:42px;height:32px;border-radius:6px;
  background:linear-gradient(135deg,#f6d365,#d4af37);position:relative}
.co-ccard .cc-chip::after{content:'';position:absolute;inset:6px 8px;
  border:1px solid rgba(0,0,0,.25);border-radius:3px}
.co-ccard .cc-brand{font-size:18px;font-weight:800;font-style:italic;letter-spacing:.5px}
.co-ccard .cc-num{font-size:21px;letter-spacing:3px;font-family:'Courier New',monospace;position:relative;z-index:1}
.co-ccard .cc-bot{display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1}
.co-ccard .cc-lbl{font-size:9px;opacity:.6;letter-spacing:1px;text-transform:uppercase}
.co-ccard .cc-val{font-size:13px;margin-top:2px}
.co-ccard.swipe{animation:cc-swipe .9s cubic-bezier(.5,0,.3,1) forwards}
@keyframes cc-swipe{0%{transform:translateX(0) rotate(0)}40%{transform:translateX(-8%) rotate(-1deg)}
  100%{transform:translateX(120%) rotate(6deg);opacity:0}}
.co-form .fld{margin-bottom:12px}
.co-form .fld label{display:block;font-size:12px;color:#888;margin-bottom:5px}
.co-form .fld input{width:100%;border:1px solid #e2e2e2;border-radius:8px;padding:11px 12px;
  font-size:15px;font-family:inherit;background:#fff;color:#333;letter-spacing:1px}
.co-form .fld input:focus{outline:0;border-color:#ee4d2d}
.co-form .frow{display:flex;gap:10px}
.co-form .frow .fld{flex:1}
.co-secure{font-size:11px;color:#26aa99;display:flex;align-items:center;gap:5px;margin-top:-2px}
/* 結帳底部按鈕 */
.shop-co-foot{flex:none;background:#fff;border-top:1px solid #f0f0f0;padding:12px 16px;
  display:flex;align-items:center;gap:12px}
.shop-co-foot .ftot{flex:1;font-size:12px;color:#888}
.shop-co-foot .ftot b{display:block;color:#ee4d2d;font-size:18px;font-weight:800}
.shop-co-foot .fbtn{background:#ee4d2d;color:#fff;border:0;border-radius:6px;padding:13px 26px;
  font-size:15px;font-weight:700;transition:.15s}
.shop-co-foot .fbtn:active{transform:scale(.97)}
.shop-co-foot .fbtn:disabled{background:#ccc;cursor:not-allowed}
.shop-co-foot .fbtn.swipe-btn{background:linear-gradient(110deg,#ee4d2d,#ff6a3d)}
/* 交易處理中 */
.co-processing{position:absolute;inset:0;z-index:9220;background:rgba(245,245,245,.97);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  border-radius:14px 14px 0 0;animation:shop-in .2s ease}
.co-spinner{width:54px;height:54px;border:5px solid #f0d8d2;border-top-color:#ee4d2d;border-radius:50%;
  animation:co-spin .8s linear infinite}
@keyframes co-spin{to{transform:rotate(360deg)}}
.co-processing .ptxt{font-size:15px;color:#666;font-weight:700}
.co-processing .psub{font-size:12px;color:#aaa;margin-top:-8px}
.co-processing.ok .co-spinner{display:none}
.co-check{width:84px;height:84px;border-radius:50%;background:#26aa99;display:flex;align-items:center;
  justify-content:center;font-size:46px;color:#fff;animation:co-check-pop .5s cubic-bezier(.2,1.5,.4,1)}
@keyframes co-check-pop{0%{transform:scale(0)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
.co-okline{font-size:18px;font-weight:800;color:#26aa99}
.co-oksub{font-size:13px;color:#888;margin-top:-10px;text-align:center;line-height:1.5;padding:0 24px}
`;
  document.head.appendChild(style);
}

/* ════════════════ openShop ════════════════ */
export function openShop(containerEl, { onClose } = {}) {
  if (!containerEl) return;
  injectStyles();

  /* 可重複呼叫：先清空 */
  containerEl.innerHTML = '';
  containerEl.className = 'shop-root';

  const ui = {
    view: 'mall', // 'mall' | 'collection'
    cat: 'car',
    cart: new Set(), // product id
    detailId: null, // 目前開啟的商品詳細頁 id（null = 未開）
  };

  /* ── 骨架 ── */
  containerEl.innerHTML = `
    <div class="shop-top">
      <div class="shop-top-row">
        <div class="shop-search"><span>🔍</span><span class="si">搜尋你買得起的下一個慾望…</span></div>
        <button class="shop-close" aria-label="關閉">✕</button>
      </div>
      <div class="shop-coin">
        <span class="label">🪙 乩幣餘額</span>
        <span class="bal" data-bal>${money(getSave().cash)}</span>
      </div>
      <div class="shop-tabs2">
        <button data-view="mall" class="on">🛍️ 逛賣場</button>
        <button data-view="collection">🏆 我的收藏</button>
      </div>
    </div>
    <div class="shop-cats" data-cats></div>
    <div class="shop-scroll" data-scroll></div>
    <div class="shop-cartbar">
      <span class="cart-ico">🛒<span class="cart-cnt" data-cartcnt style="display:none">0</span></span>
      <div class="cart-total">購物車<b data-carttotal>乩幣$0</b></div>
      <button class="shop-checkout" data-opencart disabled>查看購物車</button>
    </div>

    <div class="shop-drawer-mask" data-mask></div>
    <div class="shop-drawer" data-drawer>
      <div class="shop-drawer-head">
        <h3>🛒 購物車</h3>
        <button data-closecart>✕</button>
      </div>
      <div class="shop-drawer-list" data-cartlist></div>
      <div class="shop-drawer-foot">
        <div class="row"><span class="t">合計</span><span class="v" data-drawertotal>乩幣$0</span></div>
        <div class="help" data-drawerhelp></div>
        <button class="shop-checkout" data-checkout style="width:100%" disabled>結帳</button>
      </div>
    </div>

    <div class="shop-detail" data-detail></div>

    <div class="shop-co-mask" data-comask></div>
    <div class="shop-co" data-co></div>

    <div class="shop-toasts" data-toasts></div>
  `;

  const q = (sel) => containerEl.querySelector(sel);
  const refs = {
    bal: q('[data-bal]'),
    cats: q('[data-cats]'),
    scroll: q('[data-scroll]'),
    cartcnt: q('[data-cartcnt]'),
    carttotal: q('[data-carttotal]'),
    opencart: q('[data-opencart]'),
    mask: q('[data-mask]'),
    drawer: q('[data-drawer]'),
    cartlist: q('[data-cartlist]'),
    drawertotal: q('[data-drawertotal]'),
    drawerhelp: q('[data-drawerhelp]'),
    checkout: q('[data-checkout]'),
    detail: q('[data-detail]'),
    comask: q('[data-comask]'),
    co: q('[data-co]'),
    toasts: q('[data-toasts]'),
  };

  /* ── 分類 tabs ── */
  refs.cats.innerHTML = CATEGORIES.map((c) => `
    <button class="shop-cat${c.id === ui.cat ? ' on' : ''}" data-cat="${c.id}">${c.emoji} ${c.label}</button>
  `).join('');
  refs.cats.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.cat = btn.dataset.cat;
      refs.cats.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', b === btn));
      renderMall();
    });
  });

  /* ── 視圖切換 ── */
  containerEl.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.view = btn.dataset.view;
      containerEl.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b === btn));
      refs.cats.style.display = ui.view === 'mall' ? '' : 'none';
      render();
    });
  });

  /* ── 圖片 fallback HTML（404 → emoji 磚） ── */
  const imgHtml = (p, cls = '') => `
    <img class="${cls}" src="${asset(p.img)}" alt="${esc(p.name)}" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
    <div class="shop-fallback" style="display:none">${CAT_EMOJI[p.cat]}</div>`;

  /* ── 渲染賣場 ── */
  function renderMall() {
    const items = PRODUCTS.filter((p) => p.cat === ui.cat);
    refs.scroll.innerHTML = `<div class="shop-grid">${items.map(cardHtml).join('')}</div>`;
    refs.scroll.scrollTop = 0;
    refs.scroll.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); toggleCart(btn.dataset.add); });
    });
    refs.scroll.querySelectorAll('[data-open]').forEach((el) => {
      el.addEventListener('click', () => openDetail(el.dataset.open));
    });
  }

  function cardHtml(p) {
    const has = owns(p.id);
    const inCart = ui.cart.has(p.id);
    const btn = has
      ? '<button class="shop-add owned" disabled>✓ 已擁有</button>'
      : `<button class="shop-add${inCart ? ' incart' : ''}" data-add="${p.id}">${inCart ? '✓ 已加入' : '加入購物車'}</button>`;
    return `
      <div class="shop-card">
        <div class="shop-imgwrap" data-open="${p.id}">
          <div class="shop-badge-cb">乩幣回饋 ${fakeCashback(p.id)}%</div>
          ${has ? '<div class="shop-owned-flag">已擁有</div>' : ''}
          ${imgHtml(p)}
        </div>
        <div class="shop-info">
          <div class="shop-name" data-open="${p.id}">${esc(p.name)}</div>
          <div class="shop-blurb" data-open="${p.id}">${esc(p.blurb)}</div>
          <div class="shop-price" data-open="${p.id}"><small>乩幣$</small> ${Math.round(p.price).toLocaleString()}</div>
          <div class="shop-meta" data-open="${p.id}">
            <span class="shop-stars">★ ${fakeRating(p.id)}</span>
            <span>已售出 ${fakeSold(p.id)} 件</span>
          </div>
          ${btn}
        </div>
      </div>`;
  }

  /* ── 渲染收藏 ── */
  function renderCollection() {
    const { groups, ownedCount, total } = ownedSummary();
    if (ownedCount === 0) {
      refs.scroll.innerHTML = `
        <div class="shop-coll">
          <div class="shop-coll-all-empty">
            <span class="big">🛒</span>
            收藏櫃空空如也。<br>香火還沒燒成你的慾望，去逛逛賣場吧。
          </div>
        </div>`;
      return;
    }
    const groupHtml = groups.map((g) => {
      const inner = g.items.length
        ? `<div class="shop-grid">${g.items.map(collCardHtml).join('')}</div>`
        : '<div class="shop-coll-empty">這類還沒收藏，繼續燒香。</div>';
      return `
        <div class="shop-coll-group">
          <h4>${g.emoji} ${g.label} <span class="cnt">${g.items.length} / ${PRODUCTS.filter((p) => p.cat === g.id).length}</span></h4>
          ${inner}
        </div>`;
    }).join('');
    refs.scroll.innerHTML = `
      <div class="shop-coll">
        <div class="shop-coll-head">
          <h3>🏆 我的收藏</h3>
          <span>已收藏 ${ownedCount} / ${total} 件</span>
        </div>
        ${groupHtml}
      </div>`;
    refs.scroll.scrollTop = 0;
    refs.scroll.querySelectorAll('[data-open]').forEach((el) => {
      el.addEventListener('click', () => openDetail(el.dataset.open));
    });
  }

  function collCardHtml(p) {
    return `
      <div class="shop-card">
        <div class="shop-imgwrap" data-open="${p.id}">
          <div class="shop-owned-flag">已擁有</div>
          ${imgHtml(p)}
        </div>
        <div class="shop-info">
          <div class="shop-name" data-open="${p.id}">${esc(p.name)}</div>
          <div class="shop-price" data-open="${p.id}"><small>乩幣$</small> ${Math.round(p.price).toLocaleString()}</div>
        </div>
      </div>`;
  }

  function render() {
    if (ui.view === 'mall') renderMall();
    else renderCollection();
  }

  /* ── 購物車 ── */
  function toggleCart(id) {
    if (owns(id)) return;
    if (ui.cart.has(id)) ui.cart.delete(id);
    else ui.cart.add(id);
    updateCartBar();
    if (ui.view === 'mall') renderMall(); // 更新按鈕狀態
    if (refs.drawer.classList.contains('show')) renderCart();
    if (ui.detailId) renderDetailBar(); // 詳細頁開啟時同步底部條
  }

  function cartItems() {
    return PRODUCTS.filter((p) => ui.cart.has(p.id) && !owns(p.id));
  }
  function cartTotal() {
    return cartItems().reduce((s, p) => s + p.price, 0);
  }

  function updateCartBar() {
    const items = cartItems();
    const total = cartTotal();
    refs.cartcnt.textContent = String(items.length);
    refs.cartcnt.style.display = items.length ? '' : 'none';
    refs.carttotal.textContent = money(total);
    refs.opencart.disabled = items.length === 0;
    // 同步詳細頁頂部的購物車徽章
    const dtCnt = refs.detail.querySelector('[data-dtcartcnt]');
    if (dtCnt) {
      dtCnt.textContent = String(items.length);
      dtCnt.style.display = items.length ? '' : 'none';
    }
  }

  function renderCart() {
    const items = cartItems();
    const total = cartTotal();
    if (!items.length) {
      refs.cartlist.innerHTML = '<div class="shop-cart-empty">購物車是空的。<br>慾望需要先被加入。</div>';
    } else {
      refs.cartlist.innerHTML = items.map((p) => `
        <div class="shop-citem">
          <div class="ci-img">
            <img src="${asset(p.img)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${CAT_EMOJI[p.cat]}'" />
          </div>
          <div class="ci-mid">
            <div class="ci-name">${esc(p.name)}</div>
            <div class="ci-price">${money(p.price)}</div>
          </div>
          <button class="ci-rm" data-rm="${p.id}" aria-label="移除">✕</button>
        </div>`).join('');
      refs.cartlist.querySelectorAll('[data-rm]').forEach((btn) => {
        btn.addEventListener('click', () => toggleCart(btn.dataset.rm));
      });
    }
    refs.drawertotal.textContent = money(total);
    const help = items.reduce((s, p) => s + p.ironicHelp, 0);
    refs.drawerhelp.textContent = total > 0 ? `這筆錢本可幫助 ${help.toLocaleString()} 位信眾。` : '';

    const cash = getSave().cash;
    const afford = items.length > 0 && cash >= total;
    refs.checkout.disabled = !afford;
    refs.checkout.textContent = items.length === 0
      ? '結帳'
      : afford ? `結帳 ${money(total)}` : '乩幣不足';
  }

  function openCart() {
    renderCart();
    refs.mask.classList.add('show');
    refs.drawer.classList.add('show');
  }
  function closeCart() {
    refs.mask.classList.remove('show');
    refs.drawer.classList.remove('show');
  }
  refs.opencart.addEventListener('click', openCart);
  refs.mask.addEventListener('click', closeCart);
  q('[data-closecart]').addEventListener('click', closeCart);

  /* ── 從購物車進入結帳流程 ── */
  refs.checkout.addEventListener('click', () => {
    const items = cartItems();
    if (!items.length) return;
    closeCart();
    setTimeout(() => startCheckout(items, 'cart'), 220); // 等抽屜收起再開結帳
  });

  /* ════════════════ 商品詳細頁 ════════════════ */
  function openDetail(id) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    ui.detailId = id;
    renderDetail(p);
    // 強制 reflow 後加上 .show，觸發滑入動畫
    void refs.detail.offsetWidth;
    refs.detail.classList.add('show');
  }

  function closeDetail() {
    refs.detail.classList.remove('show');
    ui.detailId = null;
    setTimeout(() => { if (!ui.detailId) refs.detail.innerHTML = ''; }, 320);
  }

  function renderDetail(p) {
    const has = owns(p.id);
    const orig = fakeOrigPrice(p);
    const off = fakeDiscount(p.id);
    const inCartCount = cartItems().length;
    refs.detail.innerHTML = `
      <div class="shop-detail-top">
        <button class="shop-detail-back" data-dtback aria-label="返回">‹</button>
        <span class="dt-title">商品詳情</span>
        <span class="dt-cart" data-dtopencart>🛒<span class="cart-cnt" data-dtcartcnt
          style="${inCartCount ? '' : 'display:none'}">${inCartCount}</span></span>
      </div>
      <div class="shop-detail-scroll" data-dtscroll>
        <div class="shop-detail-img">
          <div class="dt-flash">🔥 限時 ${off}% OFF</div>
          ${has ? '<div class="dt-owned">✓ 已擁有</div>' : ''}
          ${imgHtml(p)}
        </div>
        <div class="dt-pricebar">
          <span class="now"><small>乩幣$</small> ${Math.round(p.price).toLocaleString()}</span>
          <span class="was">乩幣$${orig.toLocaleString()}</span>
          <span class="off">-${off}%</span>
          <div class="ltd">⏰ 香火特賣最後一波・賣完恢復原價・乩幣回饋 ${fakeCashback(p.id)}%</div>
        </div>
        <div class="dt-block">
          <div class="dt-name">${esc(p.name)}</div>
          <div class="dt-blurb">${esc(p.blurb)}</div>
          <div class="dt-statsrow">
            <span class="rate">${starsHtml(reviewAvg(p.id))} <b>${reviewAvg(p.id).toFixed(1)}</b></span>
            <span class="sep"></span>
            <span>${fakeReviews(p.id)} 則評價</span>
            <span class="sep"></span>
            <span>已售出 ${fakeSold(p.id)}</span>
            <span class="sep"></span>
            <span>❤️ ${fakeFav(p.id)} 收藏</span>
          </div>
        </div>
        <div class="dt-block">
          <h4 class="dt-sectitle"><span class="bar"></span>📖 商品介紹</h4>
          <div class="dt-story">${storyHtml(p.desc)}</div>
          <div class="dt-ironic">😇 這筆錢本可幫助 <b>${p.ironicHelp.toLocaleString()}</b> 位信眾。</div>
        </div>
        ${reviewsHtml(p.id)}
        <div class="dt-block">
          <h4 class="dt-sectitle"><span class="bar"></span>規格</h4>
          <table class="dt-specs"><tbody>
            ${specRows(p).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="dt-block">
          <h4 class="dt-sectitle"><span class="bar"></span>乩皮保證</h4>
          <div class="dt-trust">
            <span class="t">🛡️ 乩皮保證</span>
            <span class="t">↩️ 7 天鑑賞期</span>
            <span class="t">🚚 香火免運</span>
            <span class="t">✅ 正品保障</span>
          </div>
        </div>
        <div class="dt-block">
          <h4 class="dt-sectitle"><span class="bar"></span>賣家</h4>
          <div class="dt-seller">
            <div class="sa">乩</div>
            <div>
              <div class="sn">金帝國際精品旗艦館</div>
              <div class="sm">回覆速度 神速・出貨 退駕後 24h・好評 99.8%</div>
            </div>
            <button class="sbtn" data-dtchat>聊聊</button>
          </div>
        </div>
        <div class="dt-spacer"></div>
      </div>
      <div class="dt-bar" data-dtbar></div>
    `;
    // 事件
    refs.detail.querySelector('[data-dtback]').addEventListener('click', closeDetail);
    refs.detail.querySelector('[data-dtopencart]').addEventListener('click', () => {
      const items = cartItems();
      if (items.length) openCart();
      else toast('購物車是空的，先把慾望加進來。', 'warn');
    });
    refs.detail.querySelector('[data-dtchat]').addEventListener('click', () => {
      toast('賣家：老闆好眼光，這件全台沒幾件 💎', '');
    });
    const dtImg = refs.detail.querySelector('.shop-detail-img img');
    if (dtImg) dtImg.removeAttribute('loading'); // 詳細頁主圖立即載入
    renderDetailBar();
  }

  /* 詳細頁底部固定購買條（依擁有/加入狀態更新） */
  function renderDetailBar() {
    const bar = refs.detail.querySelector('[data-dtbar]');
    if (!bar) return;
    const p = PRODUCTS.find((x) => x.id === ui.detailId);
    if (!p) return;
    const has = owns(p.id);
    if (has) {
      bar.innerHTML = `
        <div class="dt-ic" data-dtgocart>
          <span class="e">🛒</span><span>購物車</span>
        </div>
        <div class="dt-owned">✓ 已收入囊中</div>`;
    } else {
      const inCart = ui.cart.has(p.id);
      bar.innerHTML = `
        <div class="dt-ic" data-dtgocart>
          <span class="e">🛒</span><span>購物車</span>
        </div>
        <div class="dt-act">
          <button class="dt-addcart" data-dtadd>${inCart ? '✓ 已加入' : '加入購物車'}</button>
          <button class="dt-buynow" data-dtbuy>直接購買</button>
        </div>`;
    }
    const gocart = bar.querySelector('[data-dtgocart]');
    if (gocart) gocart.addEventListener('click', () => {
      const items = cartItems();
      if (items.length) openCart();
      else toast('購物車是空的，先把慾望加進來。', 'warn');
    });
    const addBtn = bar.querySelector('[data-dtadd]');
    if (addBtn) addBtn.addEventListener('click', () => toggleCart(p.id));
    const buyBtn = bar.querySelector('[data-dtbuy]');
    if (buyBtn) buyBtn.addEventListener('click', () => startCheckout([p], 'buynow'));
  }

  /* ════════════════ 擬真結帳流程 ════════════════ */
  /* co = { items, total, help, source, step, method } */
  let co = null;

  function startCheckout(items, source) {
    items = items.filter((p) => !owns(p.id));
    if (!items.length) { toast('這些你都有了，無需重複供奉。', ''); return; }
    co = {
      items,
      total: items.reduce((s, p) => s + p.price, 0),
      help: items.reduce((s, p) => s + p.ironicHelp, 0),
      source,
      step: 0, // 0=訂單摘要 1=付款方式 2=信用卡 3=結果
      method: 'card',
    };
    renderCheckout();
    void refs.co.offsetWidth;
    refs.comask.classList.add('show');
    refs.co.classList.add('show');
  }

  function closeCheckout() {
    refs.comask.classList.remove('show');
    refs.co.classList.remove('show');
    setTimeout(() => { refs.co.innerHTML = ''; }, 320);
    co = null;
  }

  const PAY_METHODS = [
    { id: 'card', e: '💳', n: '信用卡 / 簽帳金融卡', d: '乩天宮聯名卡・刷越多功德越少' },
    { id: 'cod', e: '📦', n: '貨到付款', d: '退駕後現金支付（手續費 30 乩幣）' },
    { id: 'wallet', e: '🪙', n: '乩幣錢包', d: '直接從香火餘額扣款' },
  ];

  const STEP_LABELS = ['訂單摘要', '付款方式', '確認付款'];

  function renderCheckout() {
    if (!co) return;
    const stepBar = co.step <= 2 ? `
      <div class="shop-co-steps">
        ${STEP_LABELS.map((lbl, i) => `
          <div class="st ${i === co.step ? 'on' : ''} ${i < co.step ? 'done' : ''}">
            <div class="dot">${i < co.step ? '✓' : i + 1}</div>${lbl}
          </div>`).join('')}
      </div>` : '';

    refs.co.innerHTML = `
      <div class="shop-co-head">
        ${co.step > 0 && co.step < 3 ? '<button class="co-back" data-coback>‹</button>' : '<span style="width:14px"></span>'}
        <h3>${co.step === 3 ? '付款完成' : '結帳'}</h3>
        <button class="co-x" data-cox>✕</button>
      </div>
      ${stepBar}
      <div class="shop-co-body" data-cobody></div>
      <div class="shop-co-foot" data-cofoot></div>
    `;
    refs.co.querySelector('[data-cox]').addEventListener('click', closeCheckout);
    const back = refs.co.querySelector('[data-coback]');
    if (back) back.addEventListener('click', () => {
      co.step = co.method === 'card' ? co.step - 1 : 0;
      renderCheckout();
    });

    const body = refs.co.querySelector('[data-cobody]');
    const foot = refs.co.querySelector('[data-cofoot]');
    if (co.step === 0) renderCoSummary(body, foot);
    else if (co.step === 1) renderCoMethod(body, foot);
    else if (co.step === 2) renderCoCard(body, foot);
  }

  /* Step 0：訂單摘要 */
  function renderCoSummary(body, foot) {
    body.innerHTML = `
      <div class="co-card">
        <h4>🛍️ 商品（${co.items.length}）</h4>
        ${co.items.map((p) => `
          <div class="co-item">
            <div class="ci-img">
              <img src="${asset(p.img)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${CAT_EMOJI[p.cat]}'" />
            </div>
            <div class="ci-n">${esc(p.name)}</div>
            <div class="ci-p">${money(p.price)}</div>
          </div>`).join('')}
      </div>
      <div class="co-card">
        <h4>🧾 金額明細</h4>
        <div class="co-line"><span class="t">商品小計</span><span class="v">${money(co.total)}</span></div>
        <div class="co-line free"><span class="t">運費</span><span class="v">免運</span></div>
        <div class="co-line discount"><span class="t">乩幣折抵</span><span class="v">-${money(0)}</span></div>
        <div class="co-line grand"><span class="t">應付總額</span><span class="v">${money(co.total)}</span></div>
      </div>
      <div class="co-ironic">😇 這筆 ${money(co.total)} 本可幫助 ${co.help.toLocaleString()} 位信眾。但你選擇了自己。</div>
    `;
    foot.innerHTML = `
      <div class="ftot">應付總額<b>${money(co.total)}</b></div>
      <button class="fbtn" data-conext>前往付款</button>
    `;
    foot.querySelector('[data-conext]').addEventListener('click', () => { co.step = 1; renderCheckout(); });
  }

  /* Step 1：選擇付款方式 */
  function renderCoMethod(body, foot) {
    const cash = getSave().cash;
    body.innerHTML = `
      <div class="co-card">
        <h4>💰 選擇付款方式</h4>
        ${PAY_METHODS.map((m) => {
          const walletShort = m.id === 'wallet' && cash < co.total;
          return `
          <div class="co-pay ${m.id === co.method ? 'sel' : ''} ${walletShort ? 'dis' : ''}" data-pay="${m.id}">
            <span class="pe">${m.e}</span>
            <div class="pm">
              <div class="pn">${m.n}</div>
              <div class="pd">${walletShort ? '乩幣不足，香火還沒燒夠' : m.d}</div>
            </div>
            <span class="pr"></span>
          </div>`;
        }).join('')}
      </div>
      <div class="co-card">
        <div class="co-line"><span class="t">乩幣餘額</span><span class="v">${money(cash)}</span></div>
        <div class="co-line grand"><span class="t">本筆應付</span><span class="v">${money(co.total)}</span></div>
      </div>
    `;
    body.querySelectorAll('[data-pay]').forEach((el) => {
      el.addEventListener('click', () => {
        const m = el.dataset.pay;
        if (m === 'wallet' && cash < co.total) { toast('乩幣不足，香火還沒燒夠。', 'warn'); return; }
        co.method = m;
        renderCoMethod(body, foot);
      });
    });
    const afford = cash >= co.total;
    const label = co.method === 'card' ? '前往刷卡'
      : co.method === 'cod' ? '確認下單（貨到付款）'
        : '乩幣付款';
    foot.innerHTML = `
      <div class="ftot">本筆應付<b>${money(co.total)}</b></div>
      <button class="fbtn" data-conext ${!afford ? 'disabled' : ''}>${afford ? label : '乩幣不足'}</button>
    `;
    const nx = foot.querySelector('[data-conext]');
    if (nx && afford) nx.addEventListener('click', () => {
      if (co.method === 'card') { co.step = 2; renderCheckout(); }
      else processPayment(); // 貨到付款 / 乩幣錢包：直接結算
    });
  }

  /* Step 2：信用卡刷卡（純表演） */
  function renderCoCard(body, foot) {
    body.innerHTML = `
      <div class="co-ccard" data-cc>
        <div class="cc-top">
          <div class="cc-chip"></div>
          <div class="cc-brand">乩PAY</div>
        </div>
        <div class="cc-num">**** **** **** 8888</div>
        <div class="cc-bot">
          <div><div class="cc-lbl">持卡人</div><div class="cc-val">乩天宮</div></div>
          <div><div class="cc-lbl">有效期限</div><div class="cc-val">09/29</div></div>
        </div>
      </div>
      <div class="co-card">
        <h4>💳 信用卡資訊</h4>
        <form class="co-form" data-ccform onsubmit="return false">
          <div class="fld">
            <label>卡號</label>
            <input type="text" inputmode="numeric" value="**** **** **** 8888" readonly />
          </div>
          <div class="frow">
            <div class="fld"><label>有效期限</label><input type="text" value="09 / 29" readonly /></div>
            <div class="fld"><label>安全碼 CVV</label><input type="text" value="•••" readonly /></div>
          </div>
          <div class="fld">
            <label>持卡人姓名</label>
            <input type="text" value="乩天宮" readonly />
          </div>
          <div class="co-secure">🔒 乩皮 SSL 安全加密・你的香火帳號絕不外流（外流也只有你自己看）</div>
        </form>
      </div>
      <div class="co-ironic">😇 刷下去，${co.help.toLocaleString()} 位信眾的指望就化成你的收藏了。</div>
    `;
    foot.innerHTML = `
      <div class="ftot">本筆刷卡<b>${money(co.total)}</b></div>
      <button class="fbtn swipe-btn" data-coswipe>💳 立即刷卡</button>
    `;
    foot.querySelector('[data-coswipe]').addEventListener('click', () => {
      const card = body.querySelector('[data-cc]');
      if (card) card.classList.add('swipe');
      if (navigator.vibrate) navigator.vibrate(30);
      processPayment();
    });
  }

  /* 交易處理中 → 成功 → 結算 */
  function processPayment() {
    if (!co) return;
    const snapshot = co; // 結算用快照（避免關閉後 null）
    // 處理中覆蓋層
    const overlay = document.createElement('div');
    overlay.className = 'co-processing';
    overlay.innerHTML = `
      <div class="co-spinner"></div>
      <div class="ptxt">交易處理中…</div>
      <div class="psub">乩天宮金流安全驗證中</div>`;
    refs.co.appendChild(overlay);

    setTimeout(() => {
      // 真正扣款：貨幣是乩幣（cash）
      if (!spendCash(snapshot.total)) {
        overlay.remove();
        toast('乩幣不足，香火還沒燒夠。', 'warn');
        return;
      }
      snapshot.items.forEach((p) => { ownItem(p.id); bump('lifetimeSpent', p.price); });
      persist();
      // 從購物車移除已購買項目
      snapshot.items.forEach((p) => ui.cart.delete(p.id));

      // 成功畫面
      overlay.classList.add('ok');
      overlay.innerHTML = `
        <div class="co-check">✓</div>
        <div class="co-okline">付款成功！</div>
        <div class="co-oksub">入手 ${snapshot.items.length} 件奢侈品・乩幣回饋已入帳<br>感謝信眾，喔不，感謝你的慾望。</div>`;
      if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
      playCheckoutFx();
      flashBalance();
      updateCash();
      updateCartBar();

      // 詳細頁底部條 / 賣場 / 收藏 同步
      if (ui.detailId) {
        const p = PRODUCTS.find((x) => x.id === ui.detailId);
        if (p) renderDetail(p);
      }
      render();

      toast(`購買成功！入手 ${snapshot.items.length} 件奢侈品。`, 'success');
      setTimeout(() => toast(`這筆 ${money(snapshot.total)} 本可幫助 ${snapshot.help.toLocaleString()} 位信眾。`, 'satire'), 700);

      // 自動收起結帳
      setTimeout(() => { closeCheckout(); }, 1700);
    }, 1400);
  }

  refs.comask.addEventListener('click', closeCheckout);

  /* ── 結帳爽動畫 ── */
  function playCheckoutFx() {
    const fx = document.createElement('div');
    fx.className = 'shop-fx';
    fx.innerHTML = '<div class="burst">🛍️</div>';
    const colors = ['#ee4d2d', '#ffd64d', '#26aa99', '#7a4ae0', '#ff8a3d'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'shop-confetti';
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = R(colors);
      c.style.animationDuration = `${(Math.random() * 1.2 + 1).toFixed(2)}s`;
      c.style.animationDelay = `${(Math.random() * 0.3).toFixed(2)}s`;
      fx.appendChild(c);
    }
    containerEl.appendChild(fx);
    if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
    setTimeout(() => fx.remove(), 2600);
  }

  function flashBalance() {
    refs.bal.classList.remove('flash');
    void refs.bal.offsetWidth;
    refs.bal.classList.add('flash');
  }
  function updateCash() { refs.bal.textContent = money(getSave().cash); }

  /* ── toast ── */
  function toast(text, kind = '') {
    const t = document.createElement('div');
    t.className = `shop-toast${kind ? ' ' + kind : ''}`;
    t.textContent = text;
    refs.toasts.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  /* ── 關閉 ── */
  q('.shop-close').addEventListener('click', () => {
    closeCart();
    if (co) closeCheckout();
    if (ui.detailId) closeDetail();
    onClose?.();
  });

  /* ── 初次渲染 ── */
  updateCash();
  updateCartBar();
  render();
}
