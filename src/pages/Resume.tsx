import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PROFILE, RESUME_DOWNLOAD_NAME, RESUME_PDF } from '../content/profile'
import { asset } from '../utils/asset'
import styles from './Resume.module.css'

/* ═══════════════════════════════════════════════════════════════
   A4 简历
   ───────────────────────────────────────────────────────────────
   这一页有两个身份：
     1. 在线简历（公开可访问）
     2. public/雷钰轩-简历.pdf 的生成源 —— 见 scripts/make-pdf.mjs
   结构对标用户提供的简历参考图：四段式（竞赛 / 项目 / 组织 / 特质）。
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { mark: '01', title: '创新实践与竞赛经历', en: 'Honours' },
  { mark: '02', title: '创新项目与学术活动', en: 'Projects' },
  { mark: '03', title: '组织与创新能力结合', en: 'Leadership' },
  { mark: '04', title: '个人特质与创新精神', en: 'Traits' },
] as const

function SectionShell({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  const s = SECTIONS[index]
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionMark}>{s.mark}</span>
        <h2 className={styles.sectionTitle}>{s.title}</h2>
        <span className={styles.sectionRule} />
        <span className={styles.sectionEn}>{s.en}</span>
      </div>
      {children}
    </section>
  )
}

export default function Resume() {
  const [portraitFailed, setPortraitFailed] = useState(false)

  // 打印时浏览器会把页面标题写进页眉，改成简历名
  useEffect(() => {
    const prev = document.title
    document.title = `${PROFILE.name}-简历`
    return () => { document.title = prev }
  }, [])

  const basics = [
    { k: '性别', v: PROFILE.gender },
    { k: '政治面貌', v: PROFILE.politicalStatus },
    { k: '学校', v: PROFILE.school },
    { k: '学院', v: PROFILE.college },
    { k: '专业', v: PROFILE.major },
    { k: '年级', v: PROFILE.grade },
    // 对外联络只留邮箱
    { k: '电子邮箱', v: PROFILE.email },
  ]

  return (
    <div className={styles.screen}>
      {/* ── 屏幕工具条 ── */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>A4 简历 · 在线预览</span>
        <span className={styles.toolbarSpacer} />
        <Link to="/" className={styles.toolBtn}>返回主页</Link>
        <a className={styles.toolBtn} href={asset(RESUME_PDF)} download={RESUME_DOWNLOAD_NAME}>下载 PDF</a>
        <button className={`${styles.toolBtn} ${styles.toolBtnPrimary}`} onClick={() => window.print()}>
          打印 / 另存为 PDF
        </button>
      </div>

      {/* ── 纸面 ── */}
      <article className={styles.page}>
        {/* 抬头 */}
        <header className={styles.head}>
          <div className={styles.headMain}>
            <h1 className={styles.name}>{PROFILE.name}</h1>
            <p className={styles.nameEn}>{PROFILE.nameEn}</p>
            <p className={styles.tagline}>
              {PROFILE.tagline}
              <span className={styles.taglineEn}>{PROFILE.taglineEn}</span>
            </p>
            <div className={styles.contactGrid}>
              {basics.map(b => (
                <div className={styles.contactItem} key={b.k}>
                  <span className={styles.contactKey}>{b.k}</span>
                  <span className={styles.contactVal}>{b.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.portraitBox}>
            {portraitFailed ? (
              <div className={styles.portraitFallback}>照片</div>
            ) : (
              <img
                className={styles.portrait}
                src={asset(PROFILE.photos.portrait.src)}
                alt={`${PROFILE.name}的证件照`}
                onError={() => setPortraitFailed(true)}
              />
            )}
          </div>
        </header>

        {/* 01 竞赛
            ⚠ 版式保持原样未动。这里只做新数据结构到原字段的映射，
              简历的整体改版留到之后一起做。 */}
        <SectionShell index={0}>
          <p className={styles.subHead}>竞赛获奖</p>
          <div className={styles.awardCols}>
            {PROFILE.awards.map((a, i) => (
              <div className={styles.awardItem} key={`${a.date}-${i}`}>
                <span className={styles.awardDot} />
                <span className={styles.awardName}>{a.contest}</span>
                <span className={styles.awardLevel}>{a.levels[0] ?? '参赛'}</span>
                <span className={styles.awardYear}>{a.date.slice(0, 4)}</span>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* 02 项目 */}
        <SectionShell index={1}>
          <p className={styles.subHead}>创新类项目经历</p>
          {/* ⚠ 简历暂不改版：只取前 3 项（三项大创立项，分量最重）以维持单页 A4。
              完整 6 项在主页 Ⅳ 创新项目。简历改版时一并处理这个取舍。 */}
          {PROFILE.projects.slice(0, 3).map(p => (
            <div className={styles.entry} key={p.title}>
              <div className={styles.entryTop}>
                <span className={styles.entryTitle}>{p.title}</span>
                <span className={styles.entryRole}>{p.level}</span>
              </div>
              <p className={styles.entryDesc}>{p.program}</p>
            </div>
          ))}
        </SectionShell>

        {/* 03 组织 */}
        <SectionShell index={2}>
          {PROFILE.leadership.map(l => (
            <div className={styles.entry} key={l.org}>
              <div className={styles.entryTop}>
                <span className={styles.entryTitle}>{l.org}</span>
                <span className={styles.entryRole}>{l.role}</span>
              </div>
              <p className={styles.entryDesc}>{l.desc}</p>
            </div>
          ))}
        </SectionShell>

        {/* 04 特质
            成绩只留绩点与排名两项，其余排名类数据已按要求撤下。 */}
        <SectionShell index={3}>
          <div className={styles.statBar}>
            <div className={styles.statCell}>
              <span className={styles.statValue}>{PROFILE.academics.gpa}</span>
              <span className={styles.statLabel}>专业成绩绩点</span>
            </div>
            <div className={styles.statCell}>
              <span className={styles.statValue}>{PROFILE.academics.majorRank}</span>
              <span className={styles.statLabel}>绩点排名</span>
            </div>
          </div>
          <div className={styles.traitRow}>
            {PROFILE.traits.map(t => (
              <div className={styles.traitCell} key={t.title}>
                <h3 className={styles.traitTitle}>{t.title}</h3>
                <p className={styles.traitDesc}>{t.desc}</p>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* 页脚 */}
        <footer className={styles.foot}>
          <span className={styles.footMotto}>以数据为基，以创新为翼，追求卓越，行稳致远！</span>
          <span className={styles.footSpacer} />
          <span className={styles.footMeta}>{PROFILE.nameEn} · Resume</span>
        </footer>
      </article>
    </div>
  )
}
