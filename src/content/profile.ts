/* ═══════════════════════════════════════════════════════════════
   个人卷宗 —— 数据层
   ───────────────────────────────────────────────────────────────
   全站（个人主页 / A4 简历 / 生成的 PDF）都只从这一个文件取值。
   要改成你自己的信息，只改这里，别去动组件。

   标注 [待确认] 的字段是照参考图抄录的，请核对后替换。
   ═══════════════════════════════════════════════════════════════ */

export interface Award {
  /** 赛事名称 */
  name: string
  /** 奖项等级，用作徽记 */
  level: string
  /** 归色：决定徽记配色 */
  tier: 'international' | 'national' | 'provincial' | 'school'
  /** 年份 */
  year: string
}

export interface Project {
  title: string
  role: string
  desc: string
  tags: string[]
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
  /** 座右铭 / 副题 */
  tagline: '数据探索未来 · 创新驱动成长',
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
     ⚠ 隐私提醒：主页是公开的，电话默认不展示。
     若确实要公开展示，把 showPhone 改成 true 即可（简历 PDF 里始终有电话）。 */
  email: '296266488@qq.com', // [待确认]
  phone: '19182173120', // [待确认]
  showPhoneOnSite: false,

  /* ── 学业表现（首页统计版记 / 简历「个人特质」） ── */
  academics: {
    /** 入校总排名百分位 */
    entranceRank: '前 10.6%',
    /** 专业成绩排名 */
    majorRank: '第一',
    /** 学期成绩进步幅度 */
    progress: '20%',
  },

  /* ── 竞赛获奖（按分量从重到轻） ── */
  awards: [
    { name: '全国大学生数据要素素质大赛', level: '全国一等奖', tier: 'national', year: '2025' },
    { name: '美国大学生数学建模竞赛', level: 'S 奖', tier: 'international', year: '2025' },
    { name: '美国大学生数学建模竞赛', level: 'S 奖', tier: 'international', year: '2026' },
    { name: '“华数杯”全国大学生数学建模竞赛', level: '全国二等奖', tier: 'national', year: '2025' },
    { name: '全国大学生数据要素素质大赛', level: '省级一等奖', tier: 'provincial', year: '2025' },
    { name: '全国大学生市场调查大赛', level: '校级一等奖', tier: 'school', year: '2026' },
    { name: '全国大学生统计建模竞赛', level: '校级一等奖', tier: 'school', year: '2025' },
    { name: '全国大学生统计建模竞赛', level: '校级二等奖', tier: 'school', year: '2025' },
  ] as Award[],

  /* ── 创新项目与学术活动 ── */
  projects: [
    {
      title: '岳麓书院黑客松',
      role: '参赛成员',
      desc: '成功报名并参与全程，可作为创新项目实践经历记入档案。',
      tags: ['创新实践', '团队协作'],
    },
    {
      title: '“点金工作坊”学业辅导站',
      role: '主讲',
      desc: '面向同学开展学业辅导与经验分享，把课程难点讲成可复用的方法。',
      tags: ['学业辅导', '知识输出'],
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

  /* ── 个人特质 ── */
  traits: [
    { title: '学习与进步能力', desc: '专业成绩排名第一，学期成绩进步 20%，入校总排名前 10.6%。' },
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
  { id: 'traits', mark: 'Ⅵ', title: '个人特质', en: 'TRAITS' },
  { id: 'contact', mark: 'Ⅶ', title: '联络与档案', en: 'CONTACT' },
] as const

/** 子界面：熔炉档案馆 */
export const ARCHIVE = {
  path: '/archive',
  name: '熔炉档案馆',
  en: 'FURNACE ARCHIVE',
  desc: '个人文件枢纽 —— 上传、归档、检索、分享。卷宗分层，逐层向下。',
  /** 角色定位说明，用于入口卡片 */
  note: '副馆 · 子界面',
} as const

/**
 * 简历 PDF 的公开路径（由 `npm run pdf` 生成到 public/ 下）。
 * 刻意用 ASCII 文件名：中文名在 URL 与 CDN 上容易踩编码坑；
 * 下载时靠 <a download="雷钰轩-简历.pdf"> 把中文名还原给用户。
 */
export const RESUME_PDF = '/resume.pdf'

/** 下载时呈现给用户的文件名 */
export const RESUME_DOWNLOAD_NAME = '雷钰轩-简历.pdf'
