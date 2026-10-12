/**
 * Copy and demo data for the landing page, in one place.
 *
 * Every claim here describes what Kinjy does today, or is plainly an
 * illustration (the sample people, communities and messages). Where the
 * original design promised more than the product delivers, the wording was
 * brought back to the truth rather than left for a visitor to discover:
 * see the notes on TRUST, FORMATS, ECONOMY_STEPS, PLANS and TESTIMONIALS.
 *
 * Features switched off in lib/features.ts are left out here, as they are
 * everywhere else on the site: their modules, links and copy are filtered at
 * the source, so no section can mention one by accident.
 */
import { FEATURES, isRouteAvailable, type Feature } from '@/lib/features'

/** A link that is only listed while its page is open. */
interface PageLink {
  to: string
  /** An i18n key, not words: this file is read in five languages. */
  label: string
}

function openLinks<T extends PageLink>(links: T[]): T[] {
  return links.filter((l) => isRouteAvailable(l.to))
}

/** App store links. Empty until the native apps exist; the page then offers the web version alone. */
export const STORE_LINKS = {
  appStore: (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '',
  googlePlay: (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) || '',
}

export interface LandingModule {
  name: string
  desc: string
  a: string
  b: string
  who: string
  /** Shown only while this feature is switched on. */
  feature?: Feature
}

/** The modules of the orbit, fifteen when all are open. The sample people are illustrations. */
const ALL_MODULES: LandingModule[] = [
  { name: 'landing.modules.feed.name', desc: 'landing.modules.feed.desc', a: 'LM', b: 'SK', who: 'landing.modules.feed.who' },
  { name: 'landing.modules.messages.name', desc: 'landing.modules.messages.desc', a: 'JN', b: 'TB', who: 'landing.modules.messages.who' },
  { name: 'landing.modules.communities.name', desc: 'landing.modules.communities.desc', a: 'SK', b: 'AO', who: 'landing.modules.communities.who' },
  // "Stories" in the design: Kinjy has none. Forums are one of its modules.
  { name: 'landing.modules.forums.name', desc: 'landing.modules.forums.desc', a: 'LM', b: 'JN', who: 'landing.modules.forums.who' },
  { name: 'landing.modules.videos.name', desc: 'landing.modules.videos.desc', a: 'AO', b: 'DS', who: 'landing.modules.videos.who' },
  { name: 'landing.modules.audio.name', desc: 'landing.modules.audio.desc', a: 'AO', b: 'VS', who: 'landing.modules.audio.who' },
  { name: 'landing.modules.articles.name', desc: 'landing.modules.articles.desc', a: 'JN', b: 'MA', who: 'landing.modules.articles.who' },
  { name: 'landing.modules.events.name', desc: 'landing.modules.events.desc', a: 'TB', b: 'SK', who: 'landing.modules.events.who' },
  { name: 'landing.modules.market.name', desc: 'landing.modules.market.desc', a: 'VS', b: 'LM', who: 'landing.modules.market.who', feature: 'marketplace' },
  { name: 'landing.modules.tree.name', desc: 'landing.modules.tree.desc', a: 'MA', b: 'EM', who: 'landing.modules.tree.who', feature: 'familyTree' },
  { name: 'landing.modules.memorials.name', desc: 'landing.modules.memorials.desc', a: 'MA', b: 'YM', who: 'landing.modules.memorials.who' },
  { name: 'landing.modules.translation.name', desc: 'landing.modules.translation.desc', a: 'LC', b: 'JN', who: 'landing.modules.translation.who' },
  { name: 'landing.modules.assistant.name', desc: 'landing.modules.assistant.desc', a: 'DS', b: 'LM', who: 'landing.modules.assistant.who', feature: 'assistant' },
  { name: 'landing.modules.earn.name', desc: 'landing.modules.earn.desc', a: 'AO', b: 'SK', who: 'landing.modules.earn.who' },
  // The design said "seul ou en groupe": group calls need a media server Kinjy does not run.
  { name: 'landing.modules.calls.name', desc: 'landing.modules.calls.desc', a: 'YM', b: 'KO', who: 'landing.modules.calls.who', feature: 'calls' },
]

export const MODULES = ALL_MODULES.filter((m) => !m.feature || FEATURES[m.feature])

/** The count spelled out for the headline, as an i18n key: every language
 *  writes its own numerals, and some do not spell them at all. */
export const MODULE_COUNT_KEY = `landing.count.${MODULES.length}`

export const COMMUNITIES = [
  { i: 'E', name: 'landing.commu.climb.name', meta: 'landing.commu.climb.meta', bg: '#D9A648', offset: 0, dur: '6s' },
  { i: 'V', name: 'landing.commu.vinyl.name', meta: 'landing.commu.vinyl.meta', bg: '#F0C878', offset: 36, dur: '7s' },
  { i: 'C', name: 'landing.commu.veggie.name', meta: 'landing.commu.veggie.meta', bg: '#F0C2B0', offset: 8, dur: '6.5s' },
  { i: 'D', name: 'landing.commu.dev.name', meta: 'landing.commu.dev.meta', bg: '#C9DCF2', offset: 52, dur: '7.5s' },
]

/** What the composer offers today. The design listed polls and carousels, which do not exist. */
export const COMPOSER_TOOLS = ['landing.composer.photo', 'landing.composer.video', 'landing.composer.article']

export const CHAT = [
  { text: 'landing.chat.1', mine: false, delay: '.1s' },
  { text: 'landing.chat.2', mine: true, delay: '.4s' },
  { text: 'landing.chat.3', mine: false, delay: '.7s' },
  { text: 'landing.chat.4', mine: true, gold: true, delay: '1s' },
]

/**
 * The feed modes shown in the demo. They are real modes of /hub: "Nouveautés"
 * is what a member sees before choosing, and "Abonnements" is the strictly
 * chronological one.
 */
export const ALGORITHMS = [
  {
    name: 'landing.algo.new.name', mark: 'landing.algo.new.mark',
    desc: 'landing.algo.new.desc',
    posts: [
      { i: 'LM', who: 'Léa M.', what: 'landing.post.cliff', tag: 'landing.tag.2min', bg: '#F6EBD3' },
      { i: 'SK', who: 'Samir K.', what: 'landing.post.joined', tag: 'landing.tag.12min', bg: '#E3ECF7' },
      { i: 'JN', who: 'Jade N.', what: 'landing.post.article', tag: 'landing.tag.40min', bg: '#F7E1D8' },
    ],
  },
  {
    name: 'landing.algo.following.name', mark: 'landing.algo.following.mark',
    desc: 'landing.algo.following.desc',
    posts: [
      { i: 'TB', who: 'Théo B.', what: 'landing.post.invite', tag: 'landing.tag.5min', bg: '#E3ECF7' },
      { i: 'LM', who: 'Léa M.', what: 'landing.post.cliff', tag: 'landing.tag.2h', bg: '#F6EBD3' },
      { i: 'SK', who: 'Samir K.', what: 'landing.post.longrun', tag: 'landing.tag.yesterday', bg: '#F7E1D8' },
    ],
  },
  {
    name: 'landing.algo.family.name', mark: 'landing.algo.family.mark',
    desc: 'landing.algo.family.desc',
    posts: [
      {
        i: 'MA', who: 'Maman',
        what: FEATURES.familyTree ? 'landing.post.treePhoto' : 'landing.post.christening',
        tag: 'landing.tag.family', bg: '#F6EBD3',
      },
      { i: 'TB', who: 'Théo B.', what: 'landing.post.invite', tag: 'landing.tag.friendM', bg: '#E3ECF7' },
      { i: 'LM', who: 'Léa M.', what: 'landing.post.cliff', tag: 'landing.tag.friendF', bg: '#F7E1D8' },
    ],
  },
  {
    name: 'landing.algo.discover.name', mark: 'landing.algo.discover.mark',
    desc: 'landing.algo.discover.desc',
    posts: [
      { i: 'VS', who: 'Vinyles & soul', what: 'landing.post.listen', tag: 'landing.tag.commu', bg: '#F6EBD3' },
      { i: 'AO', who: 'Awa O.', what: 'landing.post.cook', tag: 'landing.tag.video', bg: '#F7E1D8' },
      { i: 'DS', who: 'Dev du soir', what: 'landing.post.workshop', tag: 'landing.tag.event', bg: '#E3ECF7' },
    ],
  },
]

/**
 * One-to-Many publishing. Articles, newsletters and translations are produced
 * today; video, audio and carousel need a media pipeline that does not exist
 * yet, so they are marked as coming rather than promised.
 */
export const FORMATS = [
  { name: 'landing.format.article', meta: 'landing.format.articleMeta', ready: true },
  { name: 'landing.format.newsletter', meta: 'landing.format.newsletterMeta', ready: true },
  { name: 'landing.format.translations', meta: 'landing.format.translationsMeta', ready: true },
  { name: 'landing.format.video', meta: 'landing.soon', ready: false },
  { name: 'landing.format.audio', meta: 'landing.soon', ready: false },
]

export const FAMILY_TREE = [
  [{ i: 'KM', n: 'Kofi', y: '1935 – 2010', bg: '#E3ECF7' }, { i: 'RM', n: 'Rose', y: '1938 – 2024', bg: '#F6EBD3' }],
  [{ i: 'AM', n: 'Ama', y: '1964', bg: '#F7E1D8' }, { i: 'YM', n: 'Yaw', y: '1967', bg: '#E3ECF7' }],
  [{ i: 'VO', n: 'landing.tree.you', y: '1994', bg: '#F0C878' }, { i: 'EM', n: 'Esi', y: '1997', bg: '#F6EBD3' }, { i: 'KO', n: 'Kwame', y: '2001', bg: '#F7E1D8' }],
]

/**
 * The affiliate programme, stated exactly. The sponsor is paid 20 % of
 * Kinjy's revenue on what their members do — not 20 % of the members' own
 * earnings, which is what the design's wording implied. On a marketplace sale
 * that revenue is the 20 % markup, never the seller's price.
 */
export const ECONOMY_STEPS = [
  { n: '01', t: 'landing.econ.1t', d: 'landing.econ.1d' },
  FEATURES.marketplace
    ? { n: '02', t: 'landing.econ.2t', d: 'landing.econ.2market' }
    : { n: '02', t: 'landing.econ.2t', d: 'landing.econ.2plain' },
  // The worked example is a marketplace sale; without the marketplace the
  // step states the rate alone rather than invent another example.
  FEATURES.marketplace
    ? { n: '03', t: 'landing.econ.3t', d: 'landing.econ.3market' }
    : { n: '03', t: 'landing.econ.3t', d: 'landing.econ.3plain' },
]

export const ASSISTANT_SKILLS = [
  'landing.ask.feed',
  'landing.ask.paid',
  'landing.ask.tree',
  'landing.ask.memorial',
]

/**
 * The tiers as they are sold today. The free tier carries advertising, which
 * is why the design's "sans publicité ciblée" does not appear on this page.
 */
export const PLANS = [
  {
    name: 'landing.plan.free', price: '$0', cta: 'nav.signUp', tone: 'plain' as const,
    features: ['landing.plan.free1', 'landing.plan.free2', 'landing.plan.free3'],
  },
  {
    name: 'landing.plan.basic', price: '$3.99', cta: 'landing.plan.basicCta', tone: 'paper' as const,
    features: ['landing.plan.basic1', 'landing.plan.basic2', 'landing.plan.basic3'],
  },
  {
    name: 'landing.plan.premium', price: '$9.99', cta: 'landing.plan.premiumCta', tone: 'night' as const,
    // Heritage AI belongs to the family tree; the same swap as PricingTeaser.
    features: ['landing.plan.premium1', 'landing.plan.premium2', FEATURES.familyTree ? 'landing.plan.premium3a' : 'landing.plan.premium3b', 'landing.plan.premium4', 'landing.plan.premium5'],
  },
]

/**
 * What "safe by default" means on Kinjy, in things it actually does. The
 * design's version promised European hosting, one-click export and a human
 * moderation team, none of which exists, and "no targeted ads", which the
 * free tier contradicts.
 */
export const TRUST = [
  {
    n: '01', title: 'landing.trust.1title',
    text: 'landing.trust.1text',
  },
  {
    n: '02', title: 'landing.trust.2title',
    text: 'landing.trust.2text',
  },
  {
    n: '03', title: 'landing.trust.3title',
    text: 'landing.trust.3text',
  },
]

export interface Testimonial {
  quote: string
  name: string
  meta: string
  photo: string
}

/**
 * Real members' words only. The design shipped three invented beta testers
 * with stock portraits; publishing those as reviews would be fabricated
 * testimony. The section stays hidden until this list has genuine entries.
 */
export const TESTIMONIALS: Testimonial[] = []

/** The site's pages, as the previous marketing navigation listed them. */
export const NAV_PRIMARY = openLinks([
  { to: '/platform', label: 'nav.platform' },
  { to: '/feeds', label: 'nav.feeds' },
  { to: '/family', label: 'nav.family' },
  { to: '/creators', label: 'nav.creators' },
  { to: '/pricing', label: 'nav.pricing' },
])

export const NAV_MORE = openLinks([
  { to: '/memorials', label: 'nav.memorials' },
  { to: '/commerce', label: 'nav.commerce' },
  { to: '/payments', label: 'nav.payments' },
  { to: '/safety', label: 'nav.safety' },
  { to: '/developers', label: 'nav.developers' },
  { to: '/assistant', label: 'nav.assistant' },
  { to: '/app', label: 'nav.app' },
])

const ALL_FOOTER_COLUMNS: { title: string; links: PageLink[] }[] = [
  {
    title: 'footer.platform',
    links: [
      { to: '/platform', label: 'footer.allModules' },
      { to: '/feeds', label: 'footer.feeds' },
      { to: '/family', label: 'footer.familyTree' },
      { to: '/memorials', label: 'footer.memorials' },
      { to: '/app', label: 'footer.app' },
    ],
  },
  {
    title: 'footer.trust',
    links: [
      { to: '/safety', label: 'footer.safety' },
      { to: '/safety', label: 'footer.privacy' },
      { to: '/safety', label: 'footer.transparency' },
      { to: '/safety', label: 'footer.deletion' },
    ],
  },
  {
    title: 'footer.economy',
    links: [
      { to: '/creators', label: 'footer.creators' },
      { to: '/commerce', label: 'footer.marketplace' },
      { to: '/commerce', label: 'footer.advertising' },
      { to: '/payments', label: 'footer.payments' },
      { to: '/creators', label: 'footer.leaders' },
    ],
  },
  {
    title: 'footer.developers',
    links: [
      { to: '/developers', label: 'footer.devDocs' },
      { to: '/developers', label: 'footer.aiGateway' },
      { to: '/feeds', label: 'footer.algoMarket' },
      { to: '/assistant', label: 'footer.assistant' },
    ],
  },
]

/** A column whose every page is closed goes too, rather than stand empty. */
export const FOOTER_COLUMNS = ALL_FOOTER_COLUMNS
  .map((col) => ({ ...col, links: openLinks(col.links) }))
  .filter((col) => col.links.length > 0)
