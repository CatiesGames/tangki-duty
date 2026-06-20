/**
 * 乩der 交友對話資料 — 關係養成式（好感 0→100 分四階段）。
 *
 * 每個角色：stages[4]（初認識/聊得來/曖昧中/快在一起），各 stage：
 *   them[]  對方主動說的話池（hub.js pickUnseen 輪流抽、不重複優先 → 可聊 100+ 來回）
 *   opts[]  你的回法 [{ label, aff(好感增減), cost?, gift?{test,need} }]
 * partner[] 在一起後的日常訊息池；partnerOpts[] 伴侶回法；confessLine 告白成功對方說的話。
 *
 * 諷刺基調：玩家假裝「金乩國際執行長」、絕不透露乩身；對方就算認真也愛奢侈品。
 * 句句不提詐騙。內容由 subagent 依各角色人設/類型批次產出。
 */
import { CONVO_A } from './convo/a.js';
import { CONVO_B } from './convo/b.js';
import { CONVO_C } from './convo/c.js';
import { CONVO_D } from './convo/d.js';
import { PCHAT_A } from './convo/pa.js';
import { PCHAT_B } from './convo/pb.js';
import { PCHAT_C } from './convo/pc.js';
import { PCHAT_D } from './convo/pd.js';

export const CONVOS = { ...CONVO_A, ...CONVO_B, ...CONVO_C, ...CONVO_D };

/* 把「交往後日常聊天話題包」併進各角色 convo 的 partnerChats */
const PCHATS = { ...PCHAT_A, ...PCHAT_B, ...PCHAT_C, ...PCHAT_D };
for (const [id, list] of Object.entries(PCHATS)) {
  if (CONVOS[id]) CONVOS[id].partnerChats = list;
}
