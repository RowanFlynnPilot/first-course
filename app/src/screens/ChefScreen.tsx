// The chef sheet: who your chef is, how far along, and every skill on the menu.

import { useState } from 'react'
import { Link } from 'react-router'
import { BadgeArt } from '../components/BadgeArt'
import { ChefSprite } from '../components/ChefSprite'
import { XpBar } from '../components/XpBar'
import { RECIPES } from '../curriculum/recipes'
import { DISCIPLINES, TECHNIQUES, type TechniqueId } from '../curriculum/techniques'
import { BADGES, earnedBadges } from '../lib/badges'
import type { Chef } from '../lib/chefs'
import { totalKeptCents, type Prices } from '../lib/cost'
import { formatCents, localDateString, plural } from '../lib/format'
import {
  disciplineStats,
  levelForXp,
  RANK_INDEXES,
  rankIndexForLevel,
  RANKS,
  totalXp,
  XP_COOKS_PER_RECIPE,
  XP_PER_MASTERY,
  XP_PER_SKILL,
} from '../lib/leveling'
import { recipeState, type CookLog } from '../lib/progress'
import { currentStreak, longestStreak } from '../lib/streak'

function teacherOf(technique: TechniqueId) {
  const recipe = RECIPES.find((candidate) => candidate.teaches.includes(technique))
  if (!recipe) throw new Error(`No recipe teaches ${technique}`)
  return recipe
}

export function ChefScreen({ chef, logs, prices }: { chef: Chef; logs: readonly CookLog[]; prices: Prices }) {
  const xp = totalXp(logs)
  const level = levelForXp(xp)
  const rank = rankIndexForLevel(level)
  const nextRank = RANKS[rank + 1]
  const mastered = RECIPES.filter((recipe) => recipeState(recipe, logs) === 'mastered').length
  const [today] = useState(() => localDateString(new Date()))
  const streak = currentStreak(logs, today)
  const earned = new Set(earnedBadges(logs, prices))

  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>

      <header className="sheet-head">
        <ChefSprite rank={rank} skin={chef.skin} hair={chef.hair} scale={5} idle />
        <div>
          <h1 className="title">{chef.name}</h1>
          <p className="sheet-rank">
            Level {level} {RANKS[rank].name.toLowerCase()}
          </p>
          <XpBar xp={xp} fromXp={null} />
          <p className="sheet-edit">
            <Link to="/chef/edit">Change name or look</Link>
          </p>
        </div>
      </header>

      <dl className="record">
        <div>
          <dt>XP</dt>
          <dd>{xp.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Cooks</dt>
          <dd>{logs.length}</dd>
        </div>
        <div>
          <dt>Mastered</dt>
          <dd>{mastered}</dd>
        </div>
        <div>
          <dt>Kept</dt>
          <dd>{formatCents(totalKeptCents(logs, prices))}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{plural(streak.weeks, 'week', 'weeks')}</dd>
        </div>
        <div>
          <dt>Badges</dt>
          <dd>
            {earned.size} of {BADGES.length}
          </dd>
        </div>
      </dl>
      <p className="section-note record-note">
        {streak.weeks === 0
          ? 'A streak is weeks in a row with at least one cook. Cook this week to start one.'
          : streak.needsThisWeek
            ? 'Cook this week to keep your streak.'
            : 'You have cooked this week.'}{' '}
        Longest: {plural(longestStreak(logs), 'week', 'weeks')}.
      </p>

      <section className="section">
        <h2 className="section-title">Badges</h2>
        <p className="section-note">They come from your cook log, so changing a cook can change them.</p>
        <ul className="badges">
          {BADGES.map((badge) => (
            <li key={badge.id} className={earned.has(badge.id) ? 'badge badge-earned' : 'badge'}>
              <BadgeArt id={badge.id} earned={earned.has(badge.id)} scale={3} />
              <span className="row-title">{badge.name}</span>
              <span className="row-note">{badge.how}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section-title">Skills</h2>
        <p className="section-note">Six kinds of skill. Each one is learned by cooking the recipe that teaches it.</p>
        {disciplineStats(logs).map((stat) => (
          <div className="discipline" key={stat.id}>
            <div className="discipline-head">
              <h3>{DISCIPLINES[stat.id].name}</h3>
              <span className="pips" role="img" aria-label={`${stat.learned} of ${stat.skills.length} learned`}>
                {stat.skills.map((skill) => (
                  <span key={skill.id} className={skill.learned ? 'pip pip-on' : 'pip'} />
                ))}
              </span>
            </div>
            <p className="section-note">{DISCIPLINES[stat.id].summary}</p>
            <ul className="skill-list">
              {stat.skills.map((skill) => {
                const teacher = teacherOf(skill.id)
                return (
                  <li key={skill.id} className={skill.learned ? 'skill skill-learned' : 'skill'}>
                    <span>
                      <span className="row-title">{TECHNIQUES[skill.id].name}</span>
                      <span className="row-note">
                        {skill.learned ? 'Learned from ' : 'Taught by '}
                        <Link to={`/recipe/${teacher.id}`}>{teacher.title}</Link>
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="section">
        <h2 className="section-title">The kitchen ladder</h2>
        <p className="section-note">
          {nextRank === undefined
            ? 'Top of the kitchen.'
            : `Next promotion: ${nextRank.name.toLowerCase()} at level ${nextRank.fromLevel}.`}
        </p>
        <ol className="ladder">
          {RANK_INDEXES.map((index) => (
            <li key={index} className={index === rank ? 'rung rung-current' : 'rung'}>
              <ChefSprite rank={index} skin={chef.skin} hair={chef.hair} scale={2} />
              <span>
                <span className="row-title">{RANKS[index].name}</span>
                <span className="row-note">{index === rank ? 'You are here' : `Level ${RANKS[index].fromLevel}`}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2 className="section-title">How XP works</h2>
        <ul className="plain-list">
          <li>Every cook earns XP: 10 times the course number, times 1 for Rough, 2 for Decent, 3 for Nailed it.</li>
          <li>Each skill you learn is worth {XP_PER_SKILL}. Each recipe you master is worth {XP_PER_MASTERY}.</li>
          <li>A recipe pays out for its first {XP_COOKS_PER_RECIPE} cooks. After that, cook it because it is dinner.</li>
          <li>Level never locks anything. Recipes unlock through skills.</li>
        </ul>
      </section>
    </main>
  )
}
