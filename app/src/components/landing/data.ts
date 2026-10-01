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
  { name: 'Fil', desc: 'Ce que publient vos proches et vos communautés, dans l’ordre que vous choisissez.', a: 'LM', b: 'SK', who: 'Léa et Samir l’ouvrent chaque matin' },
  { name: 'Messages', desc: 'Discussions privées en temps réel, avec photos, fichiers et messages vocaux.', a: 'JN', b: 'TB', who: 'Jade écrit à Théo tous les jours' },
  { name: 'Commu’s', desc: 'Des groupes autour d’une passion, d’un quartier ou d’un projet.', a: 'SK', b: 'AO', who: 'Samir anime Running Paris' },
  // "Stories" in the design: Kinjy has none. Forums are one of its modules.
  { name: 'Forums', desc: 'Des discussions par sujet et par lieu, où les bonnes réponses restent.', a: 'LM', b: 'JN', who: 'Léa répond aux débutants en escalade' },
  { name: 'Vidéos', desc: 'Vidéos courtes en format vertical, publiées et regardées au même endroit.', a: 'AO', b: 'DS', who: 'Awa filme ses recettes' },
  { name: 'Audio', desc: 'Notes vocales et contenus audio à partager.', a: 'AO', b: 'VS', who: 'Awa enregistre ses recettes à voix haute' },
  { name: 'Articles', desc: 'Des textes longs, mis en page sans effort.', a: 'JN', b: 'MA', who: 'Jade tient son carnet de potager' },
  { name: 'Événements', desc: 'Sorties, ateliers et anniversaires, avec invitations et réponses.', a: 'TB', b: 'SK', who: 'Théo organise son anniversaire' },
  { name: 'Marché', desc: 'Achetez et vendez entre membres, l’argent bloqué jusqu’à la réception.', a: 'VS', b: 'LM', who: 'Les vinyles de Vinyles & soul', feature: 'marketplace' },
  { name: 'Arbre familial', desc: 'Votre famille sur plusieurs générations, construite et vérifiée à plusieurs.', a: 'MA', b: 'EM', who: 'Maman et Esi complètent l’arbre', feature: 'familyTree' },
  { name: 'Mémoriaux', desc: 'Un lieu pour se souvenir de ceux qui sont partis.', a: 'MA', b: 'YM', who: '142 souvenirs pour Rose' },
  { name: 'Traduction', desc: 'Chaque publication traduisible dans la langue de celui qui la lit.', a: 'LC', b: 'JN', who: 'Lucía et Jade se comprennent' },
  { name: 'Assistant', desc: 'Il répond à vos questions sur Kinjy, dans votre langue.', a: 'DS', b: 'LM', who: 'Dev du soir prépare ses ateliers', feature: 'assistant' },
  { name: 'Gains', desc: '20 % de ce que Kinjy gagne sur l’activité de vos filleuls.', a: 'AO', b: 'SK', who: 'Awa a parrainé 12 membres' },
  // The design said "seul ou en groupe": group calls need a media server Kinjy does not run.
  { name: 'Appels', desc: 'Appels audio et vidéo en tête-à-tête.', a: 'YM', b: 'KO', who: 'Yaw appelle Kwame le dimanche', feature: 'calls' },
]

export const MODULES = ALL_MODULES.filter((m) => !m.feature || FEATURES[m.feature])

const COUNT_WORDS = [
  'Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix',
  'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze',
]

/** "Onze": the number of open modules, spelled out for the headline. */
export const MODULE_COUNT_WORD = COUNT_WORDS[MODULES.length] ?? String(MODULES.length)

export const COMMUNITIES = [
  { i: 'E', name: 'Escalade Lyon', meta: '2 340 membres · 18 en ligne', bg: '#D9A648', offset: 0, dur: '6s' },
  { i: 'V', name: 'Vinyles & soul', meta: '980 membres · 7 en ligne', bg: '#F0C878', offset: 36, dur: '7s' },
  { i: 'C', name: 'Cuisine veggie', meta: '5 120 membres · 42 en ligne', bg: '#F0C2B0', offset: 8, dur: '6.5s' },
  { i: 'D', name: 'Dev du soir', meta: '1 460 membres · 23 en ligne', bg: '#C9DCF2', offset: 52, dur: '7.5s' },
]

/** What the composer offers today. The design listed polls and carousels, which do not exist. */
export const COMPOSER_TOOLS = ['Photo', 'Vidéo', 'Article']

export const CHAT = [
  { text: 'Qui est chaud pour dimanche ?', mine: false, delay: '.1s' },
  { text: 'Moi ! Départ 8h au parking ?', mine: true, delay: '.4s' },
  { text: 'Je ramène le café', mine: false, delay: '.7s' },
  { text: 'Parfait, je crée l’événement', mine: true, gold: true, delay: '1s' },
]

/**
 * The feed modes shown in the demo. They are real modes of /hub: "Nouveautés"
 * is what a member sees before choosing, and "Abonnements" is the strictly
 * chronological one.
 */
export const ALGORITHMS = [
  {
    name: 'Nouveautés', mark: 'PAR DÉFAUT',
    desc: 'Les publications les plus récentes, sans classement.',
    posts: [
      { i: 'LM', who: 'Léa M.', what: 'a publié 6 photos de la falaise', tag: 'IL Y A 2 MIN', bg: '#F6EBD3' },
      { i: 'SK', who: 'Samir K.', what: 'a rejoint Running Paris', tag: '12 MIN', bg: '#E3ECF7' },
      { i: 'JN', who: 'Jade N.', what: 'a partagé un article', tag: '40 MIN', bg: '#F7E1D8' },
    ],
  },
  {
    name: 'Abonnements', mark: 'CHRONOLOGIQUE',
    desc: 'Uniquement les personnes que vous suivez, de la plus récente à la plus ancienne.',
    posts: [
      { i: 'TB', who: 'Théo B.', what: 'vous a invité à son anniversaire', tag: '5 MIN', bg: '#E3ECF7' },
      { i: 'LM', who: 'Léa M.', what: 'a publié 6 photos de la falaise', tag: '2 H', bg: '#F6EBD3' },
      { i: 'SK', who: 'Samir K.', what: 'Sortie longue dimanche, qui vient ?', tag: 'HIER', bg: '#F7E1D8' },
    ],
  },
  {
    name: 'Famille d’abord', mark: 'FAMILLE · AMIS',
    desc: 'Votre famille et vos proches passent avant le reste.',
    posts: [
      {
        i: 'MA', who: 'Maman',
        what: FEATURES.familyTree ? 'a ajouté une photo à l’arbre familial' : 'a partagé les photos du baptême',
        tag: 'FAMILLE', bg: '#F6EBD3',
      },
      { i: 'TB', who: 'Théo B.', what: 'vous a invité à son anniversaire', tag: 'AMI', bg: '#E3ECF7' },
      { i: 'LM', who: 'Léa M.', what: 'a publié 6 photos de la falaise', tag: 'AMIE', bg: '#F7E1D8' },
    ],
  },
  {
    name: 'Découverte', mark: 'NOUVEAUX CRÉATEURS',
    desc: 'Des communautés et créateurs proches de vos centres d’intérêt.',
    posts: [
      { i: 'VS', who: 'Vinyles & soul', what: 'Écoute collective ce soir à 21 h', tag: 'COMMU', bg: '#F6EBD3' },
      { i: 'AO', who: 'Awa O.', what: 'Cuisiner sans gaspiller, en vidéo', tag: 'VIDÉO', bg: '#F7E1D8' },
      { i: 'DS', who: 'Dev du soir', what: 'Atelier débutants samedi', tag: 'ÉVÉNEMENT', bg: '#E3ECF7' },
    ],
  },
]

/**
 * One-to-Many publishing. Articles, newsletters and translations are produced
 * today; video, audio and carousel need a media pipeline that does not exist
 * yet, so they are marked as coming rather than promised.
 */
export const FORMATS = [
  { name: 'Article', meta: '1 200 mots', ready: true },
  { name: 'Newsletter', meta: 'Envoi aux abonnés', ready: true },
  { name: 'Traductions', meta: '5 langues', ready: true },
  { name: 'Vidéo', meta: 'Bientôt', ready: false },
  { name: 'Audio', meta: 'Bientôt', ready: false },
]

export const FAMILY_TREE = [
  [{ i: 'KM', n: 'Kofi', y: '1935 – 2010', bg: '#E3ECF7' }, { i: 'RM', n: 'Rose', y: '1938 – 2024', bg: '#F6EBD3' }],
  [{ i: 'AM', n: 'Ama', y: '1964', bg: '#F7E1D8' }, { i: 'YM', n: 'Yaw', y: '1967', bg: '#E3ECF7' }],
  [{ i: 'VO', n: 'Vous', y: '1994', bg: '#F0C878' }, { i: 'EM', n: 'Esi', y: '1997', bg: '#F6EBD3' }, { i: 'KO', n: 'Kwame', y: '2001', bg: '#F7E1D8' }],
]

/**
 * The affiliate programme, stated exactly. The sponsor is paid 20 % of
 * Kinjy's revenue on what their members do — not 20 % of the members' own
 * earnings, which is what the design's wording implied. On a marketplace sale
 * that revenue is the 20 % markup, never the seller's price.
 */
export const ECONOMY_STEPS = [
  { n: '01', t: 'Invitez vos proches', d: 'Partagez votre lien de parrainage. Chaque inscription faite avec lui vous est rattachée.' },
  FEATURES.marketplace
    ? { n: '02', t: 'Ils utilisent Kinjy', d: 'Achats sur le Marché, publicités, abonnements : ce que Kinjy gagne sur leur activité est suivi dans votre tableau de bord.' }
    : { n: '02', t: 'Ils utilisent Kinjy', d: 'Publicités, abonnements : ce que Kinjy gagne sur leur activité est suivi dans votre tableau de bord.' },
  // The worked example is a marketplace sale; without the marketplace the
  // step states the rate alone rather than invent another example.
  FEATURES.marketplace
    ? { n: '03', t: 'Vous percevez 20 %', d: 'Exemple : votre filleule achète un objet à 100 $. Kinjy ajoute 20 $ au prix du vendeur, et vous en recevez 4 $.' }
    : { n: '03', t: 'Vous percevez 20 %', d: 'Sur chaque dollar que Kinjy gagne grâce à leur activité, 20 cents vous reviennent.' },
]

export const ASSISTANT_SKILLS = [
  'Comment marche mon fil ?',
  'Comment suis-je payé ?',
  'Qui peut voir mon arbre ?',
  'Créer un mémorial',
]

/**
 * The tiers as they are sold today. The free tier carries advertising, which
 * is why the design's "sans publicité ciblée" does not appear on this page.
 */
export const PLANS = [
  {
    name: 'Gratuit', price: '0 $', cta: 'S’inscrire', tone: 'plain' as const,
    features: ['Tous les modules', 'Un algorithme de fil', 'Avec publicité'],
  },
  {
    name: 'Basic', price: '3,99 $', cta: 'Choisir Basic', tone: 'paper' as const,
    features: ['Tout le Gratuit', 'Trois algorithmes de fil', 'Traduction prioritaire', 'Sans publicité'],
  },
  {
    name: 'Premium', price: '9,99 $', cta: 'Choisir Premium', tone: 'night' as const,
    // Heritage AI belongs to the family tree; the same swap as PricingTeaser.
    features: ['Tout le Basic', 'Les 15 algorithmes', FEATURES.familyTree ? 'Heritage AI' : 'Vidéo 4K', 'Creator Studio Pro'],
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
    n: '01', title: 'Vos messages, chiffrés sur nos serveurs',
    text: 'Messages et fichiers sont stockés chiffrés : une copie de la base ne révèle rien. Vous décidez qui peut vous écrire, vous inviter ou vous ajouter à sa famille.',
  },
  {
    n: '02', title: 'Partir quand vous voulez',
    text: 'Désactivez ou supprimez votre compte depuis vos réglages, sans justification à donner.',
  },
  {
    n: '03', title: 'Un fil que vous comprenez',
    text: 'Chaque publication indique pourquoi elle vous est montrée, et le mode Abonnements reste strictement chronologique.',
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
  { to: '/platform', label: 'Plateforme' },
  { to: '/feeds', label: 'Fils' },
  { to: '/family', label: 'Famille' },
  { to: '/creators', label: 'Créateurs' },
  { to: '/pricing', label: 'Tarifs' },
])

export const NAV_MORE = openLinks([
  { to: '/memorials', label: 'Mémoriaux' },
  { to: '/commerce', label: 'Commerce' },
  { to: '/payments', label: 'Paiements' },
  { to: '/safety', label: 'Sécurité' },
  { to: '/developers', label: 'Développeurs' },
  { to: '/assistant', label: 'Assistant Kinjy' },
  { to: '/app', label: 'L’application' },
])

const ALL_FOOTER_COLUMNS: { title: string; links: PageLink[] }[] = [
  {
    title: 'Plateforme',
    links: [
      { to: '/platform', label: 'Tous les modules' },
      { to: '/feeds', label: 'Fils et algorithmes' },
      { to: '/family', label: 'Arbre familial' },
      { to: '/memorials', label: 'Cimetière numérique' },
      { to: '/app', label: 'L’application' },
    ],
  },
  {
    title: 'Confiance',
    links: [
      { to: '/safety', label: 'Sécurité et modération' },
      { to: '/safety', label: 'Confidentialité' },
      { to: '/safety', label: 'Transparence' },
      { to: '/safety', label: 'Suppression du compte' },
    ],
  },
  {
    title: 'Économie',
    links: [
      { to: '/creators', label: 'Creator Studio' },
      { to: '/commerce', label: 'Marketplace' },
      { to: '/commerce', label: 'Publicité' },
      { to: '/payments', label: 'Paiements et crypto' },
      { to: '/creators', label: 'Kinjy Leaders' },
    ],
  },
  {
    title: 'Développeurs',
    links: [
      { to: '/developers', label: 'Développeurs' },
      { to: '/developers', label: 'AI Gateway' },
      { to: '/feeds', label: 'Marketplace d’algorithmes' },
      { to: '/assistant', label: 'Assistant Kinjy' },
    ],
  },
]

/** A column whose every page is closed goes too, rather than stand empty. */
export const FOOTER_COLUMNS = ALL_FOOTER_COLUMNS
  .map((col) => ({ ...col, links: openLinks(col.links) }))
  .filter((col) => col.links.length > 0)
