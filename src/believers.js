/**
 * 信眾名冊 — 一人一圖的固定角色。
 *
 * 每位都是寫好的角色：固定姓名、性別、年齡、人設、專屬圖、個人故事線。
 * 名字與圖 100% 對應，不會再男生叫女生名字。
 *
 * ── 缺圖怎麼補（給生圖 AI）──
 * 1. 角色的 img 指向 public/believers/<檔名>.jpg。
 * 2. 還沒生圖的角色 img:null，下面有 genPrompt（真實攝影風格提示詞）。
 *    把 genPrompt 丟給生圖 AI → 產出後存成對應檔名 → 回填 img 欄位即可。
 * 3. 統一規格：直式 3:4、單人全身或七分身、寫實攝影、台灣廟口/老街/香火實景。
 */

import { R, RI } from './content.js';

const P = (f) => (f ? `/believers/${f}` : null);

/* 共用提示詞前後綴：真實攝影、台灣傳統香火街景，製造反差 */
const STYLE = 'photorealistic editorial photography, 35mm, natural light, shallow depth of field, '
  + 'authentic Taiwan temple courtyard / old street with incense smoke, red lanterns, gold deity statues, '
  + 'portrait orientation 3:4, full or 3/4 body, single person, candid, film grain, no text';

export const CHARACTERS = [
  /* ── 既有圖：對上固定角色 ── */
  {
    id: 'student', name: '林佳穎', gender: 'female', age: 17, label: '高中生',
    img: P('student-1.webp'), hot: true, irreverent: 0.3,
    region: '板橋', mood: '放學後偷偷來', topic: '學業',
    genPrompt: `${STYLE}, Taiwanese high school girl in summer uniform, shy, holding folder, after school, temple`,
  },
  {
    id: 'y2k', name: '張memei', gender: 'female', age: 22, label: 'Y2K 辣妹',
    img: P('y2k-1.webp'), hot: true, irreverent: 0.45,
    region: '東區', mood: '穿搭先拍再說', topic: '感情',
    genPrompt: `${STYLE}, trendy Taiwanese girl in Y2K Korean streetwear, low-rise, tank top, dyed hair, posing for selfie at temple`,
  },
  {
    id: 'influencer', name: '心迪', gender: 'female', age: 26, label: '網美',
    img: P('influencer-1.webp'), hot: true, irreverent: 0.8,
    region: '信義', mood: '邊修圖邊問', topic: '財運',
    genPrompt: `${STYLE}, polished Taiwanese influencer, designer outfit, ring light vibe, holding phone gimbal, temple backdrop`,
  },
  {
    id: 'kgirl', name: '吳子瑄', gender: 'female', age: 24, label: '韓系正妹',
    img: P('kgirl-1.webp'), hot: true, irreverent: 0.25,
    region: '中和', mood: '想問又不敢', topic: '感情',
    genPrompt: `${STYLE}, refined Korean-style beauty, clean makeup, beige knit, delicate, standing among incense smoke, contrast of K-beauty in traditional Taiwan temple`,
  },
  {
    id: 'kgirl2', name: '蔡宜庭', gender: 'female', age: 27, label: '廟口正妹',
    img: P('kgirl-2.webp'), hot: true, irreverent: 0.3,
    region: '鹽水', mood: '朋友介紹來', topic: '家宅',
    genPrompt: `${STYLE}, pretty local Taiwanese woman, casual chic, warm smile, beside temple offering table`,
  },
  {
    id: 'ig', name: '薇朵', gender: 'female', age: 23, label: '限動姐',
    img: P('ig-1.webp'), hot: true, irreverent: 0.85,
    region: '西門', mood: '打卡中', topic: '人際',
    genPrompt: `${STYLE}, gen-z Taiwanese girl taking instagram story, peace sign, trendy, filters vibe, temple check-in`,
  },
  {
    id: 'auntie', name: '王秀琴', gender: 'female', age: 56, label: '鄉親阿姨',
    img: P('auntie-1.webp'), hot: false, irreverent: 0.15,
    region: '朴子', mood: '幫兒女問', topic: '家宅',
    genPrompt: `${STYLE}, middle-aged Taiwanese auntie, floral blouse, straw hat, devout, holding incense, rural temple`,
  },
  {
    id: '89', name: '陳冠霖', gender: 'male', age: 28, label: '8+9 哥',
    img: P('89-1.webp'), hot: false, irreverent: 0.7,
    region: '三重', mood: '袖子刺青露出來', topic: '討債',
    genPrompt: `${STYLE}, typical Taiwanese gang-style young man (8+9), super tight tank top, skinny build, slim pants, gold chain, half-sleeve tattoo, undercut spiky hair, slippers, cocky pose, temple`,
  },
  {
    id: '89b', name: '阿達', gender: 'male', age: 24, label: '8+9 典型',
    img: P('89-2.webp'), hot: false, irreverent: 0.85,
    region: '左營', mood: '兄弟在旁', topic: '財運',
    genPrompt: `${STYLE}, classic Taiwanese 8+9 youth, very tight shirt, scrawny, skinny jeans, thick gold necklace, half-body tattoo sleeve, A-zhi haircut, betel nut, betel-stained smile, swagger, temple front`,
  },
  {
    id: 'boss', name: '蘇文德', gender: 'male', age: 45, label: '地方角頭',
    img: P('boss-1.webp'), hot: false, irreverent: 0.5,
    region: '岡山', mood: '小弟在門口等', topic: '事業',
    genPrompt: `${STYLE}, local Taiwanese boss figure, polo shirt, gold watch, stern, hands behind back, henchman blurred behind, temple`,
  },
  {
    id: 'bro', name: '黃柏睿', gender: 'male', age: 25, label: '嘴砲青年',
    img: P('bro-1.webp'), hot: false, irreverent: 0.9,
    region: '新莊', mood: '被朋友拱來', topic: '感情',
    genPrompt: `${STYLE}, smug young Taiwanese guy, oversized tee, smirking, skeptical, arms crossed, temple`,
  },
  {
    id: 'elder', name: '李福伯', gender: 'male', age: 71, label: '阿公伯',
    img: P('elder-1.webp'), hot: false, irreverent: 0.1,
    region: '美濃', mood: '拿著筊杯', topic: '健康',
    genPrompt: `${STYLE}, elderly Taiwanese grandpa, plain shirt, weathered face, holding moon blocks (jiaobei), reverent, temple`,
  },

  /* ── 新增反差人設（缺圖：依 genPrompt 生圖後補 img） ── */
  {
    id: 'knet', name: '高雅琪', gender: 'female', age: 25, label: '精緻韓系網美',
    img: P('knet.webp'), hot: true, irreverent: 0.55,
    region: '大安', mood: '反差感拉滿', topic: '感情',
    genPrompt: `${STYLE}, ultra-refined Korean-style internet beauty, flawless glass skin makeup, designer beige coat, luxury bag, `
      + `standing elegantly amid heavy incense smoke and rows of red lanterns in an old Taiwanese temple — strong contrast of high-fashion K-beauty against folk religion grit`,
  },
  {
    id: 'jpgirl', name: '周詩涵', gender: 'female', age: 24, label: '日系雜誌感美女',
    img: P('jpgirl.webp'), hot: true, irreverent: 0.4,
    region: '永康', mood: '清新但虔誠', topic: '健康',
    genPrompt: `${STYLE}, Japanese magazine-style beauty (mori/clean aesthetic), soft natural makeup, linen dress, airy and fresh, `
      + `holding three incense sticks in a weathered traditional Taiwan temple, contrast of Japanese editorial freshness against old folk shrine`,
  },
  {
    id: '89c', name: '小馬', gender: 'male', age: 23, label: '典型 8+9',
    img: P('89c.webp'), hot: false, irreverent: 0.9,
    region: '蘆洲', mood: '檳榔配啤酒', topic: '訴訟',
    genPrompt: `${STYLE}, archetypal Taiwanese 8+9 youth, EXTREMELY tight muscle tank showing scrawny frame, super skinny legs, `
      + `tight skinny pants, heavy gold chains, full half-sleeve dragon tattoo, classic "A-zhi" mullet-undercut haircut, betel nut in mouth, gold-rimmed slippers, leaning on a scooter outside a temple, swagger and gold teeth`,
  },
  {
    id: 'streamer', name: '阿凱', gender: 'male', age: 27, label: '直播主',
    img: P('streamer.webp'), hot: false, irreverent: 0.8,
    region: '中壢', mood: '開著直播來', topic: '財運',
    genPrompt: `${STYLE}, Taiwanese live-streamer guy, holding phone on selfie stick with ring light, headset around neck, hyped expression, temple`,
  },
  {
    id: 'spiritgirl', name: '林沛蓁', gender: 'female', age: 21, label: '通靈少女',
    img: P('spiritgirl.webp'), hot: true, irreverent: 0.2,
    region: '北港', mood: '說看得到東西', topic: '家宅',
    genPrompt: `${STYLE}, ethereal young Taiwanese woman, pale, long black hair, white dress, mysterious calm gaze, dim temple interior with smoke`,
  },
  {
    id: 'councilor', name: '鄭明川', gender: 'male', age: 52, label: '地方議員',
    img: P('councilor.webp'), hot: false, irreverent: 0.45,
    region: '北區', mood: '帶著競選背心', topic: '事業',
    genPrompt: `${STYLE}, Taiwanese local councilor, campaign vest with sash, fake warm smile, shaking hands gesture, temple festival`,
  },
  {
    id: 'xishi', name: '謝佩芸', gender: 'female', age: 29, label: '檳榔西施',
    img: P('xishi.webp'), hot: true, irreverent: 0.6,
    region: '楊梅', mood: '剛下班順路', topic: '感情',
    genPrompt: `${STYLE}, Taiwanese betel-nut-stand beauty (binlang xishi) in glam outfit after shift, neon-lit vibe but now at a quiet temple at dusk, contrast`,
  },

  /* ════════ 隨名聲解鎖的更猛圈子（repReq 越高越晚出現，香火也越大）════════ */
  // ── tier 1（rep≥15）小有名氣：地方頭面人物 ──
  {
    id: 'liyoutube', name: '阿 ‍Ben', gender: 'male', age: 30, label: '百萬 YouTuber', repReq: 15,
    img: P('liyoutube.webp'), hot: false, irreverent: 0.7, region: '台北', mood: '想拍片蹭一波', topic: '事業',
    genPrompt: `${STYLE}, Taiwanese male YouTuber, hoodie + cap, holding vlog camera/gimbal, hyped influencer energy, at a temple to film content`,
  },
  {
    id: 'coser', name: '鈴鐺 Ringo', gender: 'female', age: 22, label: '人氣 Coser', repReq: 15,
    img: P('coser.webp'), hot: true, irreverent: 0.5, region: '板橋', mood: '出完場順道來', topic: '財運',
    genPrompt: `${STYLE}, Taiwanese cosplayer girl in elaborate anime costume + wig (out of place at a folk temple, strong contrast), holding prop weapon, cute, candid`,
  },
  {
    id: 'gymbro', name: '鋼鐵 Marco', gender: 'male', age: 31, label: '健身網紅', repReq: 15,
    img: P('gymbro.webp'), hot: false, irreverent: 0.6, region: '內湖', mood: '剛練完直接來', topic: '健康',
    genPrompt: `${STYLE}, heavily muscular Taiwanese fitness influencer, tight tank showing physique, protein shaker in hand, posing, at temple`,
  },
  // ── tier 2（rep≥30）廟口熟面孔：仕紳/小老闆 ──
  {
    id: 'factory', name: '黃董', gender: 'male', age: 54, label: '中小企業老闆', repReq: 30,
    img: P('factory.webp'), hot: false, irreverent: 0.4, region: '台中', mood: '為公司求運', topic: '事業',
    genPrompt: `${STYLE}, Taiwanese SME factory boss, polo shirt + gold watch, sturdy build, pragmatic, praying for business at temple`,
  },
  {
    id: 'doctor', name: '陳醫師', gender: 'female', age: 41, label: '醫美診所院長', repReq: 30,
    img: P('doctor.webp'), hot: true, irreverent: 0.3, region: '信義', mood: '低調來問', topic: '財運',
    genPrompt: `${STYLE}, elegant Taiwanese female aesthetic-clinic director, refined, designer coat, quietly at temple, upper-class poise`,
  },
  {
    id: 'realtor', name: '林總', gender: 'male', age: 38, label: '房仲天王', repReq: 30,
    img: P('realtor.webp'), hot: false, irreverent: 0.55, region: '新北', mood: '業績焦慮', topic: '財運',
    genPrompt: `${STYLE}, slick Taiwanese top real-estate agent, sharp suit, big confident smile, name-badge vibe, at temple praying for sales`,
  },
  // ── tier 3（rep≥45）小有名氣：藝人/民代 ──
  {
    id: 'idol', name: '凱亞', gender: 'female', age: 24, label: '當紅女偶像', repReq: 45,
    img: P('idol.webp'), hot: true, irreverent: 0.5, region: '台北', mood: '戴口罩低調來', topic: '事業',
    genPrompt: `${STYLE}, Taiwanese pop idol girl incognito (cap + mask pulled down), stylish, bodyguard blurred behind, sneaking into temple`,
  },
  {
    id: 'councilman2', name: '吳議員', gender: 'male', age: 49, label: '現任市議員', repReq: 45,
    img: P('councilman2.webp'), hot: false, irreverent: 0.5, region: '高雄', mood: '選情緊張', topic: '事業',
    genPrompt: `${STYLE}, Taiwanese city councilman, campaign vest + sash, shaking-hands politician smile, supporters blurred, at temple festival`,
  },
  {
    id: 'streamerqueen', name: '雪霏', gender: 'female', age: 26, label: '斗內女神主播', repReq: 45,
    img: P('streamerqueen.webp'), hot: true, irreverent: 0.75, region: '台北', mood: '開實況來', topic: '財運',
    genPrompt: `${STYLE}, Taiwanese live-stream goddess, glamorous, ring light + phone on stand, lots of makeup, working the camera at temple`,
  },
  // ── tier 4（rep≥60）地方名師：權貴 ──
  {
    id: 'legislator', name: '高委員', gender: 'male', age: 57, label: '立法委員', repReq: 60,
    img: P('legislator.webp'), hot: false, irreverent: 0.45, region: '台北', mood: '帶隨扈來', topic: '訴訟',
    genPrompt: `${STYLE}, senior Taiwanese legislator, dark suit, dignified but cunning, aides/bodyguards blurred behind, at temple`,
  },
  {
    id: 'tycoonwife', name: '貴婦 Jessica', gender: 'female', age: 45, label: '貴婦團團長', repReq: 60,
    img: P('tycoonwife.webp'), hot: true, irreverent: 0.6, region: '天母', mood: '帶名牌包來', topic: '感情',
    genPrompt: `${STYLE}, ultra-wealthy Taiwanese socialite lady, head-to-toe luxury brands, Hermès bag, diamonds, haughty elegance, at temple`,
  },
  {
    id: 'gangboss', name: '龍哥', gender: 'male', age: 50, label: '角頭堂主', repReq: 60,
    img: P('gangboss.webp'), hot: false, irreverent: 0.5, region: '艋舺', mood: '一群小弟簇擁', topic: '討債',
    genPrompt: `${STYLE}, intimidating Taiwanese gang elder boss (tangzhu), floral shirt, heavy gold, full tattoos, calm menace, henchmen blurred, at temple`,
  },
  // ── tier 5（rep≥75）全國知名：頂層 ──
  {
    id: 'mayor', name: '市長', gender: 'male', age: 58, label: '直轄市長', repReq: 75,
    img: P('mayor.webp'), hot: false, irreverent: 0.4, region: '台北', mood: '微服私訪', topic: '事業',
    genPrompt: `${STYLE}, Taiwanese big-city mayor, crisp suit, charismatic public-figure smile, media/aides blurred behind, visiting temple`,
  },
  {
    id: 'conglomerate', name: '蔡總裁', gender: 'male', age: 63, label: '財團總裁', repReq: 75,
    img: P('conglomerate.webp'), hot: false, irreverent: 0.35, region: '台北', mood: '搭名車來', topic: '財運',
    genPrompt: `${STYLE}, elderly Taiwanese conglomerate chairman, impeccable tailored suit, quiet immense power, luxury sedan + driver blurred, at temple`,
  },
  {
    id: 'superstar', name: '天王 林帝', gender: 'male', age: 40, label: '華語天王', repReq: 75,
    img: P('superstar.webp'), hot: false, irreverent: 0.5, region: '台北', mood: '全程戴墨鏡', topic: '感情',
    genPrompt: `${STYLE}, Taiwanese mega pop superstar, sunglasses + designer streetwear, effortless cool, fans/security blurred, slipping into temple`,
  },
];

/* 缺圖 fallback：暫時借用同性別已有圖的角色，避免破圖（補圖後自然消失） */
const FALLBACK_BY_GENDER = {
  female: CHARACTERS.find((c) => c.gender === 'female' && c.img)?.img,
  male: CHARACTERS.find((c) => c.gender === 'male' && c.img)?.img,
};

export function characterToBeliever(c) {
  return {
    cid: c.id,
    name: c.name,
    gender: c.gender,
    age: c.age,
    region: c.region,
    tag: c.topic,
    mood: c.mood,
    archetypeLabel: c.label,
    portrait: c.img ?? FALLBACK_BY_GENDER[c.gender] ?? P('elder-1.webp'),
    hasImage: !!c.img,
    hot: c.hot,
    irreverent: c.irreverent,
    fixed: true,
  };
}

/**
 * 本場名冊：只用固定角色（不再有路人）。隨名聲解鎖更猛圈子。
 * - 只排「名聲達標(repReq)且尚未結局」的角色。
 * - 已結局者退場（收藏在功德堂）。
 * @param n 想要的人數
 * @param resolvedIds Set<cid> 已有結局、應退場的角色
 * @param rep 目前名聲（解鎖更高 tier 角色）
 */
export function genRoster(n, resolvedIds = new Set(), rep = 0) {
  const available = CHARACTERS.filter((c) => !resolvedIds.has(c.id) && (c.repReq || 0) <= rep);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const out = shuffled.slice(0, n).map(characterToBeliever);
  // 若達標角色不夠（都結局了），放寬：再收尚未結局、但名聲略高一階的角色，確保有人可問
  if (out.length < n) {
    const more = CHARACTERS.filter((c) => !resolvedIds.has(c.id) && !out.some((o) => o.cid === c.id))
      .sort((a, b) => (a.repReq || 0) - (b.repReq || 0));
    for (const c of more) { if (out.length >= n) break; out.push(characterToBeliever(c)); }
  }
  return out.sort(() => Math.random() - 0.5);
}

/* 相容舊呼叫 */
export function genBeliever() {
  return characterToBeliever(R(CHARACTERS));
}

/* 給工具：列出缺圖角色與其生圖提示詞 */
export function missingImagePrompts() {
  return CHARACTERS.filter((c) => !c.img).map((c) => ({ id: c.id, name: c.name, label: c.label, file: `${c.id}.webp`, prompt: c.genPrompt }));
}
