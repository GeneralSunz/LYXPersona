import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ARCHIVE, PROFILE, RESUME_DOWNLOAD_NAME, RESUME_PDF, SECTIONS } from '../content/profile'
import type { Photo } from '../content/profile'
import { asset } from '../utils/asset'
import styles from './Portfolio.module.css'

/* ═══════════════════════════════════════════════════════════════
   个人主页
   ───────────────────────────────────────────────────────────────
   视觉基准：集成战略「萨卡兹的无终奇语」官方主题站
   调研见《设计风格调研-萨卡兹的无终奇语.md》
   ═══════════════════════════════════════════════════════════════ */

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 锚点滚动：自己接管，避免为一个页内跳转去改全局 CSS */
function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

/** 阅读进度 —— 顶栏那条砂金细线 */
function useScrollProgress(): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return progress
}

/** 当前所处的分区 —— 取视口中线所在的那一段 */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const els = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (!els.length) return

    const observer = new IntersectionObserver(
      entries => {
        const hit = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-42% 0px -52% 0px', threshold: 0 },
    )

    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return active
}

/* ══════════════════ 拱门 ══════════════════ */

/**
 * 流淌状金色拱门。
 * 早先版本用 CSS 的 border + border-image 画，但 border-image 会**忽略
 * border-radius**，结果渲染成一坨实心金色团块。改用 SVG 描边，
 * 并让渐变自身在底部淡出，省掉一层 mask。
 */
function ArchOutline({ className, uid }: { className?: string; uid: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 300"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2c88f" stopOpacity="0.95" />
          <stop offset="42%" stopColor="#b49562" stopOpacity="0.72" />
          <stop offset="76%" stopColor="#816e4f" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4a3d28" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 10 300 L 10 100 A 90 92 0 0 1 190 100 L 190 300"
        fill="none"
        stroke={`url(#${uid}-stroke)`}
        strokeWidth="15"
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ══════════════════ 照片版记 ══════════════════ */

function PhotoPlate({ photo, className }: { photo: Photo; className?: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <figure className={`${styles.photoPlate} ${className ?? ''}`}>
      <div className="plate-frame" style={{ padding: 0, border: 'none' }}>
        <div className={styles.photoFrame}>
          {failed ? (
            <div className={styles.photoFallback}>
              <svg className={styles.photoFallbackIcon} viewBox="0 0 24 24" aria-hidden="true">
                <use href="#icon-image" />
              </svg>
              <span className={styles.photoFallbackText}>影像待补</span>
              <span className={styles.photoFallbackHint}>
                public/photos/{photo.src.split('/').pop()}
              </span>
            </div>
          ) : (
            <img
              className={styles.photoImg}
              src={asset(photo.src)}
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          )}
          <span className={styles.photoGhost} aria-hidden="true" />
        </div>
      </div>
      <figcaption className={styles.photoCap}>
        <span className={styles.photoCapName}>{photo.caption}</span>
        <span className={styles.photoCapCode}>{photo.code}</span>
      </figcaption>
    </figure>
  )
}

/* ══════════════════ 分区外壳 ══════════════════ */

function Section({
  id,
  mark,
  title,
  en,
  children,
}: {
  id: string
  mark: string
  title: string
  en: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.section} id={id}>
      <header className={styles.sectionHead}>
        <span className={styles.sectionMark}>{mark}</span>
        <div className={styles.sectionTitleWrap}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <span className={styles.sectionEn}>{en}</span>
        </div>
        <span className={styles.sectionRule} />
        <span className="kv-diamond" aria-hidden="true" />
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

/* ══════════════════ 页面 ══════════════════ */

export default function Portfolio() {
  const sectionIds = useMemo(() => SECTIONS.map(s => s.id as string), [])
  const active = useActiveSection(sectionIds)
  const progress = useScrollProgress()

  const handleAnchor = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    scrollToId(id)
  }, [])

  const heroStats = [
    { value: '全国一等奖', label: 'DATA ELEMENTS' },
    { value: PROFILE.academics.majorRank, label: 'MAJOR RANKING' },
    { value: PROFILE.academics.entranceRank, label: 'ENTRANCE RANK' },
  ]

  const infoRows = [
    { k: '性别', v: PROFILE.gender },
    { k: '政治面貌', v: PROFILE.politicalStatus },
    { k: '学校', v: PROFILE.school },
    { k: '学院', v: PROFILE.college },
    { k: '专业', v: PROFILE.major },
    { k: '年级', v: PROFILE.grade },
  ]

  return (
    <div className={`kv-scope ${styles.page}`}>
      {/* ── 阅读进度 ── */}
      <div className={styles.progress} style={{ width: `${progress * 100}%` }} aria-hidden="true" />

      {/* ── 顶部导航 ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a
            className={styles.navBrand}
            href="#top"
            onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }) }}
          >
            <span className="kv-diamond kv-diamond--solid" aria-hidden="true" />
            <span>
              <span className={styles.navBrandName}>{PROFILE.name}</span>
              <span className={styles.navBrandEn}>{PROFILE.nameEn}</span>
            </span>
          </a>

          <div className={styles.navLinks}>
            {SECTIONS.map(s => (
              <a
                key={s.id}
                className={`${styles.navLink}${active === s.id ? ` ${styles.navLinkActive}` : ''}`}
                href={`#${s.id}`}
                onClick={e => handleAnchor(e, s.id)}
              >
                {s.title}
              </a>
            ))}
          </div>

          <div className={styles.navActions}>
            <a className={styles.navBtn} href={asset(RESUME_PDF)} download={RESUME_DOWNLOAD_NAME}>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-download" /></svg>
              <span className={styles.navBtnLabel}>PDF 简历</span>
            </a>
            <Link className={`${styles.navBtn} ${styles.navBtnBlood}`} to={ARCHIVE.path}>
              <span className={styles.navBtnLabel}>熔炉档案馆</span>
              <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-enter" /></svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 右侧罗马数字导航轨 ── */}
      <aside className={styles.sideRail} aria-hidden="true">
        {SECTIONS.map((s, i) => (
          <div key={s.id} style={{ display: 'contents' }}>
            <a
              className={`${styles.railItem}${active === s.id ? ` ${styles.railItemActive}` : ''}`}
              href={`#${s.id}`}
              onClick={e => handleAnchor(e, s.id)}
              title={s.title}
            >
              <span className={styles.railMark}>{s.mark}</span>
              <span className={styles.railDot} />
            </a>
            {i < SECTIONS.length - 1 && <span className={styles.railLine} />}
          </div>
        ))}
      </aside>

      {/* ══════════════════ 首屏 ══════════════════ */}
      <header className={styles.hero} id="top">
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBloom} />
          <div className={styles.heroBloom2} />
          <div className={styles.heroColonnade} />
          <div className={styles.heroBeams} />
          <div className={styles.heroLight} />
          <ArchOutline className={styles.heroArch} uid="kv-hero" />
          <div className={styles.heroScrim} />
          <div className={styles.heroVignette} />
          <div className={styles.heroGrain} />
        </div>

        <div className={styles.heroInner}>
          <div>
            <div className={styles.captionRow}>
              <span className="kv-caption">Furnace Side Fables</span>
              <svg className={styles.captionGlyph} viewBox="0 0 24 16" aria-hidden="true">
                <use href="#gold-bird" />
              </svg>
              <span className="kv-caption">Personal Dossier</span>
            </div>

            <div className={styles.nameBlock}>
              <h1 className={styles.vTitle}>{PROFILE.name}</h1>
              <div className={styles.nameSide}>
                <span className={styles.nameEn}>{PROFILE.nameEn}</span>
                <span className={styles.nameRole}>{PROFILE.major} · {PROFILE.grade}</span>
              </div>
            </div>

            <p className={styles.tagline}>{PROFILE.tagline}</p>
            <div className={`kv-rule ${styles.taglineRule}`} aria-hidden="true">
              <span className="kv-diamond kv-diamond--blood" />
            </div>
            <p className={styles.intro}>{PROFILE.intro}</p>

            <div className={styles.actions}>
              <a className={styles.btnPrimary} href={asset(RESUME_PDF)} download={RESUME_DOWNLOAD_NAME}>
                <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-download" /></svg>
                下载 PDF 简历
              </a>
              <Link className={styles.btnGhost} to={ARCHIVE.path}>
                <svg className={styles.btnIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-enter" /></svg>
                进入{ARCHIVE.name}
              </Link>
            </div>

            <div className={styles.statsRow}>
              {heroStats.map(s => (
                <div className={styles.stat} key={s.label}>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heroRight}>
            <PhotoPlate photo={PROFILE.photos.portrait} />
          </div>
        </div>

        <a
          className={styles.cue}
          href="#about"
          onClick={e => handleAnchor(e, 'about')}
          aria-label="向下浏览"
        >
          <span className="kv-caption">Scroll</span>
          <span className={styles.cueLine} />
          <svg className={styles.cueArrow} viewBox="0 0 24 16" aria-hidden="true">
            <use href="#icon-cue-arrow" />
          </svg>
        </a>
      </header>

      {/* ══════════════════ 主体 ══════════════════ */}
      <main className={styles.container}>
        {/* ── Ⅰ 卷宗概述 ── */}
        <Section id="about" mark="Ⅰ" title="卷宗概述" en="DOSSIER">
          <div className={styles.infoList}>
            {infoRows.map(r => (
              <div className={styles.infoRow} key={r.k}>
                <span className={styles.infoKey}>{r.k}</span>
                <span className={styles.infoVal}>{r.v}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Ⅱ 教育背景 ── */}
        <Section id="education" mark="Ⅱ" title="教育背景" en="EDUCATION">
          <div className={styles.eduCard}>
            <span className="plate-tick plate-tick--tl" aria-hidden="true" />
            <span className="plate-tick plate-tick--br" aria-hidden="true" />
            <h3 className={styles.eduSchool}>{PROFILE.school}</h3>
            <p className={styles.eduCollege}>{PROFILE.college} · {PROFILE.major}</p>
            <div className={styles.eduMeta}>
              <div className={styles.eduMetaItem}>
                <span className={styles.eduMetaKey}>年级</span>
                <span className={styles.eduMetaVal}>{PROFILE.grade}</span>
              </div>
              <div className={styles.eduMetaItem}>
                <span className={styles.eduMetaKey}>入校总排名</span>
                <span className={styles.eduMetaVal}>{PROFILE.academics.entranceRank}</span>
              </div>
              <div className={styles.eduMetaItem}>
                <span className={styles.eduMetaKey}>专业成绩排名</span>
                <span className={styles.eduMetaVal}>{PROFILE.academics.majorRank}</span>
              </div>
              <div className={styles.eduMetaItem}>
                <span className={styles.eduMetaKey}>学期成绩进步</span>
                <span className={styles.eduMetaVal}>{PROFILE.academics.progress}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Ⅲ 竞赛荣誉 ── */}
        <Section id="awards" mark="Ⅲ" title="竞赛荣誉" en="HONOURS">
          <div className={styles.awardsGrid}>
            <div className={styles.awardList}>
              {PROFILE.awards.map((a, i) => (
                <div className={styles.awardRow} key={`${a.name}-${a.level}-${a.year}-${i}`}>
                  <span className={styles.awardBadge} data-tier={a.tier}>{a.level}</span>
                  <span className={styles.awardName}>{a.name}</span>
                  <span className={styles.awardYear}>{a.year}</span>
                </div>
              ))}
            </div>
            <PhotoPlate photo={PROFILE.photos.activity} />
          </div>
        </Section>

        {/* ── Ⅳ 创新项目 ── */}
        <Section id="projects" mark="Ⅳ" title="创新项目" en="PROJECTS">
          <div className={styles.cardGrid}>
            {PROFILE.projects.map((p, i) => (
              <article className={styles.card} key={p.title}>
                <span className={styles.cardIndex}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={styles.cardTitle}>{p.title}</h3>
                <p className={styles.cardRole}>{p.role}</p>
                <p className={styles.cardDesc}>{p.desc}</p>
                <div className={styles.tagList}>
                  {p.tags.map(t => <span className={styles.tag} key={t}>{t}</span>)}
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* ── Ⅴ 组织与领导 ── */}
        <Section id="leadership" mark="Ⅴ" title="组织与领导" en="LEADERSHIP">
          <div className={styles.cardGrid}>
            {PROFILE.leadership.map((l, i) => (
              <article className={styles.card} key={l.org}>
                <span className={styles.cardIndex}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={styles.cardTitle}>{l.org}</h3>
                <p className={styles.cardRole}>{l.role}</p>
                <p className={styles.cardDesc}>{l.desc}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* ── Ⅵ 个人特质 ── */}
        <Section id="traits" mark="Ⅵ" title="个人特质" en="TRAITS">
          <div className={styles.traitsGrid}>
            <div className={styles.traitStack}>
              {PROFILE.traits.map((t, i) => (
                <div className={styles.traitRow} key={t.title}>
                  <span className={styles.traitNo}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className={styles.traitTitle}>{t.title}</h3>
                    <p className={styles.traitDesc}>{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <PhotoPlate photo={PROFILE.photos.study} />
          </div>
        </Section>

        {/* ── Ⅶ 联络与档案 ── */}
        <Section id="contact" mark="Ⅶ" title="联络与档案" en="CONTACT">
          <div className={styles.contactGrid}>
            <div>
              <div className={styles.contactList}>
                <a className={styles.contactItem} href={`mailto:${PROFILE.email}`}>
                  <svg className={styles.contactIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-mail" /></svg>
                  <span>
                    <span className={styles.contactKey}>Email</span>
                    <span className={styles.contactVal}>{PROFILE.email}</span>
                  </span>
                </a>

                {PROFILE.showPhoneOnSite && (
                  <a className={styles.contactItem} href={`tel:${PROFILE.phone}`}>
                    <svg className={styles.contactIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-phone" /></svg>
                    <span>
                      <span className={styles.contactKey}>Tel</span>
                      <span className={styles.contactVal}>{PROFILE.phone}</span>
                    </span>
                  </a>
                )}

                <a className={styles.contactItem} href={asset(RESUME_PDF)} download={RESUME_DOWNLOAD_NAME}>
                  <svg className={styles.contactIcon} viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-download" /></svg>
                  <span>
                    <span className={styles.contactKey}>Resume · PDF</span>
                    <span className={styles.contactVal}>下载完整简历</span>
                  </span>
                </a>
              </div>

              {!PROFILE.showPhoneOnSite && (
                <p className={styles.privacyNote}>
                  手机号未在公网页面展示，简历 PDF 中保留完整联系方式。
                  如需在主页一并展示，把 <code>profile.ts</code> 里的
                  {' '}<code>showPhoneOnSite</code> 改成 <code>true</code>。
                </p>
              )}
            </div>

            {/* ── 门：熔炉档案馆 ── */}
            <Link className={styles.gate} to={ARCHIVE.path}>
              <div className={styles.gateBg} aria-hidden="true">
                <div className={styles.gateBloom} />
                <ArchOutline className={styles.gateArch} uid="kv-gate" />
                <div className={styles.gateChecker} />
              </div>
              <div className={styles.gateInner}>
                <span className={styles.gateEnter}>ENTER</span>
                <div className={styles.gateBody}>
                  <span className={styles.gateCaption}>{ARCHIVE.note}</span>
                  <h3 className={styles.gateTitle}>{ARCHIVE.name}</h3>
                  <p className={styles.gateEn}>{ARCHIVE.en}</p>
                  <p className={styles.gateDesc}>{ARCHIVE.desc}</p>
                </div>
                <svg className={styles.gateArrow} viewBox="0 0 28 20" aria-hidden="true">
                  <use href="#icon-arrow-right" />
                </svg>
              </div>
            </Link>
          </div>
        </Section>
      </main>

      {/* ══════════════════ 页脚 ══════════════════ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerNote}>
            {PROFILE.name} · {PROFILE.archiveNo}
          </span>
          <span className={styles.footerSpacer} />
          <span className="kv-caption">没有终点，只有未来</span>
        </div>
        <div className={styles.footerSections}>
          <svg className={styles.footerGlyph} viewBox="0 0 24 16" aria-hidden="true">
            <use href="#gold-bird" />
          </svg>
          <span className={styles.footerSection}>熔魂之始</span>
          <span className={styles.footerSection}>锻铁根须</span>
          <span className={styles.footerSection}>灰铸迷城</span>
          <span className={styles.footerSection}>或然歧域</span>
          <span className={styles.footerSection}>虚实疆界</span>
          <span className={styles.footerSection}>辉光天顶</span>
          <span className={styles.footerSection}>无终安息</span>
        </div>
      </footer>
    </div>
  )
}
