/* ═══════════════════════════════════════════════════════════════
   个人卷宗 —— 数据层
   ───────────────────────────────────────────────────────────────
   全站（个人主页 / A4 简历 / 生成的 PDF）都只从这一个文件取值。
   要改成你自己的信息，只改这里，别去动组件。

   标注 [待确认] 的字段是照参考图抄录的，请核对后替换。
   ═══════════════════════════════════════════════════════════════ */

export type AwardTier = 'international' | 'national' | 'provincial' | 'school' | 'none'

export interface Award {
  /** 参赛年月，格式 YYYY.MM —— 时间轴的排序依据 */
  date: string
  /** 赛事名称 */
  contest: string
  /** 作品／论文中文题目。留空则只显示赛事名 */
  work: string
  /** 作品英文题目（美赛等）。与 work 二选一或并存 */
  workEn: string
  /**
   * 奖项等级，**可以有多个** —— 同一赛事既拿国奖又拿省奖是常态
   * （如数据要素大赛同时拿了全国一等奖与湖南省赛区一等奖）。
   * 留空数组表示该项暂无奖项记录，版面会留白而不编造。
   */
  levels: string[]
  /** 归色依据：取所获最高等级 */
  tier: AwardTier
}

export interface Project {
  /** 时间 YYYY.MM。留空则卡片不显示日期 */
  date: string
  /** 项目／作品名称 */
  title: string
  /** 所属计划、赛事或平台 */
  program: string
  /** 级别或角色，如「国家级立项」「省级立项 · 负责人」 */
  level: string
}

/** 技能栈分组：一组一个熟练度标签 */
export interface SkillGroup {
  /** 熟练度标签，如「精通」 */
  label: string
  /** 该档下的工具／语言 */
  items: string[]
}

/** 语言或技能认证 */
export interface Cert {
  label: string
  value: string
}

/** 单门课程成绩，用于成绩条形图 */
export interface Course {
  name: string
  score: number
  /** 归类，用于分组显示 */
  group: '数学基础' | '经济学' | '工具与软件'
}

export interface Photo {
  /** 图片路径，放在 public/photos/ 下 */
  src: string
  /** 无障碍替代文本 */
  alt: string
  /** 版记说明 */
  caption: string
  /** 拉丁编号 */
  code: string
}

export const PROFILE = {
  /* ── 身份 ── */
  name: '雷钰轩',
  nameEn: 'LEI YUXUAN',
  /** 卷宗编号 —— 纯装饰，可随意改 */
  archiveNo: 'No. 2024-HNU-0371',
  /** 座右铭（中文）—— 首屏与简历抬头各一处 */
  tagline: '我于此言语',
  /** 座右铭的英文对照，与中文成对出现 */
  taglineEn: 'Thus I Speak',
  /** 一句话自述 —— 首屏副文，一两句即可 */
  intro:
    '统计学类在读本科生，习惯把不确定的问题拆成可度量的变量。' +
    '相信模型的价值不在纸面，而在能否解释一个真实世界的抖动。',

  /* ── 基本信息 ── */
  gender: '男', // [待确认]
  politicalStatus: '中共预备党员', // [待确认]
  school: '湖南大学', // [待确认]
  college: '金融与统计学院', // [待确认]
  major: '统计学类', // [待确认]
  grade: '2024 级本科生', // [待确认]

  /* ── 联系方式 ──
     对外联络只走邮箱这一条通道。 */
  email: '296266488@qq.com', // [待确认]

  /* ── 学业表现 ──
     按用户要求**只展示这两项**。入校总排名与学期进步幅度已撤下，
     全站任何位置都不再出现这两个数。 */
  academics: {
    /** 专业成绩绩点 */
    gpa: '3.98',
    /** 专业成绩排名 */
    majorRank: '第 2',
  },

  /* ── 竞赛获奖 ──
     按时间升序排列，界面按年份自动分组画成时间轴，不必手工分组。
     ⚠ 作品题目里的中英混排已按中文排版惯例加空格（LED / STATA / MathorCup 等），
       改文案时请沿用，否则时间轴右端的排版会不齐。 */
  awards: [
    {
      date: '2025.01',
      contest: '美国大学生数学建模大赛',
      work: '',
      workEn: 'Models for Olympic Medal Tables',
      levels: ['S 奖'],
      tier: 'international',
    },
    {
      date: '2025.04',
      contest: '全国大学生统计建模大赛 · 经济计量与 STATA 应用课程论文',
      work: '数据要素市场化下数字化转型的人力资本路径——来自资产周转效率的证据',
      workEn: '',
      levels: ['校级二等奖'],
      tier: 'school',
    },
    {
      date: '2025.08',
      contest: '华数杯数学建模竞赛',
      work: '可调控生物节律的 LED 光源研究',
      workEn: '',
      levels: ['全国二等奖'],
      tier: 'national',
    },
    {
      date: '2025.09',
      contest: '高教社杯数学建模竞赛',
      work: '烟幕干扰弹的投放策略',
      workEn: '',
      levels: [], // [待填] 原稿未标注奖项，暂留空
      tier: 'none',
    },
    {
      date: '2025.12',
      contest: '全国大学生数据要素素质大赛',
      work: '防疫先锋——基于多模态机器学习模型的基孔肯雅热防疫舆情预警系统',
      workEn: '',
      levels: ['全国一等奖', '湖南省赛区一等奖'],
      tier: 'national',
    },
    {
      date: '2026.01',
      contest: '美国大学生数学建模大赛',
      work: '',
      workEn: 'Data With The Stars',
      levels: ['S 奖'],
      tier: 'international',
    },
    {
      date: '2026.03',
      contest: '正大杯全国大学生市场调查大赛',
      work: '承朱张之绪，起文脉新声——文化空间视域下岳麓书院数智化转型路径探究',
      workEn: '',
      levels: ['湖南赛区一等奖'],
      tier: 'provincial',
    },
    {
      date: '2026.04',
      contest: 'MathorCup 数学应用挑战赛',
      work: '中老年人群高血脂症的风险预警及干预方案优化',
      workEn: '',
      levels: ['全国二等奖'],
      tier: 'national',
    },
    {
      date: '2026.06',
      contest: '全国大学生统计建模大赛',
      work: '寻“稳”知危：面向老年跌倒预警的注意力增强深度时序建模',
      workEn: '',
      levels: ['湖南赛区二等奖'],
      tier: 'provincial',
    },
    {
      date: '2026.08',
      contest: '华数杯数学建模竞赛',
      work: '基于 B*-Tree 与模拟退火的超大规模集成电路布图规划设计',
      workEn: '',
      levels: ['全国一等奖'],
      tier: 'national',
    },
  ] as Award[],

  /* ── 创新项目与学术活动 ──
     大创三项 + 两个黑客松项目，按时间升序。 */
  projects: [
    {
      date: '2025.06',
      title: '多层政策对企业绿算转型的影响——来自东数西算与省域政策的证据',
      program: '大学生创新训练计划',
      level: '国家级立项',
    },
    {
      date: '2025.06',
      title: '文化空间视域下岳麓书院数智化转型路径探究',
      program: '大学生创新训练计划',
      level: '省级立项 · 负责人',
    },
    {
      date: '2025.06',
      title: '基于多模态机器学习模型的基孔肯雅热防疫舆情预警系统',
      program: '大学生创新训练计划',
      level: '省级立项',
    },
    {
      date: '2025.12',
      title: '“心语 · 阅界”智能 AI 情感交互系统',
      program: '岳麓书院黑客松',
      level: '参赛项目',
    },
    {
      date: '2026.05',
      title: '“知视”情感交互系统',
      program: '抖音创变计划黑客松 · 湖南大学站',
      level: '参赛项目',
    },
  ] as Project[],

  /* ── 组织与领导 ── */
  leadership: [
    {
      org: '湖南大学数学建模协会',
      role: '学术二部部长',
      desc: '主导组织「湖南大学第四届数学建模」相关活动，负责学术内容策划与现场组织。',
    },
  ],

  /* ── 技能与工具栈 ──
     一组一个熟练度档，界面按档渲染成一行。 */
  skills: [
    { label: '精通', items: ['R', 'LaTeX'] },
    { label: '熟练掌握', items: ['Python', 'MATLAB', 'Stata'] },
  ] as SkillGroup[],

  /** 语言与技能认证 */
  certs: [
    { label: 'CET-4', value: '606' },
    { label: 'CET-6', value: '559' },
  ] as Cert[],

  /* ── 核心课程成绩 ──
     用于成绩条形图。score 按 0–100 归一化成条长，
     因此高分段的差异不会被夸大（93 与 100 的条长就是真实差距）。 */
  courses: [
    { name: '数学分析 BI', score: 100, group: '数学基础' },
    { name: '数学分析 BII', score: 92, group: '数学基础' },
    { name: '数学分析 BIII', score: 97, group: '数学基础' },
    { name: '高等代数 B', score: 99, group: '数学基础' },
    { name: '概率论', score: 97, group: '数学基础' },
    { name: '数理统计', score: 97, group: '数学基础' },
    { name: '微观经济学', score: 95, group: '经济学' },
    { name: '宏观经济学', score: 94, group: '经济学' },
    { name: '计量经济学', score: 97, group: '经济学' },
    { name: '统计软件 R', score: 95, group: '工具与软件' },
  ] as Course[],

  /* ── 个人特质 ── */
  traits: [
    // 第 1 条原带具体排名与进步幅度，那些数字已按要求只保留在 Ⅱ 学业表现，
    // 这里改为不带数字的表述，避免两处重复。
    { title: '学习与进步能力', desc: '专业课成绩稳定在高分段，习惯把新方法快速消化并落到实操里。' },
    { title: '数据敏感度', desc: '长期投入统计建模与数据要素类竞赛，习惯用数据说话。' },
    { title: '组织与表达', desc: '在协会与工作坊承担主讲与组织角色，能把复杂问题讲清楚。' },
  ],

  /* ── 三张照片 ──
     把真实照片放进 public/photos/，保持文件名不变即可自动生效。
     尺寸建议：portrait 竖向 3:4（≥ 900×1200），two 张横幅 4:3（≥ 1200×900）。 */
  photos: {
    /** ① 首屏主肖像 */
    portrait: {
      src: '/photos/portrait.jpg',
      alt: '雷钰轩的个人肖像照',
      caption: '个人肖像',
      code: 'PLATE I',
    } as Photo,
    /** ② 竞赛 / 活动现场 */
    activity: {
      src: '/photos/activity.jpg',
      alt: '参加学科竞赛的现场照片',
      caption: '竞赛现场',
      code: 'PLATE II',
    } as Photo,
    /** ③ 学习 / 实践场景 */
    study: {
      src: '/photos/study.jpg',
      alt: '学习与实践场景照片',
      caption: '实践记录',
      code: 'PLATE III',
    } as Photo,
  },
} as const

/** 导航分区 —— 顺序即页面顺序，罗马记号沿用「熔炉层级」的编号法 */
export const SECTIONS = [
  { id: 'about', mark: 'Ⅰ', title: '卷宗概述', en: 'DOSSIER' },
  { id: 'education', mark: 'Ⅱ', title: '教育背景', en: 'EDUCATION' },
  { id: 'awards', mark: 'Ⅲ', title: '竞赛荣誉', en: 'HONOURS' },
  { id: 'projects', mark: 'Ⅳ', title: '创新项目', en: 'PROJECTS' },
  { id: 'leadership', mark: 'Ⅴ', title: '组织与领导', en: 'LEADERSHIP' },
  { id: 'skills', mark: 'Ⅵ', title: '技能与课程', en: 'SKILLS' },
  { id: 'traits', mark: 'Ⅶ', title: '个人特质', en: 'TRAITS' },
  { id: 'contact', mark: 'Ⅷ', title: '联络与档案', en: 'CONTACT' },
] as const

/* ═══════════════════════════════════════════════════════════════
   教育经历 —— 四段
   ───────────────────────────────────────────────────────────────
   格式：小学(6) → 初中(3) → 高中(3) → 本科(在读)

   ⚠ 前三个学段的 school / period / note 刻意留空字符串，
     页面会渲染成「待填」占位版记 —— 版面已经定好，你只管往这里填字，
     不需要动任何组件。填完执行 npm run pdf && git push 即可。
   ═══════════════════════════════════════════════════════════════ */

export interface EducationStage {
  /** 学段名 */
  stage: string
  /** 起止年份 —— 显示在学段名下方 */
  period: string
  /** 学校名称 */
  school: string
  /** 一句话说明（成绩 / 职务 / 值得一提的事）。留空则整行不渲染 */
  note: string
}

export const EDUCATION: EducationStage[] = [
  {
    stage: '小学',
    period: '2012.09 — 2018.08',
    school: '成都市温江区东大街第二小学',
    note: '',
  },
  {
    stage: '初中',
    period: '2018.09 — 2021.08',
    school: '成都新世纪外国语学校',
    note: '',
  },
  {
    stage: '高中',
    period: '2021.09 — 2024.08',
    school: '成都树德中学',
    note: '',
  },
  {
    stage: '本科',
    period: '2024.09 — 至今',
    school: '湖南大学', // [待确认]
    note: '金融与统计学院 · 统计学类',
  },
]

/**
 * 子界面：熔炉档案馆（= 个人资料库）
 * ───────────────────────────────────────────────────────────────
 * ⚠ 命名上的一个坑：「熔炉档案馆」是游戏语汇里的名字，**好看但不解释任何事**。
 *   第一次来的人看到「ENTER 熔炉档案馆」很可能以为是游戏 wiki 之类的东西。
 *   所以凡是露出这个名字的地方，都必须同时给出 plainName / summary，
 *   让"这是什么"由功能正名来承担，而不是靠访客猜。
 */
export const ARCHIVE = {
  path: '/archive',
  /** 意象名 —— 用作品牌，不承担解释责任 */
  name: '熔炉档案馆',
  en: 'FURNACE ARCHIVE',
  /** 功能正名：一眼看懂这是什么 */
  plainName: '个人资料库',
  /** 英文功能正名 */
  plainEn: 'PERSONAL DATA VAULT',
  /** 一句话说明，跟在名字旁边；大白话，不用意象 */
  summary: '课程资料、竞赛文档与项目文件的在线归档。可浏览、可检索、可直接下载。',
  /**
   * 更完整的一段，放在档案馆内页顶部的说明版记里。
   * ⚠ 用**第一人称**：档案馆是"我的库房"，不是别人给我写的介绍。
   */
  intro:
    '这里存放我自己的课程资料、竞赛文档与项目文件，按卷宗分层归档，' +
    '可直接在线浏览与下载。想了解我，请回个人主页。',
  /** 入口卡上的角色定位 */
  note: '个人资料库 · 子界面',
} as const

/**
 * 简历 PDF 的公开路径（由 `npm run pdf` 生成到 public/ 下）。
 * 刻意用 ASCII 文件名：中文名在 URL 与 CDN 上容易踩编码坑；
 * 下载时靠 <a download="雷钰轩-简历.pdf"> 把中文名还原给用户。
 */
export const RESUME_PDF = '/resume.pdf'

/** 下载时呈现给用户的文件名 */
export const RESUME_DOWNLOAD_NAME = '雷钰轩-简历.pdf'
