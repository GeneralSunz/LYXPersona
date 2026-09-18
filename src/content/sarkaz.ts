/* ═══════════════════════════════════════════════════════════════
   集成战略「萨卡兹的无终奇语」原文语料
   ───────────────────────────────────────────────────────────────
   全部条目均为**逐字原文**，未作任何改写、润色或翻译。
   引用一律通过本模块取值，组件里不要内联这些字符串，
   以免日后被无意改动（"可以编排，不能篡改"）。

   出处：
     [主] PRTS《萨卡兹的无终奇语》wikitext（活动信息 / 分队 / 区域 / 机制）
     [讲] PRTS《萨卡兹的无终奇语/讲述者列表》
     [档] PRTS《萨卡兹的无终奇语/巫仪档案库》（虚构展览 / 预言诗篇 / 探索情报板）
     [图] PRTS《萨卡兹的无终奇语/想象实体图鉴》（收藏品描述）
     [事] PRTS《萨卡兹的无终奇语/事件一览》
     [专] 官方主题专题页 https://ak.hypergryph.com/is/furnacesidefables
   ═══════════════════════════════════════════════════════════════ */

/** 主题正名与官方副标题 —— [主] 活动信息 */
export const THEME = {
  /**
   * 名称缩短 —— 已不用于页面主标题（全站名称统一为「熔炉档案馆」，
   * 取值见 profile.ts 的 ARCHIVE.name），保留在此仅作语料与出处对照。
   */
  name: '萨卡兹的无终奇语',
  /** 副标题 —— 首屏版记行的左侧小字 */
  subtitle: "SARKAZ'S FURNACE SIDE FABLES",
  /**
   * 官方主题简介 —— [主] 页首 {{Cquote}}，原文即三行诗排。
   * ⚠ 按用户要求已从首屏撤下，保留原文以备再次启用；
   *   恢复时只需在 DownloadPage 的 header 内重新渲染这三行。
   */
  intro: [
    '死魂灵的声音将你引离现实。',
    '一场仪式，一场沟通。',
    '超脱大地的畅想即将开始。',
  ],
  /**
   * 预言诗篇（节选） —— [档] 预言诗篇 → Ending 03：天使之城 → PART 4「在救赎之门」。
   * 原文共四行，此处照录前两行（编排保留，字面不动）：
   * 第三行「我见你，头顶黑冠，将千万生灵，熬成回忆。」
   * 第四行「我见魔王，将所有种群，尽数奴役。」
   *
   * ⚠ 易错点：是「遍布大地」不是「布满大地」；
   *    两行各自以「。」收尾，原文并非用「；」连成一句。
   */
  prophecy: [
    '我见诸城，满目疮痍。',
    '我见源石，遍布大地。',
  ],
  /** 预言诗篇的档案编号 —— [图] 收藏品 No.253「预言显像」亦引此诗 */
  prophecyLabel: '预言诗篇',
  /** 蚀刻章套组总述 —— [主] 蚀刻章（用作页脚落款） */
  sealSummary: '想象吧，讲述吧。最好的未来，从不在他人之口。',
} as const

/**
 * 「故事的引言」—— [档] 探索情报板。
 * 档案库为空的空态正是这段话的处境：白纸尚未落笔。
 */
export const HISTORY_PREFACE = {
  label: '故事的引言 · 探索情报板',
  lines: [
    '死魂灵为萨卡兹铺下了一张白纸。',
    '过去、当下与未来，尚无人书写。',
    '笔墨交付于有形的同族，任他们发挥想象。',
    '究竟怎样的故事，才能安抚死魂灵那愤怒的灵魂？',
  ],
} as const

/**
 * 官方主题专题页的八个功能分区名 —— [主] 页首 popup 原文 / [专]。
 * 分区名归官方；站内只是借它当版记标签。
 */
export const PLATE_SECTIONS = [
  { name: '缔铃记事', use: '本主题的活动记录' },
  { name: '探明去路', use: '路径与检索' },
  { name: '旧乡晶尘', use: '数据统计' },
  { name: '笞心钥索', use: '特别小游戏' },
  { name: '空思白念', use: '影像信息' },
  { name: '仇人腥血', use: '敌方单位' },
  { name: '无名图腾', use: '收藏品信息' },
  { name: '箱底祭器', use: '区域信息' },
] as const

/**
 * 「戛然而止」—— 探索中断界面 —— [主] 各层区域模板的 lose 块。
 */
export const BROKEN_OFF = {
  title: '戛然而止',
  subtitle: 'A Sudden Loss for Words',
} as const

/** 各层的收束语 —— [主] 区域模板 lose 块 */
export const LOSS_LINES: Record<string, string> = {
  诡谲断章: '水面随着思绪融化产生的波纹摊开，边界再一次得到了扩展。',
  熔魂之始: '看来，你与萨卡兹的先辈同样眷恋熔炉的温暖，你们远离了幻景，进入了梦乡。',
  锻铁根须: '每一根管道都仿佛分叉成了三根，而后又首尾相连，你失去了描述它们的言语。',
  灰铸迷城: '那城市//残骸//宫殿//村庄拒绝了你，不再因你的劝解而发生改变。',
  或然歧域: '你跨越了一道又一道界线，选择了一座又一座卡兹戴尔，它们全都收留了你。',
  虚实疆界: '回来。',
  辉光天顶: '你倒在了真相之前，真相的阻力是如此巨大，你只能逃回了真相。',
  逍遥兰若: '“莲瓣入水而不苦根茎，勿执着。”',
  无终安息: '“炉熄之声后，讲述者缄默不言。”',
}

export interface Floor {
  /** 层级记号 —— 罗马数字 / Ω */
  mark: string
  /** 层级名 */
  name: string
  /** 层级题词（含"第N句。"前缀，逐字原文） */
  line: string
  /**
   * 层级色 —— 取自 [主] 各层标题的官方配色（PRTS 区域模板的
   * background / linear-gradient 端点）。饱和度过高的层色只用于
   * 记号与细线，避免破坏整体的哑光底子。
   */
  color: string
}

/**
 * 层级序列 —— [主]「开始探索」各层。
 * 顺序即探索顺序，用来把"卷宗层数"映射成"熔炉层数"。
 */
export const FLOORS: Floor[] = [
  {
    mark: 'Ⅰ',
    name: '熔魂之始',
    line: '第一句。熟悉的温度消失在黑暗中，现实在每个转角处受到削弱。',
    color: '#BB9C6A',
  },
  {
    mark: 'Ⅱ',
    name: '锻铁根须',
    line: '第二行。蜿蜒盘桓的过去连接着素未谋面的未来，想象的芽孢在每根管道中生长。',
    color: '#5D7289',
  },
  {
    mark: 'Ⅲ',
    name: '灰铸迷城',
    line: '第三段。你认识这城市//残骸//宫殿//村庄吗？',
    color: '#1E006A',
  },
  {
    mark: 'Ⅳ',
    name: '或然歧域',
    line: '第四节。想象至臻完美，卡兹戴尔丰满且虚无，它贪婪地想要更多，全然不顾界域将至。',
    color: '#931C22',
  },
  {
    mark: 'Ⅴ',
    name: '虚实疆界',
    line: '第五章。终结是撕裂，统一是撕裂，稳定是撕裂，颠覆常理是通往新章的必经之路。',
    color: '#831409',
  },
  {
    mark: 'Ⅵ',
    name: '辉光天顶',
    line: '第六篇。新生后的超然想象就在眼前，意料之外，情理之中。接受诅咒//祝福吧。',
    color: '#BFAA2A',
  },
]

/** 越界坠落处 —— [主] 第Ω层 无终安息 */
export const FLOOR_OMEGA: Floor = {
  mark: 'Ω',
  name: '无终安息',
  line: '最终篇。每个故事都在此处停滞。眼前光芒渐暗，耳旁熔炉声熄。',
  color: '#CD282C',
}

/** 隐藏层 —— [主] 诡谲断章（检索态借用它的题词） */
export const FLOOR_INTERLUDE: Floor = {
  mark: '‽',
  name: '诡谲断章',
  line: '脚注。记录的历史总是希冀故事的补充，像水面渴望被倒影充满。',
  color: '#6F5A9E',
}

/**
 * 把"进入卷宗的层数"映射为熔炉层级。
 * depth 从 1 起算（进入第一个卷宗即第Ⅰ层「熔魂之始」）。
 */
export function floorForDepth(depth: number): Floor {
  if (depth <= 0) return FLOORS[0]
  return FLOORS[depth - 1] ?? FLOOR_OMEGA
}

/** 空态与检索态的版记注脚 —— 文案全部为官方原文 */
export const STATE_NOTES = {
  empty: {
    title: '尚无档案',
    source: '故事的引言 · 探索情报板',
    en: '',
    line: '过去、当下与未来，尚无人书写。',
  },
  search: {
    title: '未寻得对应档案',
    source: '探明去路 · 锻铁根须 · 戛然而止',
    en: '',
    line: LOSS_LINES['锻铁根须'],
  },
  error: {
    title: '档案库连接失败',
    source: `戛然而止 · ${FLOOR_OMEGA.name}`,
    en: BROKEN_OFF.subtitle,
    line: LOSS_LINES[FLOOR_OMEGA.name],
  },
} as const

/**
 * 讲述者 —— [讲] 八位讲述者的英文篇名与中文题记，逐字原文。
 */
export const NARRATORS = [
  { name: '妮芙', en: 'Everyday New Ideas', line: '有的人称之为叛逆，可尝试总是叛逆的。' },
  { name: '泥岩', en: 'Bring Me to Kazdel', line: '她乐于助人，并不会去计数，也不会太在意帮助了谁。' },
  { name: '锡人', en: 'Early Debriefing', line: '在回归途中，锡人被梅兰德基金会的同事拦住了。' },
  { name: '魔王', en: 'Poems of The Non-Tuned Echo', line: '在年代的尽头，她决定将一段独一无二的诗占为己有。' },
  { name: '截云', en: 'Leave Thy Root Behind', line: '截云踏上了一条通往那伽腊迦师坻耶的路。' },
  { name: '逻各斯', en: 'Rhythm between Death and Life', line: '跨越死与生的桥梁。' },
  {
    name: '史尔特尔',
    en: 'the end of the wrong path',
    line: '通往故乡的步伐，也是远离故乡的步伐。远离故乡的步伐，也是通往故乡的步伐。',
  },
  {
    name: '阿米娅',
    en: 'Contact',
    line: '熔炉中的故事纷纷迎来结局，你会是炉熄之后“阿米娅”想要寻找的事物吗？',
  },
] as const

/**
 * 格言轮换池 —— 全部逐字原文。
 * 只收短句：统计栏是一条窄版记，宁可少收一句，也不截断任何原文。
 */
export const QUOTES: { text: string; source: string }[] = [
  { text: '没有终点，只有未来', source: '史尔特尔' },
  // 「身居此位者」三连，出自同一组收藏品
  { text: '身居此位者，抗争便会陨落。', source: '收藏品 · 魔王的旗帜' },
  { text: '身居此位者，安睡即为永眠。', source: '收藏品 · 魔王的床榻' },
  { text: '身居此位者，兴盛仅是泡影。', source: '收藏品 · 魔王的祭器' },
  { text: '王各有命，形亦不同。', source: '收藏品 · 王命凡形' },
  { text: '谁来审判？', source: '收藏品 · 迷迭香之拥' },
  { text: '里面有你认识的人吗？', source: '收藏品 · 残破合影' },
  { text: '不要问。就当为了你自己好。', source: '收藏品 · 未知仪器' },
  { text: '是你滋养她，还是她守护你？', source: '收藏品 · 活玫瑰' },
  { text: '唤醒律法的第一声狂嚎。', source: '收藏品 · 时与光' },
  { text: '“酣然失千山，万物得其灵。”', source: '收藏品 · 散轶诗简' },
  { text: '讲述？还是预测？', source: '妮芙' },
  { text: '需要想象力才能到达的起点', source: '史尔特尔' },
  { text: '生命最初的咆哮', source: '逻各斯' },
  { text: '你是谁？', source: '阿米娅' },
  { text: '你我之间并不遥远', source: '阿米娅' },
  { text: '总有意义从虚无中诞生。', source: '阿米娅' },
  { text: '想象力，发挥你的想象力。', source: '史尔特尔' },
  { text: '抉择就在眼前，结果早已注定。', source: '命运所指' },
  { text: '思维创造的祭品，必将由言语奉上。', source: '界面主题「词祭」' },
]

/** 游戏结局 —— [主] 结局块（中文名 / 英文名逐字原文） */
export const ENDINGS = [
  { zh: '憧憬未来', en: 'THE END?' },
  { zh: '双王记', en: 'TWIN CROWNS' },
  { zh: '天使之城', en: 'CITY OF ANGELS' },
  { zh: '遁入阇那', en: 'WISDOM OF KAŚJÑĀNA' },
  { zh: '无瑕之日', en: 'IMPECCABLE DAY' },
] as const

/** 初始状态值 —— [主]「开始探索」初始状态值表 */
export const INITIAL_STATS = [
  { label: '目标生命值', value: 8 },
  { label: '希望', value: 6 },
  { label: '源石锭', value: 6 },
  { label: '可携带干员数', value: 6 },
] as const
