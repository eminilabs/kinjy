var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/components/assistant/knowledgeBase.ts
var knowledgeBase_exports = {};
__export(knowledgeBase_exports, {
  DEFAULT_SUGGESTIONS: () => DEFAULT_SUGGESTIONS,
  INGEST_LOG: () => INGEST_LOG,
  KB_BY_ID: () => KB_BY_ID,
  KB_ENTRIES: () => KB_ENTRIES,
  KB_LAST_SYNC: () => KB_LAST_SYNC,
  KB_VERSION: () => KB_VERSION,
  LANG_META: () => LANG_META,
  MODULE_CONTEXTS: () => MODULE_CONTEXTS,
  UI_STRINGS: () => UI_STRINGS,
  contextForPath: () => contextForPath,
  detectLanguage: () => detectLanguage,
  fmt: () => fmt,
  matchEntry: () => matchEntry
});
module.exports = __toCommonJS(knowledgeBase_exports);
var LANG_META = {
  en: { label: "English", dir: "ltr" },
  sw: { label: "Kiswahili", dir: "ltr" },
  fr: { label: "Fran\xE7ais", dir: "ltr" },
  ar: { label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", dir: "rtl" },
  zh: { label: "\u4E2D\u6587", dir: "ltr" }
};
var KB_VERSION = "v2.16.0";
var KB_LAST_SYNC = "just now";
var INGEST_LOG = [
  `${KB_VERSION} \u2014 "Wave-2 feature coverage completed" \u2192 17 answers added, 85 locales regenerated, evals passed`,
  'v2.15.0 \u2014 "NowPayments crypto rail + $1 cashout engine shipped" \u2192 6 answers added, 26 locales regenerated, evals passed',
  `v2.14.0 \u2014 "Leader's Pool fraud review step added" \u2192 3 answers updated, 1 demo clip re-rendered`,
  'v2.13.2 \u2014 "Side-by-side translation view shipped" \u2192 2 answers updated, captions refreshed',
  'v2.13.1 \u2014 "City ad sponsorship floor from $5/day" \u2192 1 answer updated, evals passed',
  'v2.13.0 \u2014 "Passkeys: hardware-key backup" \u2192 1 answer updated, 4 locales regenerated'
];
var KB_ENTRIES = [
  {
    id: "feed-modes",
    title: { en: "Feed modes", sw: "Njia za Mlisho", fr: "Modes de fil", ar: "\u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u062E\u0644\u0627\u0635\u0629", zh: "\u4FE1\u606F\u6D41\u6A21\u5F0F" },
    module: "Feeds guide",
    version: "v2.14.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["feed", "feed mode", "for you", "following", "trending", "new mode", "why am i seeing", "mlisho", "fil", "fil d\u2019actualit\xE9", "\u0627\u0644\u062E\u0644\u0627\u0635\u0629", "\u4FE1\u606F\u6D41", "\u0644\u0645\u0627\u0630\u0627 \u0623\u0631\u0649"],
    answer: {
      en: 'Kaluta replaces the single opaque newsfeed with 10 explicit feed modes: Following (strict reverse-chronological), For You (AI-personalized), Circles, Friends, Local, Country, Global, Topics, Trending and New. Switch modes with the gold chips above any feed. Every recommended post carries "Why am I seeing this?", "Show less like this" and "Change my algorithm" \u2014 your agency is first-class UI, not a footnote.',
      sw: 'Kaluta inabadilisha mlisho mmoja usioeleweka kuwa njia 10 wazi: Following (mpangilio wa kisasa), For You (ubinafsishaji wa AI), Circles, Friends, Local, Country, Global, Topics, Trending na New. Badilisha kwa vitambaa vya dhahabu juu ya mlisho wowote. Kila chapisho linalopendekezwa lina "Kwa nini naona hili?", "Onyesha machache kama haya" na "Badilisha algorithm yangu".',
      fr: "Kaluta remplace le fil unique et opaque par 10 modes explicites : Following (chronologique strict), For You (personnalis\xE9 par IA), Circles, Friends, Local, Country, Global, Topics, Trending et New. Changez de mode via les pastilles dor\xE9es au-dessus du fil. Chaque publication recommand\xE9e affiche \xAB Pourquoi je vois ceci ? \xBB, \xAB Moins de contenu similaire \xBB et \xAB Changer mon algorithme \xBB.",
      ar: '\u062A\u0633\u062A\u0628\u062F\u0644 \u0643\u0627\u0644\u0648\u062A\u0627 \u0627\u0644\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u0648\u0627\u062D\u062F\u0629 \u0627\u0644\u063A\u0627\u0645\u0636\u0629 \u0628\u0639\u0634\u0631\u0629 \u0623\u0648\u0636\u0627\u0639 \u0635\u0631\u064A\u062D\u0629: \u0627\u0644\u0645\u062A\u0627\u0628\u064E\u0639\u0648\u0646 (\u0632\u0645\u0646\u064A \u0639\u0643\u0633\u064A \u0635\u0627\u0631\u0645)\u060C \u0644\u0643 (\u062A\u062E\u0635\u064A\u0635 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A)\u060C \u0627\u0644\u062F\u0648\u0627\u0626\u0631\u060C \u0627\u0644\u0623\u0635\u062F\u0642\u0627\u0621\u060C \u0627\u0644\u0645\u062D\u0644\u064A\u060C \u0627\u0644\u0628\u0644\u062F\u060C \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u060C \u0627\u0644\u0645\u0648\u0627\u0636\u064A\u0639\u060C \u0627\u0644\u0631\u0627\u0626\u062C \u0648\u0627\u0644\u062C\u062F\u064A\u062F. \u0628\u062F\u0651\u0644 \u0627\u0644\u0648\u0636\u0639 \u0645\u0646 \u0627\u0644\u0631\u0642\u0627\u0626\u0642 \u0627\u0644\u0630\u0647\u0628\u064A\u0629 \u0623\u0639\u0644\u0649 \u0623\u064A \u062E\u0644\u0627\u0635\u0629. \u0643\u0644 \u0645\u0646\u0634\u0648\u0631 \u0645\u0642\u062A\u0631\u062D \u064A\u062D\u0645\u0644 "\u0644\u0645\u0627\u0630\u0627 \u0623\u0631\u0649 \u0647\u0630\u0627\u061F" \u0648"\u0623\u0638\u0647\u0631 \u0623\u0642\u0644 \u0645\u0646 \u0647\u0630\u0627" \u0648"\u063A\u064A\u0651\u0631 \u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629".',
      zh: 'Kaluta \u7528 10 \u79CD\u660E\u786E\u7684\u4FE1\u606F\u6D41\u6A21\u5F0F\u53D6\u4EE3\u5355\u4E00\u4E0D\u900F\u660E\u52A8\u6001\uFF1AFollowing\uFF08\u4E25\u683C\u65F6\u95F4\u5012\u5E8F\uFF09\u3001For You\uFF08AI \u4E2A\u6027\u5316\uFF09\u3001Circles\u3001Friends\u3001Local\u3001Country\u3001Global\u3001Topics\u3001Trending \u548C New\u3002\u901A\u8FC7\u4FE1\u606F\u6D41\u4E0A\u65B9\u7684\u91D1\u8272\u6807\u7B7E\u5207\u6362\u3002\u6BCF\u6761\u63A8\u8350\u5185\u5BB9\u90FD\u5E26\u6709"\u4E3A\u4EC0\u4E48\u6211\u770B\u5230\u8FD9\u4E2A\uFF1F"\u3001"\u5C11\u770B\u7C7B\u4F3C\u5185\u5BB9"\u548C"\u66F4\u6362\u6211\u7684\u7B97\u6CD5"\u3002'
    },
    steps: [
      "Open any feed and look at the gold mode chips on top.",
      "Tap a mode \u2014 e.g. Following for pure reverse-chronological order.",
      'On any recommended post, open "Why am I seeing this?" for the exact reason chips.'
    ],
    image: "/app-feed-mock.jpg",
    imageAlt: "Kaluta feed in Cloud mode with gold feed-mode chips",
    deepLink: { to: "/feeds", label: "Open Feeds" }
  },
  {
    id: "algorithm-marketplace",
    title: { en: "Algorithm Marketplace", sw: "Soko la Algorithm", fr: "March\xE9 des algorithmes", ar: "\u0633\u0648\u0642 \u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0627\u062A", zh: "\u7B97\u6CD5\u5E02\u573A" },
    module: "Feeds guide",
    version: "v2.14.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["algorithm", "marketplace", "chronological", "family first", "change my algorithm", "ranking", "algorithmi", "algorithme", "\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629", "\u7B97\u6CD5", "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629", "badilisha algorithm"],
    answer: {
      en: "You choose the ranking brain of your feed. The Algorithm Marketplace offers 15 user-selectable algorithms \u2014 Chronological, Friends First, Family First, Local News, Business, Technology, Entertainment, Learning, Politics, Positive Content, Long-form, Video Only, Audio Only, New Creators and Global Discovery. Developers can publish their own feed algorithms via API, and you can install them like apps.",
      sw: "Wewe mwenyewe unachagua algorithm ya mlisho wako. Soko la Algorithm lina algorithm 15 za kuchagua \u2014 Chronological, Friends First, Family First, Local News, Business, Technology, Entertainment, Learning, Politics, Positive Content, Long-form, Video Only, Audio Only, New Creators na Global Discovery. Wasanidi wanaweza kuchapisha algorithm zao kupitia API.",
      fr: "C\u2019est vous qui choisissez le cerveau de votre fil. Le March\xE9 des algorithmes propose 15 algorithmes s\xE9lectionnables \u2014 Chronological, Friends First, Family First, Local News, Business, Technology, Entertainment, Learning, Politics, Positive Content, Long-form, Video Only, Audio Only, New Creators et Global Discovery. Les d\xE9veloppeurs peuvent publier leurs propres algorithmes via l\u2019API.",
      ar: "\u0623\u0646\u062A \u0645\u0646 \u064A\u062E\u062A\u0627\u0631 \u0639\u0642\u0644 \u062A\u0631\u062A\u064A\u0628 \u062E\u0644\u0627\u0635\u062A\u0643. \u064A\u0648\u0641\u0631 \u0633\u0648\u0642 \u0627\u0644\u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0627\u062A 15 \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u062E\u062A\u064A\u0627\u0631 \u2014 \u0627\u0644\u0632\u0645\u0646\u064A\u0629\u060C \u0627\u0644\u0623\u0635\u062F\u0642\u0627\u0621 \u0623\u0648\u0644\u0627\u064B\u060C \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0623\u0648\u0644\u0627\u064B\u060C \u0627\u0644\u0623\u062E\u0628\u0627\u0631 \u0627\u0644\u0645\u062D\u0644\u064A\u0629\u060C \u0627\u0644\u0623\u0639\u0645\u0627\u0644\u060C \u0627\u0644\u062A\u0642\u0646\u064A\u0629\u060C \u0627\u0644\u062A\u0631\u0641\u064A\u0647\u060C \u0627\u0644\u062A\u0639\u0644\u0645\u060C \u0627\u0644\u0633\u064A\u0627\u0633\u0629\u060C \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A\u060C \u0627\u0644\u0637\u0648\u064A\u0644\u060C \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0641\u0642\u0637\u060C \u0627\u0644\u0635\u0648\u062A \u0641\u0642\u0637\u060C \u0627\u0644\u0645\u0628\u062F\u0639\u0648\u0646 \u0627\u0644\u062C\u062F\u062F \u0648\u0627\u0644\u0627\u0633\u062A\u0643\u0634\u0627\u0641 \u0627\u0644\u0639\u0627\u0644\u0645\u064A. \u0648\u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0637\u0648\u0631\u064A\u0646 \u0646\u0634\u0631 \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0627\u062A\u0647\u0645 \u0639\u0628\u0631 \u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0628\u0631\u0645\u062C\u0629.",
      zh: "\u7531\u4F60\u9009\u62E9\u4FE1\u606F\u6D41\u7684\u6392\u5E8F\u5927\u8111\u3002\u7B97\u6CD5\u5E02\u573A\u63D0\u4F9B 15 \u79CD\u53EF\u9009\u7B97\u6CD5\u2014\u2014\u65F6\u95F4\u987A\u5E8F\u3001\u597D\u53CB\u4F18\u5148\u3001\u5BB6\u4EBA\u4F18\u5148\u3001\u672C\u5730\u65B0\u95FB\u3001\u5546\u4E1A\u3001\u79D1\u6280\u3001\u5A31\u4E50\u3001\u5B66\u4E60\u3001\u65F6\u653F\u3001\u6B63\u80FD\u91CF\u3001\u957F\u6587\u3001\u4EC5\u89C6\u9891\u3001\u4EC5\u97F3\u9891\u3001\u65B0\u521B\u4F5C\u8005\u548C\u5168\u7403\u53D1\u73B0\u3002\u5F00\u53D1\u8005\u8FD8\u53EF\u4EE5\u901A\u8FC7 API \u53D1\u5E03\u81EA\u5DF1\u7684\u4FE1\u606F\u6D41\u7B97\u6CD5\u3002"
    },
    steps: [
      'Tap the mode chips above your feed, then "Change my algorithm".',
      "Browse the Marketplace \u2014 each card states what it optimizes for and who published it.",
      "Install one (Family First is a lovely start) \u2014 the feed reorders instantly and reversibly."
    ],
    image: "/assistant-illustration-1.jpg",
    imageAlt: "How to change your feed algorithm \u2014 numbered gold callouts",
    deepLink: { to: "/feeds", label: "Open Algorithm Marketplace" }
  },
  {
    id: "circles",
    title: { en: "Circles", sw: "Duruni (Circles)", fr: "Cercles", ar: "\u0627\u0644\u062F\u0648\u0627\u0626\u0631", zh: "\u5708\u5B50" },
    module: "Circles guide",
    version: "v2.12.1",
    roles: ["visitor", "member", "admin"],
    keywords: ["circle", "circles", "close friends", "private network", "smart circle", "duruni", "cercle", "\u062F\u0627\u0626\u0631\u0629", "\u062F\u0648\u0627\u0626\u0631", "\u5708\u5B50"],
    answer: {
      en: "Circles are your private, filtered networks \u2014 Family, Close Friends, Business, Customers, plus Smart Circles that maintain themselves from your interaction patterns (always visible and editable). Post to a circle and only that circle sees it; each circle can have its own feed mode and notification rules.",
      sw: "Circles ni mitandao yako ya faragha \u2014 Family, Close Friends, Business, Customers, na Smart Circles zinazojitengeneza kutoka kwa mwingiliano wako (unaona na kuhariri kila wakati). Chapisho la duru moja huonekana na duru hiyo pekee.",
      fr: "Les Cercles sont vos r\xE9seaux priv\xE9s et filtr\xE9s \u2014 Famille, Amis proches, Affaires, Clients, plus des Smart Circles auto-entretenus selon vos interactions (toujours visibles et modifiables). Une publication dans un cercle n\u2019est visible que par ce cercle.",
      ar: "\u0627\u0644\u062F\u0648\u0627\u0626\u0631 \u0647\u064A \u0634\u0628\u0643\u0627\u062A\u0643 \u0627\u0644\u062E\u0627\u0635\u0629 \u0627\u0644\u0645\u0635\u0641\u0651\u0627\u0629 \u2014 \u0627\u0644\u0639\u0627\u0626\u0644\u0629\u060C \u0627\u0644\u0623\u0635\u062F\u0642\u0627\u0621 \u0627\u0644\u0645\u0642\u0631\u0628\u0648\u0646\u060C \u0627\u0644\u0623\u0639\u0645\u0627\u0644\u060C \u0627\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u062F\u0648\u0627\u0626\u0631 \u0630\u0643\u064A\u0629 \u062A\u064F\u062D\u062F\u064E\u0651\u062B \u0645\u0646 \u0623\u0646\u0645\u0627\u0637 \u062A\u0641\u0627\u0639\u0644\u0643 (\u0645\u0631\u0626\u064A\u0629 \u0648\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644 \u062F\u0627\u0626\u0645\u064B\u0627). \u0645\u0627 \u062A\u0646\u0634\u0631\u0647 \u0641\u064A \u062F\u0627\u0626\u0631\u0629 \u0644\u0627 \u064A\u0631\u0627\u0647 \u0625\u0644\u0627 \u0623\u0639\u0636\u0627\u0624\u0647\u0627.",
      zh: "\u5708\u5B50\u662F\u4F60\u7684\u79C1\u5BC6\u7B5B\u9009\u7F51\u7EDC\u2014\u2014\u5BB6\u4EBA\u3001\u5BC6\u53CB\u3001\u5546\u52A1\u3001\u5BA2\u6237\uFF0C\u4EE5\u53CA\u6839\u636E\u4F60\u7684\u4E92\u52A8\u6A21\u5F0F\u81EA\u52A8\u7EF4\u62A4\u7684\u667A\u80FD\u5708\u5B50\uFF08\u59CB\u7EC8\u53EF\u89C1\u53EF\u7F16\u8F91\uFF09\u3002\u53D1\u5E03\u5230\u67D0\u4E2A\u5708\u5B50\u7684\u5185\u5BB9\u4EC5\u8BE5\u5708\u5B50\u53EF\u89C1\u3002"
    },
    deepLink: { to: "/platform", label: "See Circles" }
  },
  {
    id: "communities",
    title: { en: "Communities & Groups", sw: "Jumuiya na Vikundi", fr: "Communaut\xE9s & Groupes", ar: "\u0627\u0644\u0645\u062C\u062A\u0645\u0639\u0627\u062A \u0648\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A", zh: "\u793E\u533A\u4E0E\u7FA4\u7EC4" },
    module: "Communities guide",
    version: "v2.12.1",
    roles: ["visitor", "member", "admin"],
    keywords: ["community", "communities", "group", "groups", "paid group", "jumuiya", "kikundi", "communaut\xE9", "groupe", "\u0645\u062C\u062A\u0645\u0639", "\u0645\u062C\u0645\u0648\u0639\u0629", "\u793E\u533A", "\u7FA4\u7EC4"],
    answer: {
      en: "Communities are public, private, secret or paid groups built around any interest. Paid communities plug into the creator economy (the 40/5/1\xD79/46 revenue split applies to membership income), and every community gets AI Community Managers for summaries, duplicate detection and Q&A from its own knowledge.",
      sw: "Jumuiya ni vikundi vya umma, faragha, siri au vya kulipia vinavyojengwa kuhusu maslahi yoyote. Jumuiya za kulipia huunganishwa na uchumi wa waundaji, na kila jumuiya ina Wasimamizi wa AI kwa muhtasari na maswali na majibu.",
      fr: "Les communaut\xE9s sont des groupes publics, priv\xE9s, secrets ou payants autour de n\u2019importe quel int\xE9r\xEAt. Les communaut\xE9s payantes s\u2019int\xE8grent \xE0 l\u2019\xE9conomie cr\xE9ateur, et chaque communaut\xE9 dispose de gestionnaires IA pour r\xE9sum\xE9s, d\xE9tection de doublons et questions-r\xE9ponses.",
      ar: "\u0627\u0644\u0645\u062C\u062A\u0645\u0639\u0627\u062A \u0647\u064A \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0639\u0627\u0645\u0629 \u0623\u0648 \u062E\u0627\u0635\u0629 \u0623\u0648 \u0633\u0631\u064A\u0629 \u0623\u0648 \u0645\u062F\u0641\u0648\u0639\u0629 \u062D\u0648\u0644 \u0623\u064A \u0627\u0647\u062A\u0645\u0627\u0645. \u0627\u0644\u0645\u062C\u062A\u0645\u0639\u0627\u062A \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0629 \u062A\u0646\u062F\u0645\u062C \u0645\u0639 \u0627\u0642\u062A\u0635\u0627\u062F \u0627\u0644\u0645\u0628\u062F\u0639\u064A\u0646\u060C \u0648\u0643\u0644 \u0645\u062C\u062A\u0645\u0639 \u064A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0645\u062F\u064A\u0631\u064A \u0645\u062C\u062A\u0645\u0639 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0644\u062A\u0644\u062E\u064A\u0635 \u0648\u0643\u0634\u0641 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0639\u0646 \u0627\u0644\u0623\u0633\u0626\u0644\u0629.",
      zh: "\u793E\u533A\u662F\u56F4\u7ED5\u4EFB\u4F55\u5174\u8DA3\u5EFA\u7ACB\u7684\u516C\u5F00\u3001\u79C1\u5BC6\u3001\u79D8\u5BC6\u6216\u4ED8\u8D39\u7FA4\u7EC4\u3002\u4ED8\u8D39\u793E\u533A\u63A5\u5165\u521B\u4F5C\u8005\u7ECF\u6D4E\uFF08\u4F1A\u5458\u6536\u5165\u9002\u7528 40/5/1\xD79/46 \u5206\u6210\uFF09\uFF0C\u6BCF\u4E2A\u793E\u533A\u90FD\u6709 AI \u793E\u533A\u7BA1\u7406\u5458\u8D1F\u8D23\u6458\u8981\u3001\u67E5\u91CD\u548C\u57FA\u4E8E\u793E\u533A\u77E5\u8BC6\u7684\u95EE\u7B54\u3002"
    },
    deepLink: { to: "/platform", label: "See Communities" }
  },
  {
    id: "forums",
    title: { en: "Forums", sw: "Majukwaa (Forums)", fr: "Forums", ar: "\u0627\u0644\u0645\u0646\u062A\u062F\u064A\u0627\u062A", zh: "\u8BBA\u575B" },
    module: "Forums guide",
    version: "v2.12.1",
    roles: ["visitor", "member", "admin"],
    keywords: ["forum", "forums", "thread", "discussion", "topic hierarchy", "jukwaa", "foro", "\u0645\u0646\u062A\u062F\u0649", "\u0645\u0646\u062A\u062F\u064A\u0627\u062A", "\u8BBA\u575B", "\u8BA8\u8BBA"],
    answer: {
      en: "Forums organize long-form discussion into geographic and topic hierarchies. AI Forum Assistants produce summaries, answer questions from forum knowledge with citations, detect duplicates, and Forum-to-Knowledge transformation turns great threads into a structured knowledge base.",
      sw: "Forums hupanga mijadala mirefu kwa ngazi za kijiografia na mada. Wasaidizi wa AI hutoa muhtasari, kujibu maswali kutoka maarifa ya jukwaa kwa nukuu, na kugeuza mijadala kuwa hifadhidata ya maarifa iliyopangwa.",
      fr: "Les forums organisent les discussions longues en hi\xE9rarchies g\xE9ographiques et th\xE9matiques. Les assistants IA de forum produisent des r\xE9sum\xE9s, r\xE9pondent avec citations, d\xE9tectent les doublons et transforment les fils en base de connaissances structur\xE9e.",
      ar: "\u062A\u0646\u0638\u0645 \u0627\u0644\u0645\u0646\u062A\u062F\u064A\u0627\u062A \u0627\u0644\u0646\u0642\u0627\u0634\u0627\u062A \u0627\u0644\u0645\u0637\u0648\u0644\u0629 \u0641\u064A \u062A\u0633\u0644\u0633\u0644\u0627\u062A \u062C\u063A\u0631\u0627\u0641\u064A\u0629 \u0648\u0645\u0648\u0636\u0648\u0639\u064A\u0629. \u0645\u0633\u0627\u0639\u062F\u0648 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u0646\u062A\u062C\u0648\u0646 \u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0648\u064A\u062C\u064A\u0628\u0648\u0646 \u0645\u0646 \u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0645\u0646\u062A\u062F\u0649 \u0645\u0639 \u0627\u0644\u0627\u0633\u062A\u0634\u0647\u0627\u062F\u0627\u062A \u0648\u064A\u0643\u0634\u0641\u0648\u0646 \u0627\u0644\u062A\u0643\u0631\u0627\u0631\u060C \u0648\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062F\u0649 \u0625\u0644\u0649 \u0645\u0639\u0631\u0641\u0629 \u064A\u062D\u0648\u0651\u0644 \u0627\u0644\u0646\u0642\u0627\u0634\u0627\u062A \u0625\u0644\u0649 \u0642\u0627\u0639\u062F\u0629 \u0645\u0639\u0631\u0641\u0629 \u0645\u0646\u0638\u0645\u0629.",
      zh: '\u8BBA\u575B\u6309\u5730\u7406\u548C\u4E3B\u9898\u5C42\u7EA7\u7EC4\u7EC7\u957F\u7BC7\u8BA8\u8BBA\u3002AI \u8BBA\u575B\u52A9\u624B\u751F\u6210\u6458\u8981\u3001\u57FA\u4E8E\u8BBA\u575B\u77E5\u8BC6\u5E26\u5F15\u7528\u5730\u56DE\u7B54\u95EE\u9898\u3001\u68C0\u6D4B\u91CD\u590D\uFF0C"\u8BBA\u575B\u8F6C\u77E5\u8BC6"\u529F\u80FD\u628A\u4F18\u8D28\u8BA8\u8BBA\u4E32\u8F6C\u5316\u4E3A\u7ED3\u6784\u5316\u77E5\u8BC6\u5E93\u3002'
    },
    deepLink: { to: "/platform", label: "See Forums" }
  },
  {
    id: "messenger",
    title: { en: "Private Messenger", sw: "Mjumbe wa Faragha", fr: "Messagerie priv\xE9e", ar: "\u0627\u0644\u0645\u0631\u0627\u0633\u0644 \u0627\u0644\u062E\u0627\u0635", zh: "\u79C1\u5BC6\u6D88\u606F" },
    module: "Messenger guide",
    version: "v2.13.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["message", "messages", "messenger", "chat", "call", "voice call", "video call", "e2e", "encrypted", "ujumbe", "messagerie", "\u0631\u0633\u0627\u0644\u0629", "\u0645\u062D\u0627\u062F\u062B\u0629", "\u6D88\u606F", "\u804A\u5929", "\u901A\u8BDD"],
    answer: {
      en: "The Private Messenger offers end-to-end encrypted one-to-one and group chats with voice and video calls. Messages auto-translate across languages when both parties opt in, and translation is processed through the provider-independent Language Gateway \u2014 never stored as plaintext beyond your devices.",
      sw: "Mjumbe wa Faragha una gumzo la mtu kwa mtu na vikundi vilivyosimbwa kwa njia fiche (E2E) pamoja na simu za sauti na video. Ujumbe hutafsiriwa kiotomatiki kati ya lugha pindi pande zote zinapokubali.",
      fr: "La messagerie priv\xE9e propose des discussions chiffr\xE9es de bout en bout, individuelles ou en groupe, avec appels audio et vid\xE9o. Les messages se traduisent automatiquement d\xE8s que les deux parties l\u2019activent.",
      ar: "\u064A\u0648\u0641\u0631 \u0627\u0644\u0645\u0631\u0627\u0633\u0644 \u0627\u0644\u062E\u0627\u0635 \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0641\u0631\u062F\u064A\u0629 \u0648\u062C\u0645\u0627\u0639\u064A\u0629 \u0645\u0634\u0641\u0631\u0629 \u0637\u0631\u0641\u064B\u0627 \u0644\u0637\u0631\u0641 \u0645\u0639 \u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0635\u0648\u062A\u064A\u0629 \u0648\u0645\u0631\u0626\u064A\u0629. \u062A\u064F\u062A\u0631\u062C\u0645 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0628\u064A\u0646 \u0627\u0644\u0644\u063A\u0627\u062A \u0639\u0646\u062F\u0645\u0627 \u064A\u0648\u0627\u0641\u0642 \u0627\u0644\u0637\u0631\u0641\u0627\u0646.",
      zh: "\u79C1\u5BC6\u6D88\u606F\u63D0\u4F9B\u7AEF\u5230\u7AEF\u52A0\u5BC6\u7684\u4E00\u5BF9\u4E00\u548C\u7FA4\u7EC4\u804A\u5929\uFF0C\u652F\u6301\u8BED\u97F3\u548C\u89C6\u9891\u901A\u8BDD\u3002\u53CC\u65B9\u540C\u610F\u540E\u6D88\u606F\u53EF\u8DE8\u8BED\u8A00\u81EA\u52A8\u7FFB\u8BD1\uFF0C\u7FFB\u8BD1\u7ECF\u7531\u72EC\u7ACB\u4E8E\u4F9B\u5E94\u5546\u7684\u8BED\u8A00\u7F51\u5173\u5904\u7406\u3002"
    },
    deepLink: { to: "/platform", label: "See Messenger" }
  },
  {
    id: "creator-studio",
    title: { en: "Creator Studio & One-to-Many", sw: "Studio ya Mwandaji", fr: "Studio Cr\xE9ateur", ar: "\u0627\u0633\u062A\u0648\u062F\u064A\u0648 \u0627\u0644\u0645\u0628\u062F\u0639\u064A\u0646", zh: "\u521B\u4F5C\u8005\u5DE5\u4F5C\u5BA4" },
    module: "Creator Studio guide",
    version: "v2.14.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["creator", "studio", "one-to-many", "publish", "formats", "newsletter", "podcast", "copilot", "mwandaji", "cr\xE9ateur", "\u0645\u0646\u0634\u0626", "\u0627\u0633\u062A\u0648\u062F\u064A\u0648", "\u521B\u4F5C\u8005", "\u53D1\u5E03", "\u0623\u062E\u0630"],
    answer: {
      en: "Create once, publish everywhere. The One-to-Many Publishing Engine turns a single idea into an article, short video, long video, audio episode, carousel, newsletter and translations. The AI copilot drafts, schedules and adapts tone per format \u2014 you approve every output before it ships.",
      sw: "Unda mara moja, chapisha kote. Injini ya One-to-Many hugeuza wazo moja kuwa makala, video fupi, video ndefu, sauti, carousel, jarida na tafsiri. Msaidizi wa AI huandaa rasimu na kuratibu \u2014 wewe huidhinisha kila toleo kabla halijachapishwa.",
      fr: "Cr\xE9ez une fois, publiez partout. Le moteur One-to-Many transforme une id\xE9e en article, vid\xE9o courte, vid\xE9o longue, \xE9pisode audio, carrousel, newsletter et traductions. Le copilote IA r\xE9dige et planifie \u2014 vous validez chaque sortie avant publication.",
      ar: '\u0623\u0646\u0634\u0626 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0648\u0627\u0646\u0634\u0631 \u0641\u064A \u0643\u0644 \u0645\u0643\u0627\u0646. \u064A\u062D\u0648\u0651\u0644 \u0645\u062D\u0631\u0643 \u0627\u0644\u0646\u0634\u0631 "\u0648\u0627\u062D\u062F \u0625\u0644\u0649 \u0645\u062A\u0639\u062F\u062F" \u0641\u0643\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0625\u0644\u0649 \u0645\u0642\u0627\u0644 \u0648\u0641\u064A\u062F\u064A\u0648 \u0642\u0635\u064A\u0631 \u0648\u0641\u064A\u062F\u064A\u0648 \u0637\u0648\u064A\u0644 \u0648\u062D\u0644\u0642\u0629 \u0635\u0648\u062A\u064A\u0629 \u0648\u0639\u0631\u0636 \u0634\u0631\u0627\u0626\u062D \u0648\u0646\u0634\u0631\u0629 \u0628\u0631\u064A\u062F\u064A\u0629 \u0648\u062A\u0631\u062C\u0645\u0627\u062A. \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u064A\u0639\u062F\u0651 \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0623\u0646\u062A \u062A\u0639\u062A\u0645\u062F \u0643\u0644 \u0646\u0627\u062A\u062C \u0642\u0628\u0644 \u0646\u0634\u0631\u0647.',
      zh: "\u4E00\u6B21\u521B\u4F5C\uFF0C\u5904\u5904\u53D1\u5E03\u3002\u4E00\u5BF9\u591A\u53D1\u5E03\u5F15\u64CE\u628A\u4E00\u4E2A\u521B\u610F\u53D8\u6210\u6587\u7AE0\u3001\u77ED\u89C6\u9891\u3001\u957F\u89C6\u9891\u3001\u97F3\u9891\u8282\u76EE\u3001\u56FE\u96C6\u3001\u65B0\u95FB\u901A\u8BAF\u548C\u591A\u8BED\u8A00\u7FFB\u8BD1\u3002AI \u526F\u9A7E\u9A76\u8D1F\u8D23\u8D77\u8349\u548C\u6392\u671F\u2014\u2014\u6BCF\u6B21\u53D1\u5E03\u524D\u90FD\u7531\u4F60\u5BA1\u6279\u3002"
    },
    steps: [
      "Open Create and describe your idea to the AI copilot.",
      "Pick target formats \u2014 article, short video, audio, newsletter\u2026",
      "Review each generated format, approve, and schedule in one flow."
    ],
    image: "/creator-formats.jpg",
    imageAlt: "One-to-Many formats: article, video, audio, newsletter as glass cards",
    deepLink: { to: "/creators", label: "Open Creator Studio" }
  },
  {
    id: "translation",
    title: { en: "Translation & Dubbing", sw: "Tafsiri na Dubbing", fr: "Traduction & Doublage", ar: "\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0648\u0627\u0644\u062F\u0628\u0644\u062C\u0629", zh: "\u7FFB\u8BD1\u4E0E\u914D\u97F3" },
    module: "Language Gateway guide",
    version: "v2.13.2",
    roles: ["visitor", "member", "admin"],
    keywords: ["translate", "translation", "dubbing", "dub", "lip sync", "subtitle", "language", "tafsiri", "traduction", "doublage", "\u062A\u0631\u062C\u0645\u0629", "\u062F\u0628\u0644\u062C\u0629", "\u7FFB\u8BD1", "\u914D\u97F3", "\u8BED\u8A00"],
    answer: {
      en: 'Kaluta translates without barriers: auto language detection, one-click "Translate \xB7 AI" chips under posts, and a side-by-side view to compare with the original. For video, the pipeline runs speech recognition \u2192 transcript \u2192 translation \u2192 subtitles \u2192 AI dubbing \u2192 voice-preserving dubbing \u2192 lip sync. A provider-independent gateway routes each job to the best model by language, quality, price, latency and privacy \u2014 dubbed media always carries the AI Generated label.',
      sw: 'Kaluta hutafsiri bila vizuizi: utambuzi wa lugha kiotomatiki, kitambaa cha "Translate \xB7 AI" chini ya machapisho, na mtazamo wa kulinganisha upande kwa upande. Kwa video: utambuzi wa hotuba \u2192 maandishi \u2192 tafsiri \u2192 manukuu \u2192 dubbing ya AI \u2192 dubbing inayohifadhi sauti \u2192 lip sync. Njia hupitia lango huru la lugha, na media iliyodubishwa hubeba lebo ya AI Generated.',
      fr: "Kaluta traduit sans barri\xE8res : d\xE9tection automatique de la langue, pastille \xAB Traduire \xB7 IA \xBB sous chaque publication et vue c\xF4te \xE0 c\xF4te. Pour la vid\xE9o : reconnaissance vocale \u2192 transcription \u2192 traduction \u2192 sous-titres \u2192 doublage IA \u2192 doublage pr\xE9servant la voix \u2192 synchronisation labiale. Une passerelle ind\xE9pendante route chaque t\xE2che vers le meilleur mod\xE8le ; les m\xE9dias doubl\xE9s portent toujours le label AI Generated.",
      ar: '\u062A\u062A\u0631\u062C\u0645 \u0643\u0627\u0644\u0648\u062A\u0627 \u0628\u0644\u0627 \u062D\u0648\u0627\u062C\u0632: \u0643\u0634\u0641 \u0627\u0644\u0644\u063A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627\u060C \u0648\u0631\u0642\u0627\u0642\u0629 "\u062A\u0631\u062C\u0645\u0629 \xB7 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A" \u062A\u062D\u062A \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A\u060C \u0648\u0639\u0631\u0636 \u062C\u0646\u0628\u064B\u0627 \u0625\u0644\u0649 \u062C\u0646\u0628 \u0645\u0639 \u0627\u0644\u0623\u0635\u0644. \u0648\u0644\u0644\u0641\u064A\u062F\u064A\u0648: \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0643\u0644\u0627\u0645 \u2190 \u0646\u0635 \u2190 \u062A\u0631\u062C\u0645\u0629 \u2190 \u062A\u0631\u062C\u0645\u0629 \u0645\u0635\u0627\u062D\u0628\u0629 \u2190 \u062F\u0628\u0644\u062C\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u2190 \u062F\u0628\u0644\u062C\u0629 \u062A\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0635\u0648\u062A \u2190 \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0634\u0641\u0627\u0647. \u062A\u0648\u062C\u0651\u0647 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u0633\u062A\u0642\u0644\u0629 \u0643\u0644 \u0645\u0647\u0645\u0629 \u0644\u0623\u0641\u0636\u0644 \u0646\u0645\u0648\u0630\u062C\u060C \u0648\u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0627\u0644\u0645\u062F\u0628\u0644\u062C\u0629 \u062A\u062D\u0645\u0644 \u062F\u0627\u0626\u0645\u064B\u0627 \u0648\u0633\u0645 "\u0645\u0648\u0644\u0651\u062F \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A".',
      zh: 'Kaluta \u5B9E\u73B0\u65E0\u969C\u788D\u7FFB\u8BD1\uFF1A\u81EA\u52A8\u8BED\u8A00\u68C0\u6D4B\u3001\u5E16\u5B50\u4E0B\u65B9\u4E00\u952E"\u7FFB\u8BD1 \xB7 AI"\u6807\u7B7E\u3001\u539F\u6587\u5BF9\u7167\u89C6\u56FE\u3002\u89C6\u9891\u5904\u7406\u7BA1\u7EBF\u4E3A\uFF1A\u8BED\u97F3\u8BC6\u522B\u2192\u8F6C\u5199\u2192\u7FFB\u8BD1\u2192\u5B57\u5E55\u2192AI \u914D\u97F3\u2192\u4FDD\u7559\u539F\u58F0\u914D\u97F3\u2192\u5507\u5F62\u540C\u6B65\u3002\u72EC\u7ACB\u8BED\u8A00\u7F51\u5173\u6309\u8BED\u8A00\u3001\u8D28\u91CF\u3001\u4EF7\u683C\u3001\u5EF6\u8FDF\u548C\u9690\u79C1\u8DEF\u7531\u5230\u6700\u4F73\u6A21\u578B\uFF1B\u914D\u97F3\u5185\u5BB9\u59CB\u7EC8\u5E26\u6709"AI \u751F\u6210"\u6807\u7B7E\u3002'
    },
    deepLink: { to: "/platform", label: "See Translation" }
  },
  {
    id: "family-tree",
    title: { en: "Family Tree", sw: "Mti wa Familia", fr: "Arbre familial", ar: "\u0634\u062C\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629", zh: "\u5BB6\u65CF\u6811" },
    module: "Family Tree guide",
    version: "v2.14.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["family", "tree", "relative", "verify", "verification", "ancestor", "cousin", "uncle", "path", "familia", "mti", "thibitisha", "famille", "arbre", "\u0639\u0627\u0626\u0644\u0629", "\u0634\u062C\u0631\u0629", "\u5BB6\u65CF", "\u4EB2\u5C5E", "\u9A8C\u8BC1"],
    answer: {
      en: 'The Family Tree is a verified genealogical graph: Person Nodes and Relationship Edges (parent_of, spouse_of, adoptive_parent_of\u2026), with derived relationships \u2014 grandparent, uncle, cousin \u2014 computed dynamically. New relatives go PENDING\u2192VERIFIED through member confirmation; deceased members need corroboration from 3 closely related members. Tools include the "How are we related?" path finder, common ancestor finder, closeness ranking and duplicate detection that never auto-merges. The AI never infers paternity, religion or ethnicity \u2014 and never fabricates relatives.',
      sw: 'Mti wa Familia ni grafu ya nasaba iliyothibitishwa: Nodi za Watu na Uhusiano (mzazi wa, mwenzi wa, mzazi wa kumpokea\u2026), na uhusiano unao tokana \u2014 babu, mjomba, binamu \u2014 huhesabiwa kiotomatiki. Jamaa mpya hupita PENDING\u2192VERIFIED kwa uthibitisho wa wanachama; marehemu huhitaji uthibitisho wa wanachama 3 wa karibu. Zana ni "Tuna uhusiano gani?" (path finder), kutafuta mzee wa pamoja, na AI haiwahi kubuni jamaa wala kudokeza baba, dini au kabila.',
      fr: "L\u2019arbre familial est un graphe g\xE9n\xE9alogique v\xE9rifi\xE9 : n\u0153uds Personne et liens de relation (parent_of, spouse_of, adoptive_parent_of\u2026), les relations d\xE9riv\xE9es \u2014 grand-parent, oncle, cousin \u2014 \xE9tant calcul\xE9es dynamiquement. Tout nouveau proche passe de PENDING \xE0 VERIFIED par confirmation des membres ; pour un d\xE9funt, 3 membres proches doivent corroborer. Outils : \xAB Quel est notre lien ? \xBB, recherche d\u2019anc\xEAtre commun, classement de proximit\xE9 et d\xE9tection de doublons sans fusion automatique. L\u2019IA n\u2019inf\xE8re jamais paternit\xE9, religion ou ethnicit\xE9 \u2014 et ne fabrique jamais de proches.",
      ar: '\u0634\u062C\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0631\u0633\u0645 \u0628\u064A\u0627\u0646\u064A \u0644\u0623\u0646\u0633\u0627\u0628 \u0645\u0648\u062B\u0651\u0642\u0629: \u0639\u0642\u062F \u0623\u0634\u062E\u0627\u0635 \u0648\u062D\u0648\u0627\u0641 \u0639\u0644\u0627\u0642\u0627\u062A (\u0648\u0627\u0644\u062F_\u0644\u0640\u060C \u0632\u0648\u062C_\u0644\u0640\u060C \u0648\u0627\u0644\u062F_\u0628\u0627\u0644\u062A\u0628\u0646\u064A\u2026)\u060C \u0648\u062A\u064F\u062D\u0633\u0628 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0642\u0629 \u2014 \u0627\u0644\u062C\u062F\u060C \u0627\u0644\u0639\u0645\u060C \u0627\u0628\u0646 \u0627\u0644\u0639\u0645 \u2014 \u062F\u064A\u0646\u0627\u0645\u064A\u0643\u064A\u064B\u0627. \u0627\u0644\u0623\u0642\u0627\u0631\u0628 \u0627\u0644\u062C\u062F\u062F \u064A\u0646\u062A\u0642\u0644\u0648\u0646 \u0645\u0646 "\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631" \u0625\u0644\u0649 "\u0645\u0648\u062B\u0651\u0642" \u0628\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0623\u0639\u0636\u0627\u0621\u061B \u0648\u0644\u0644\u0645\u062A\u0648\u0641\u064E\u0651\u064A\u0646 \u064A\u0644\u0632\u0645 \u062A\u0623\u064A\u064A\u062F 3 \u0623\u0639\u0636\u0627\u0621 \u0645\u0642\u0631\u0628\u064A\u0646. \u0627\u0644\u0623\u062F\u0648\u0627\u062A \u062A\u0634\u0645\u0644 "\u0645\u0627 \u0635\u0644\u0629 \u0642\u0631\u0627\u0628\u062A\u0646\u0627\u061F" \u0648\u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0633\u0644\u0641 \u0627\u0644\u0645\u0634\u062A\u0631\u0643 \u0648\u0643\u0634\u0641 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u062F\u0648\u0646 \u062F\u0645\u062C \u062A\u0644\u0642\u0627\u0626\u064A. \u0644\u0627 \u064A\u0633\u062A\u0646\u062A\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u062F\u064A\u0646 \u0623\u0648 \u0627\u0644\u0639\u0631\u0642 \u0623\u0628\u062F\u064B\u0627 \u0648\u0644\u0627 \u064A\u062E\u062A\u0644\u0642 \u0623\u0642\u0627\u0631\u0628.',
      zh: '\u5BB6\u65CF\u6811\u662F\u7ECF\u8FC7\u9A8C\u8BC1\u7684\u8C31\u7CFB\u56FE\u8C31\uFF1A\u4EBA\u7269\u8282\u70B9\u4E0E\u5173\u7CFB\u8FB9\uFF08parent_of\u3001spouse_of\u3001adoptive_parent_of\u2026\u2026\uFF09\uFF0C\u7956\u5B59\u3001\u53D4\u4F2F\u3001\u5802\u8868\u4EB2\u7B49\u6D3E\u751F\u5173\u7CFB\u52A8\u6001\u8BA1\u7B97\u3002\u65B0\u4EB2\u5C5E\u9700\u7ECF\u6210\u5458\u786E\u8BA4\u4ECE"\u5F85\u9A8C\u8BC1"\u8F6C\u4E3A"\u5DF2\u9A8C\u8BC1"\uFF1B\u5DF2\u6545\u6210\u5458\u9700 3 \u4F4D\u8FD1\u4EB2\u4F50\u8BC1\u3002\u5DE5\u5177\u5305\u62EC"\u6211\u4EEC\u662F\u4EC0\u4E48\u5173\u7CFB\uFF1F"\u8DEF\u5F84\u67E5\u627E\u3001\u5171\u540C\u7956\u5148\u67E5\u627E\u3001\u4EB2\u5BC6\u5EA6\u6392\u5E8F\u548C\u7EDD\u4E0D\u81EA\u52A8\u5408\u5E76\u7684\u67E5\u91CD\u3002AI \u7EDD\u4E0D\u63A8\u65AD\u4EB2\u5B50\u5173\u7CFB\u3001\u5B97\u6559\u6216\u65CF\u88D4\uFF0C\u4E5F\u7EDD\u4E0D\u865A\u6784\u4EB2\u5C5E\u3002'
    },
    steps: [
      'Open Family Tree and tap "Add relative" on any person node.',
      "Choose the relationship type \u2014 derived relations compute themselves.",
      "Ask the relative to confirm; the edge turns VERIFIED with a gold seal."
    ],
    image: "/assistant-illustration-2.jpg",
    imageAlt: "Family tree verification flow with three corroborating members",
    deepLink: { to: "/family", label: "Open Family Tree" }
  },
  {
    id: "heritage-ai",
    title: { en: "Family Heritage AI", sw: "AI ya Urithi wa Familia", fr: "IA du patrimoine familial", ar: "\u0630\u0643\u0627\u0621 \u0627\u0644\u062A\u0631\u0627\u062B \u0627\u0644\u0639\u0627\u0626\u0644\u064A", zh: "\u5BB6\u65CF\u4F20\u627F AI" },
    module: "Family Heritage guide",
    version: "v2.13.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["heritage", "archive", "old photos", "letters", "recordings", "restore", "documentary", "biography", "urithi", "picha za zamani", "patrimoine", "archives", "\u062A\u0631\u0627\u062B", "\u0623\u0631\u0634\u064A\u0641", "\u4F20\u627F", "\u8001\u7167\u7247", "\u6863\u6848"],
    answer: {
      en: "Upload old photos, letters and recordings: Family Heritage AI restores them, builds an interactive family timeline, drafts biographies and even assembles a family documentary. Original files are always preserved untouched alongside AI-enhanced copies \u2014 every enhancement is labeled and reversible.",
      sw: "Pakia picha za zamani, barua na rekodi: AI ya Urithi wa Familia huzirekebisha, kujenga ratiba maingiliano ya familia, kuandika wasifu na hata kutengeneza filamu ya familia. Faili asili huhifadhiwa bila kuguswa kando ya nakala zilizoboreshwa na AI.",
      fr: "T\xE9l\xE9versez photos anciennes, lettres et enregistrements : l\u2019IA du patrimoine les restaure, construit une frise familiale interactive, r\xE9dige des biographies et assemble m\xEAme un documentaire familial. Les fichiers originaux sont toujours conserv\xE9s intacts \xE0 c\xF4t\xE9 des copies am\xE9lior\xE9es.",
      ar: "\u0627\u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644\u0627\u062A: \u064A\u0642\u0648\u0645 \u0630\u0643\u0627\u0621 \u0627\u0644\u062A\u0631\u0627\u062B \u0627\u0644\u0639\u0627\u0626\u0644\u064A \u0628\u062A\u0631\u0645\u064A\u0645\u0647\u0627 \u0648\u0628\u0646\u0627\u0621 \u062E\u0637 \u0632\u0645\u0646\u064A \u062A\u0641\u0627\u0639\u0644\u064A \u0644\u0644\u0639\u0627\u0626\u0644\u0629 \u0648\u0635\u064A\u0627\u063A\u0629 \u0633\u064A\u0631 \u0630\u0627\u062A\u064A\u0629 \u0648\u062D\u062A\u0649 \u062A\u062C\u0645\u064A\u0639 \u0641\u064A\u0644\u0645 \u0648\u062B\u0627\u0626\u0642\u064A \u0639\u0627\u0626\u0644\u064A. \u062A\u064F\u062D\u0641\u0638 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0623\u0635\u0644\u064A\u0629 \u062F\u0627\u0626\u0645\u064B\u0627 \u0643\u0645\u0627 \u0647\u064A \u0628\u062C\u0627\u0646\u0628 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0645\u062D\u0633\u0651\u0646\u0629.",
      zh: "\u4E0A\u4F20\u8001\u7167\u7247\u3001\u4FE1\u4EF6\u548C\u5F55\u97F3\uFF1A\u5BB6\u65CF\u4F20\u627F AI \u4F1A\u4FEE\u590D\u5B83\u4EEC\uFF0C\u6784\u5EFA\u4E92\u52A8\u5BB6\u65CF\u65F6\u95F4\u7EBF\u3001\u64B0\u5199\u4F20\u8BB0\uFF0C\u751A\u81F3\u5236\u4F5C\u5BB6\u65CF\u7EAA\u5F55\u7247\u3002\u539F\u59CB\u6587\u4EF6\u59CB\u7EC8\u539F\u6837\u4FDD\u7559\uFF0CAI \u589E\u5F3A\u526F\u672C\u5747\u6709\u6807\u6CE8\u4E14\u53EF\u9006\u3002"
    },
    image: "/family-archive-2.jpg",
    imageAlt: "Old letters, a fountain pen and a sepia portrait on cream linen",
    deepLink: { to: "/family", label: "Open Heritage AI" }
  },
  {
    id: "graveyard",
    title: { en: "Digital Graveyard", sw: "Makaburi ya Kidijitali", fr: "Cimeti\xE8re num\xE9rique", ar: "\u0627\u0644\u0645\u0642\u0628\u0631\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629", zh: "\u6570\u5B57\u7EAA\u5FF5\u56ED" },
    module: "Memorials guide",
    version: "v2.13.1",
    roles: ["visitor", "member", "admin"],
    keywords: ["memorial", "graveyard", "grave", "candle", "flower", "deceased", "qr", "condolence", "makaburi", "mnara", "m\xE9morial", "cimeti\xE8re", "\u0646\u0635\u0628", "\u0645\u0642\u0628\u0631\u0629", "\u0634\u0645\u0639\u0629", "\u7EAA\u5FF5", "\u8721\u70DB", "\u8BA3\u544A"],
    answer: {
      en: "The Digital Graveyard hosts verified memorials: biography, timeline, photos, videos and voice, guest book and condolences, digital flowers & candles (free and paid), verified grave location with QR memorial codes, and anniversary reminders (10 days, 3 days, 6 hours). Up to 3 administrators manage each memorial with succession rules; death verification flows UNCONFIRMED\u2192REPORTED\u2192UNDER REVIEW\u2192VERIFIED, and faith styles are chosen only from documented wishes \u2014 never inferred by AI.",
      sw: "Makaburi ya Kidijitali huhifadhi kumbukumbu zilizothibitishwa: wasifu, ratiba, picha, video na sauti, kitabu cha wageni, maua na mishumaa ya kidijitali (bure na ya kulipia), eneo la kaburi lililothibitishwa na misimbo ya QR, na vikumbusho vya kumbukumbu. Wasimamizi hadi 3 huisimamia kumbukumbu kwa sheria za urithi; uthibitisho wa kifo hupita UNCONFIRMED\u2192REPORTED\u2192UNDER REVIEW\u2192VERIFIED.",
      fr: "Le Cimeti\xE8re num\xE9rique h\xE9berge des m\xE9moriaux v\xE9rifi\xE9s : biographie, frise, photos, vid\xE9os et voix, livre d\u2019or et condol\xE9ances, fleurs et bougies num\xE9riques (gratuites et payantes), localisation v\xE9rifi\xE9e de la tombe avec codes QR et rappels d\u2019anniversaire (10 j, 3 j, 6 h). Jusqu\u2019\xE0 3 administrateurs avec r\xE8gles de succession ; la v\xE9rification du d\xE9c\xE8s suit UNCONFIRMED\u2192REPORTED\u2192UNDER REVIEW\u2192VERIFIED ; les styles confessionnels ne viennent que de volont\xE9s document\xE9es \u2014 jamais d\xE9duits par l\u2019IA.",
      ar: '\u062A\u0633\u062A\u0636\u064A\u0641 \u0627\u0644\u0645\u0642\u0628\u0631\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0646\u064F\u0635\u064F\u0628\u064B\u0627 \u062A\u0630\u0643\u0627\u0631\u064A\u0629 \u0645\u0648\u062B\u0651\u0642\u0629: \u0633\u064A\u0631\u0629 \u0630\u0627\u062A\u064A\u0629 \u0648\u062E\u0637 \u0632\u0645\u0646\u064A \u0648\u0635\u0648\u0631 \u0648\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A \u0648\u0635\u0648\u062A \u0648\u0633\u062C\u0644 \u0632\u0648\u0627\u0631 \u0648\u062A\u0639\u0627\u0632\u064D \u0648\u0632\u0647\u0648\u0631 \u0648\u0634\u0645\u0648\u0639 \u0631\u0642\u0645\u064A\u0629 (\u0645\u062C\u0627\u0646\u064A\u0629 \u0648\u0645\u062F\u0641\u0648\u0639\u0629) \u0648\u0645\u0648\u0642\u0639 \u0642\u0628\u0631 \u0645\u0648\u062B\u0651\u0642 \u0645\u0639 \u0631\u0645\u0648\u0632 QR \u0648\u062A\u0630\u0643\u064A\u0631\u0627\u062A \u0628\u0627\u0644\u0630\u0643\u0631\u0649. \u062D\u062A\u0649 3 \u0645\u062F\u064A\u0631\u064A\u0646 \u0644\u0643\u0644 \u0646\u0635\u0628 \u0645\u0639 \u0642\u0648\u0627\u0639\u062F \u062A\u0639\u0627\u0642\u0628\u061B \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0648\u0641\u0627\u0629 \u064A\u0645\u0631 \u0628\u0645\u0631\u0627\u062D\u0644 "\u063A\u064A\u0631 \u0645\u0624\u0643\u062F \u2190 \u0645\u064F\u0628\u0644\u064E\u0651\u063A \u2190 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u2190 \u0645\u0648\u062B\u0651\u0642"\u060C \u0648\u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u0637\u0642\u0648\u0633 \u062A\u064F\u062E\u062A\u0627\u0631 \u0641\u0642\u0637 \u0645\u0646 \u0648\u0635\u0627\u064A\u0627 \u0645\u0648\u062B\u0642\u0629 \u2014 \u0644\u0627 \u064A\u0633\u062A\u0646\u062A\u062C\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u0628\u062F\u064B\u0627.',
      zh: "\u6570\u5B57\u7EAA\u5FF5\u56ED\u6258\u7BA1\u7ECF\u8FC7\u9A8C\u8BC1\u7684\u7EAA\u5FF5\u9875\uFF1A\u4F20\u8BB0\u3001\u65F6\u95F4\u7EBF\u3001\u7167\u7247\u3001\u89C6\u9891\u548C\u8BED\u97F3\u3001\u7559\u8A00\u7C3F\u4E0E\u60BC\u5FF5\u3001\u6570\u5B57\u9C9C\u82B1\u548C\u8721\u70DB\uFF08\u514D\u8D39\u4E0E\u4ED8\u8D39\uFF09\u3001\u7ECF\u6838\u5B9E\u7684\u5893\u5730\u4F4D\u7F6E\u4E0E QR \u7EAA\u5FF5\u7801\u3001\u5468\u5E74\u63D0\u9192\uFF0810 \u5929\u30013 \u5929\u30016 \u5C0F\u65F6\uFF09\u3002\u6BCF\u4E2A\u7EAA\u5FF5\u9875\u6700\u591A 3 \u4F4D\u7BA1\u7406\u5458\u5E76\u6709\u7EE7\u627F\u89C4\u5219\uFF1B\u6B7B\u4EA1\u9A8C\u8BC1\u6D41\u7A0B\u4E3A\u672A\u786E\u8BA4\u2192\u5DF2\u62A5\u544A\u2192\u5BA1\u6838\u4E2D\u2192\u5DF2\u9A8C\u8BC1\uFF1B\u5B97\u6559\u98CE\u683C\u53EA\u4F9D\u636E\u6709\u636E\u53EF\u67E5\u7684\u9057\u613F\u9009\u62E9\u2014\u2014AI \u7EDD\u4E0D\u63A8\u65AD\u3002"
    },
    steps: [
      'Open Graveyard \u2192 "Create memorial" and add biography and photos.',
      "Invite up to 3 administrators and set succession.",
      "Place the verified grave location to generate the QR memorial code."
    ],
    image: "/memorial-hero.jpg",
    imageAlt: "A candle and white flowers on dark stone at blue hour",
    deepLink: { to: "/memorials", label: "Open Graveyard" }
  },
  {
    id: "marketplace-margin",
    title: { en: "Marketplace & Margin Model", sw: "Soko na Mfumo wa Margini", fr: "Marketplace & Marge", ar: "\u0627\u0644\u0633\u0648\u0642 \u0648\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0647\u0627\u0645\u0634", zh: "\u5E02\u573A\u4E0E\u5229\u6DA6\u6A21\u5F0F" },
    module: "Marketplace guide",
    version: "v2.12.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["marketplace", "sell", "vendor", "margin", "20%", "price", "buy", "shop", "duka", "soko", "march\xE9", "marge", "\u0633\u0648\u0642", "\u0647\u0627\u0645\u0634", "\u5E02\u573A", "\u5229\u6DA6", "\u5546\u5BB6"],
    answer: {
      en: "Vendors set their own price and Kaluta adds a flat 20% margin on top: a $100 vendor price becomes a $120 customer price \u2014 the vendor receives their $100 in full. All affiliate percentages are calculated on the $20 margin, never on the vendor\u2019s money, which keeps payouts transparent and reconcilable to the ledger.",
      sw: "Wachuuzi huweka bei yao wenyewe na Kaluta huongeza margini ya 20% juu yake: bei ya $100 ya mchuuzi huwa $120 kwa mteja \u2014 mchuuzi hupokea $100 zake kikamilifu. Asilimia zote za affiliate huhesabiwa kwenye margini ya $20, si pesa ya mchuuzi.",
      fr: "Les vendeurs fixent leur prix et Kaluta ajoute une marge fixe de 20 % : un prix vendeur de 100 $ devient 120 $ pour le client \u2014 le vendeur re\xE7oit ses 100 $ int\xE9gralement. Tous les pourcentages d\u2019affiliation sont calcul\xE9s sur la marge de 20 $, jamais sur l\u2019argent du vendeur.",
      ar: "\u064A\u062D\u062F\u062F \u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646 \u0633\u0639\u0631\u0647\u0645 \u0648\u062A\u0636\u064A\u0641 \u0643\u0627\u0644\u0648\u062A\u0627 \u0647\u0627\u0645\u0634\u064B\u0627 \u062B\u0627\u0628\u062A\u064B\u0627 20% \u0641\u0648\u0642\u0647: \u0633\u0639\u0631 100 \u062F\u0648\u0644\u0627\u0631 \u064A\u0635\u0628\u062D 120 \u0644\u0644\u0639\u0645\u064A\u0644 \u2014 \u0648\u064A\u0633\u062A\u0644\u0645 \u0627\u0644\u0628\u0627\u0626\u0639 \u0645\u0627\u0626\u062A\u0647 \u0643\u0627\u0645\u0644\u0629. \u062C\u0645\u064A\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u062A\u064F\u062D\u0633\u0628 \u0639\u0644\u0649 \u0647\u0627\u0645\u0634 \u0627\u0644\u0640 20 \u062F\u0648\u0644\u0627\u0631\u064B\u0627\u060C \u0648\u0644\u064A\u0633 \u0639\u0644\u0649 \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0628\u0627\u0626\u0639.",
      zh: "\u5546\u5BB6\u81EA\u4E3B\u5B9A\u4EF7\uFF0CKaluta \u7EDF\u4E00\u52A0\u6536 20% \u5229\u6DA6\uFF1A\u5546\u5BB6\u4EF7 100 \u7F8E\u5143\uFF0C\u987E\u5BA2\u4EF7 120 \u7F8E\u5143\u2014\u2014\u5546\u5BB6\u5168\u989D\u6536\u5230 100 \u7F8E\u5143\u3002\u6240\u6709\u63A8\u5E7F\u4F63\u91D1\u767E\u5206\u6BD4\u90FD\u6309 20 \u7F8E\u5143\u5229\u6DA6\u8BA1\u7B97\uFF0C\u7EDD\u4E0D\u52A8\u7528\u5546\u5BB6\u7684\u8D27\u6B3E\uFF0C\u8D26\u76EE\u53EF\u5BF9\u8D26\u3002"
    },
    steps: [
      "List an item at your vendor price \u2014 say $100.",
      "Kaluta shows the customer $120 (vendor price + 20% margin).",
      "On sale you receive $100; affiliates share the $20 margin per the referral chain."
    ],
    image: "/marketplace-hero.jpg",
    imageAlt: "A digital East African market stall with floating glass price tags",
    deepLink: { to: "/commerce", label: "Open Marketplace" }
  },
  {
    id: "advertising",
    title: { en: "Advertising & AI Ad Engine", sw: "Matangazo na Injini ya AI", fr: "Publicit\xE9 & Moteur IA", ar: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0648\u0645\u062D\u0631\u0643 \u0627\u0644\u0630\u0643\u0627\u0621", zh: "\u5E7F\u544A\u4E0E AI \u5E7F\u544A\u5F15\u64CE" },
    module: "Ads guide",
    version: "v2.13.1",
    roles: ["visitor", "member", "admin"],
    keywords: ["advertising", "ads", "ad", "campaign", "cpm", "cpc", "floor price", "sponsor", "tangazo", "matangazo", "publicit\xE9", "annonce", "\u0625\u0639\u0644\u0627\u0646", "\u0625\u0639\u0644\u0627\u0646\u0627\u062A", "\u5E7F\u544A", "\u7ADE\u4EF7"],
    answer: {
      en: 'Kaluta advertising runs on competitive, AI-adjusted floor pricing: Standard CPM $0.50, Premium video CPM $1.00, CPC $0.05, CPV $0.005, Engagement $0.02, Leads from $0.25, local promoted posts from $1/day, city sponsorship from $5/day, country & global by auction. Tell the AI Advertising Engine something like "a $100 campaign promoting my restaurant to people aged 25\u201345 within 20 km of Dar es Salaam" and it recommends the objective, generates creatives, selects audiences, allocates budget and A/B tests \u2014 a human always approves before launch.',
      sw: 'Matangazo ya Kaluta hutumia bei za sakafu zinazorekebishwa na AI: CPM ya kawaida $0.50, video CPM $1.00, CPC $0.05, CPV $0.005, ushiriki $0.02, miongozo kuanzia $0.25, machapisho ya eneo kuanzia $1/siku. Ambia Injini ya AI k.m. "kampeni ya $100 kutangaza mgahawa wangu kwa watu 25\u201345 ndani ya km 20 ya Dar es Salaam" na itapendekeza lengo, kutengeneza kreative na kugawa bajeti \u2014 binadamu huidhinisha kabla ya uzinduzi.',
      fr: "La publicit\xE9 Kaluta repose sur des prix planchers comp\xE9titifs ajust\xE9s par IA : CPM standard 0,50 $, CPM vid\xE9o premium 1,00 $, CPC 0,05 $, CPV 0,005 $, engagement 0,02 $, leads d\xE8s 0,25 $, posts locaux d\xE8s 1 $/jour, sponsoring de ville d\xE8s 5 $/jour, pays et monde aux ench\xE8res. Dites au moteur IA \xAB une campagne de 100 $ pour mon restaurant aupr\xE8s des 25\u201345 ans dans un rayon de 20 km autour de Dar es Salaam \xBB : il propose l\u2019objectif, g\xE9n\xE8re les cr\xE9as, cible l\u2019audience et teste en A/B \u2014 un humain valide toujours avant le lancement.",
      ar: '\u062A\u0639\u0645\u0644 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0643\u0627\u0644\u0648\u062A\u0627 \u0628\u0623\u0633\u0639\u0627\u0631 \u0623\u0631\u0636\u064A\u0629 \u062A\u0646\u0627\u0641\u0633\u064A\u0629 \u064A\u0636\u0628\u0637\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: CPM \u0642\u064A\u0627\u0633\u064A 0.50 \u062F\u0648\u0644\u0627\u0631\u060C CPM \u0641\u064A\u062F\u064A\u0648 \u0645\u0645\u064A\u0632 1.00\u060C CPC 0.05\u060C CPV 0.005\u060C \u062A\u0641\u0627\u0639\u0644 0.02\u060C \u0639\u0645\u0644\u0627\u0621 \u0645\u062D\u062A\u0645\u0644\u0648\u0646 \u0645\u0646 0.25\u060C \u0645\u0646\u0634\u0648\u0631 \u0645\u062D\u0644\u064A \u0645\u0646 \u062F\u0648\u0644\u0627\u0631 \u064A\u0648\u0645\u064A\u064B\u0627\u060C \u0648\u0631\u0639\u0627\u064A\u0629 \u0645\u062F\u064A\u0646\u0629 \u0645\u0646 5 \u062F\u0648\u0644\u0627\u0631\u0627\u062A \u064A\u0648\u0645\u064A\u064B\u0627\u060C \u0648\u0627\u0644\u062F\u0648\u0644\u0629 \u0648\u0627\u0644\u0639\u0627\u0644\u0645 \u0628\u0627\u0644\u0645\u0632\u0627\u062F. \u0623\u062E\u0628\u0631 \u0645\u062D\u0631\u0643 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0630\u0643\u064A \u0645\u062B\u0644\u064B\u0627 "\u062D\u0645\u0644\u0629 \u0628\u0640100 \u062F\u0648\u0644\u0627\u0631 \u0644\u0644\u062A\u0631\u0648\u064A\u062C \u0644\u0645\u0637\u0639\u0645\u064A \u0644\u0645\u0646 \u0623\u0639\u0645\u0627\u0631\u0647\u0645 25\u201345 \u0636\u0645\u0646 20 \u0643\u0645 \u0645\u0646 \u062F\u0627\u0631 \u0627\u0644\u0633\u0644\u0627\u0645" \u0641\u064A\u0642\u062A\u0631\u062D \u0627\u0644\u0647\u062F\u0641 \u0648\u064A\u0648\u0644\u0651\u062F \u0627\u0644\u062A\u0635\u0627\u0645\u064A\u0645 \u0648\u064A\u062E\u0635\u0635 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0648\u064A\u062E\u062A\u0628\u0631 A/B \u2014 \u0648\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0628\u0634\u0631\u064A\u0629 \u0625\u0644\u0632\u0627\u0645\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0625\u0637\u0644\u0627\u0642.',
      zh: 'Kaluta \u5E7F\u544A\u91C7\u7528 AI \u8C03\u6574\u7684\u7ADE\u4E89\u6027\u5E95\u4EF7\uFF1A\u6807\u51C6 CPM $0.50\u3001\u4F18\u8D28\u89C6\u9891 CPM $1.00\u3001CPC $0.05\u3001CPV $0.005\u3001\u4E92\u52A8 $0.02\u3001\u7EBF\u7D22 $0.25 \u8D77\u3001\u672C\u5730\u63A8\u5E7F $1/\u5929\u8D77\u3001\u57CE\u5E02\u8D5E\u52A9 $5/\u5929\u8D77\u3001\u56FD\u5BB6\u7EA7\u548C\u5168\u7403\u4EE5\u7ADE\u62CD\u5B9A\u4EF7\u3002\u53EA\u9700\u544A\u8BC9 AI \u5E7F\u544A\u5F15\u64CE"\u7528 100 \u7F8E\u5143\u5411\u8FBE\u7D2F\u65AF\u8428\u62C9\u59C6 20 \u516C\u91CC\u5185 25\u201345 \u5C81\u4EBA\u7FA4\u63A8\u5E7F\u6211\u7684\u9910\u5385"\uFF0C\u5B83\u4F1A\u63A8\u8350\u76EE\u6807\u3001\u751F\u6210\u521B\u610F\u3001\u9009\u62E9\u53D7\u4F17\u3001\u5206\u914D\u9884\u7B97\u5E76\u505A A/B \u6D4B\u8BD5\u2014\u2014\u6295\u653E\u524D\u59CB\u7EC8\u9700\u8981\u4EBA\u5DE5\u6279\u51C6\u3002'
    },
    image: "/ads-engine.jpg",
    imageAlt: "AI ad campaign radiating a 20 km circle over a night city",
    deepLink: { to: "/commerce", label: "Open Ads" }
  },
  {
    id: "subscriptions",
    title: { en: "Subscriptions & Pricing", sw: "Usajili na Bei", fr: "Abonnements & Tarifs", ar: "\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631", zh: "\u8BA2\u9605\u4E0E\u4EF7\u683C" },
    module: "Pricing guide",
    version: "v2.12.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["subscription", "pricing", "price", "premium", "basic", "free", "plan", "usajili", "bei", "abonnement", "tarif", "\u0627\u0634\u062A\u0631\u0627\u0643", "\u0633\u0639\u0631", "\u8BA2\u9605", "\u4EF7\u683C", "\u4F1A\u5458"],
    answer: {
      en: "Three tiers: Free ($0 \u2014 genuinely useful forever), Basic $3.99/mo or $39/yr (HD video, advanced translation, scheduled posts, more AI credits, newsletters), and Premium $9.99/mo or $99/yr (4K, AI Creator Studio, dubbing, lip-sync, AI clips, brand kit, custom algorithm feeds, API allowance, premium themes). One-off purchases are priced 2\u20134\xD7 the implied subscription unit cost, and KYC verification is required before payouts.",
      sw: "Ngazi tatu: Free ($0 \u2014 muhimu milele), Basic $3.99/mwezi au $39/mwaka (video HD, tafsiri za hali ya juu, machapisho yaliyoratibiwa, mikopo zaidi ya AI), na Premium $9.99/mwezi au $99/mwaka (4K, AI Creator Studio, dubbing, lip-sync, AI clips, brand kit, algorithm maalum, API). Ununuzi wa mara moja huuzwa mara 2\u20134 ya gharama ya usajili.",
      fr: "Trois niveaux : Free (0 $ \u2014 r\xE9ellement utile), Basic 3,99 $/mois ou 39 $/an (vid\xE9o HD, traduction avanc\xE9e, posts planifi\xE9s, plus de cr\xE9dits IA, newsletters) et Premium 9,99 $/mois ou 99 $/an (4K, Studio Cr\xE9ateur IA, doublage, lip-sync, clips IA, kit de marque, fils algorithmiques personnalis\xE9s, quota API, th\xE8mes premium). Les achats uniques co\xFBtent 2 \xE0 4\xD7 le co\xFBt unitaire d\u2019abonnement.",
      ar: "\u062B\u0644\u0627\u062B \u0628\u0627\u0642\u0627\u062A: \u0645\u062C\u0627\u0646\u064A\u0629 (0 \u062F\u0648\u0644\u0627\u0631 \u2014 \u0645\u0641\u064A\u062F\u0629 \u0641\u0639\u0644\u064B\u0627)\u060C \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 3.99 \u062F\u0648\u0644\u0627\u0631 \u0634\u0647\u0631\u064A\u064B\u0627 \u0623\u0648 39 \u0633\u0646\u0648\u064A\u064B\u0627 (\u0641\u064A\u062F\u064A\u0648 HD \u0648\u062A\u0631\u062C\u0645\u0629 \u0645\u062A\u0642\u062F\u0645\u0629 \u0648\u062C\u062F\u0648\u0644\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0648\u0631\u0635\u064A\u062F \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u0643\u0628\u0631)\u060C \u0648\u0627\u0644\u0645\u0645\u064A\u0632\u0629 9.99 \u0634\u0647\u0631\u064A\u064B\u0627 \u0623\u0648 99 \u0633\u0646\u0648\u064A\u064B\u0627 (4K \u0648\u0627\u0633\u062A\u0648\u062F\u064A\u0648 \u0627\u0644\u0645\u0628\u062F\u0639\u064A\u0646 \u0627\u0644\u0630\u0643\u064A \u0648\u0627\u0644\u062F\u0628\u0644\u062C\u0629 \u0648\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0634\u0641\u0627\u0647 \u0648\u0645\u0642\u0627\u0637\u0639 \u0627\u0644\u0630\u0643\u0627\u0621 \u0648\u0639\u062F\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0648\u062E\u0644\u0627\u0635\u0627\u062A \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u0645\u062E\u0635\u0635\u0629 \u0648\u062D\u0635\u0629 API). \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0646\u0641\u0631\u062F\u0629 \u062A\u064F\u0633\u0639\u0651\u0631 \u0628\u06402\u20134 \u0623\u0636\u0639\u0627\u0641 \u0643\u0644\u0641\u0629 \u0648\u062D\u062F\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643.",
      zh: "\u4E09\u4E2A\u6863\u4F4D\uFF1A\u514D\u8D39\u7248\uFF08$0\u2014\u2014\u771F\u6B63\u5B9E\u7528\uFF09\u3001\u57FA\u7840\u7248 $3.99/\u6708\u6216 $39/\u5E74\uFF08\u9AD8\u6E05\u89C6\u9891\u3001\u9AD8\u7EA7\u7FFB\u8BD1\u3001\u5B9A\u65F6\u53D1\u5E03\u3001\u66F4\u591A AI \u989D\u5EA6\u3001\u65B0\u95FB\u901A\u8BAF\uFF09\u3001\u9AD8\u7EA7\u7248 $9.99/\u6708\u6216 $99/\u5E74\uFF084K\u3001AI \u521B\u4F5C\u5DE5\u4F5C\u5BA4\u3001\u914D\u97F3\u3001\u5507\u5F62\u540C\u6B65\u3001AI \u526A\u8F91\u3001\u54C1\u724C\u5DE5\u5177\u5305\u3001\u81EA\u5B9A\u4E49\u7B97\u6CD5\u4FE1\u606F\u6D41\u3001API \u989D\u5EA6\u3001\u9AD8\u7EA7\u4E3B\u9898\uFF09\u3002\u5355\u6B21\u8D2D\u4E70\u5B9A\u4EF7\u4E3A\u8BA2\u9605\u5355\u4F4D\u6210\u672C\u7684 2\u20134 \u500D\uFF0C\u63D0\u73B0\u524D\u9700\u5B8C\u6210 KYC \u9A8C\u8BC1\u3002"
    },
    deepLink: { to: "/pricing", label: "See Pricing" }
  },
  {
    id: "kyc",
    title: { en: "KYC Verification", sw: "Uthibitisho wa KYC", fr: "V\xE9rification KYC", ar: "\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629 (KYC)", zh: "KYC \u9A8C\u8BC1" },
    module: "KYC guide",
    version: "v2.11.3",
    roles: ["visitor", "member", "admin"],
    keywords: ["kyc", "verify identity", "identity", "verification fee", "payout requirement", "uthibitisho", "v\xE9rification", "identit\xE9", "\u062A\u062D\u0642\u0642", "\u0647\u0648\u064A\u0629", "\u5B9E\u540D", "\u9A8C\u8BC1"],
    answer: {
      en: "KYC runs through the KalutaKYC API for $10 per year and is required before joining the affiliate program or withdrawing earnings. Only the verification result is stored on-platform \u2014 your identity documents never live on Kaluta servers, and re-verification reminders arrive before expiry.",
      sw: "KYC hufanyika kupitia KalutaKYC API kwa $10 kwa mwaka na inahitajika kabla ya kujiunga na mpango wa affiliate au kutoa mapato. Matokeo ya uthibitisho pekee ndio huhifadhiwa \u2014 nyaraka zako za utambulisho hazihifadhiwi kwenye seva za Kaluta.",
      fr: "Le KYC passe par l\u2019API KalutaKYC pour 10 $/an, requis avant de rejoindre le programme d\u2019affiliation ou de retirer des gains. Seul le r\xE9sultat de v\xE9rification est conserv\xE9 sur la plateforme \u2014 vos documents d\u2019identit\xE9 ne r\xE9sident jamais sur les serveurs Kaluta.",
      ar: "\u064A\u064F\u062C\u0631\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 \u0648\u0627\u062C\u0647\u0629 KalutaKYC \u0645\u0642\u0627\u0628\u0644 10 \u062F\u0648\u0644\u0627\u0631\u0627\u062A \u0633\u0646\u0648\u064A\u064B\u0627 \u0648\u0647\u0648 \u0645\u0637\u0644\u0648\u0628 \u0642\u0628\u0644 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0644\u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0623\u0648 \u0633\u062D\u0628 \u0627\u0644\u0623\u0631\u0628\u0627\u062D. \u062A\u064F\u062D\u0641\u0638 \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 \u0641\u0642\u0637 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u2014 \u0648\u062B\u0627\u0626\u0642 \u0647\u0648\u064A\u062A\u0643 \u0644\u0627 \u062A\u064F\u062E\u0632\u0646 \u0623\u0628\u062F\u064B\u0627 \u0639\u0644\u0649 \u062E\u0648\u0627\u062F\u0645 \u0643\u0627\u0644\u0648\u062A\u0627.",
      zh: "KYC \u901A\u8FC7 KalutaKYC API \u5B8C\u6210\uFF0C\u6BCF\u5E74 10 \u7F8E\u5143\uFF0C\u53C2\u4E0E\u63A8\u5E7F\u8BA1\u5212\u6216\u63D0\u73B0\u524D\u5FC5\u987B\u5B8C\u6210\u3002\u5E73\u53F0\u53EA\u4FDD\u5B58\u9A8C\u8BC1\u7ED3\u679C\u2014\u2014\u60A8\u7684\u8EAB\u4EFD\u8BC1\u4EF6\u7EDD\u4E0D\u5B58\u50A8\u5728 Kaluta \u670D\u52A1\u5668\u4E0A\uFF0C\u5230\u671F\u524D\u4F1A\u6536\u5230\u7EED\u9A8C\u63D0\u9192\u3002"
    },
    steps: [
      "Settings \u2192 Verification \u2192 start KalutaKYC ($10/year).",
      "Complete the check in the secure KalutaKYC flow.",
      "Your badge turns Verified; only the result is stored on-platform."
    ],
    deepLink: { to: "/pricing", label: "KYC note" }
  },
  {
    id: "earnings",
    title: { en: "Earnings, Affiliate & Leader\u2019s Pool", sw: "Mapato, Affiliate na Leader\u2019s Pool", fr: "Revenus, Affiliation & Leader\u2019s Pool", ar: "\u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0648\u0645\u062C\u0645\u0639 \u0627\u0644\u0642\u0627\u062F\u0629", zh: "\u6536\u76CA\u3001\u63A8\u5E7F\u4E0E\u9886\u8896\u6C60" },
    module: "Earnings guide",
    version: "v2.14.0",
    roles: ["member", "admin"],
    keywords: ["earnings", "payout", "affiliate", "referral", "leader", "pool", "revenue share", "commission", "withdraw", "mapato", "revenus", "gains", "affiliation", "\u0623\u0631\u0628\u0627\u062D", "\u0639\u0645\u0648\u0644\u0629", "\u0623\u0631\u0628\u0627\u062D\u0627", "\u6536\u76CA", "\u4F63\u91D1", "\u63D0\u73B0", "pesa"],
    answer: {
      en: "Creators earn from a 40/5/1\xD79/46 ad-revenue split: you keep 40%, your direct inviter 5%, inviters L2\u2013L10 1% each, and the platform 46%. Ad purchases add a 10% affiliate pool (L1 inviter 5%, L2\u2013L10 sharing 5% \u2248 0.5556% each). The Leader\u2019s Pool rewards the top 10,000 leaders by verified L1 referrals with a monthly, fraud-reviewed payment batch. Withdrawals need KYC and reconcile to the immutable ledger.",
      sw: "Waundaji hupata mapato kwa mgawanyo wa 40/5/1\xD79/46: wewe 40%, aliyekualika moja kwa moja 5%, waalika L2\u2013L10 1% kila mmoja, jukwaa 46%. Ununuzi wa matangazo huongeza bwawa la affiliate 10%. Leader\u2019s Pool hutuzwa viongozi 10,000 bora kwa marejeo ya L1 yaliyothibitishwa, kwa malipo ya mwezi yanayopitiwa ukaguzi wa udanganyifu. Kutoa pesa kunahitaji KYC.",
      fr: "Les cr\xE9ateurs gagnent via le partage publicitaire 40/5/1\xD79/46 : 40 % pour vous, 5 % pour votre parrain direct, 1 % pour chaque parrain L2\u2013L10, 46 % pour la plateforme. Les achats publicitaires ajoutent un pool d\u2019affiliation de 10 % (parrain L1 5 %, L2\u2013L10 se partagent 5 %). Le Leader\u2019s Pool r\xE9compense les 10 000 meilleurs leaders par parrainages L1 v\xE9rifi\xE9s, avec un lot de paiement mensuel contr\xF4l\xE9 anti-fraude. Les retraits exigent le KYC.",
      ar: "\u064A\u0643\u0633\u0628 \u0627\u0644\u0645\u0628\u062F\u0639\u0648\u0646 \u0645\u0646 \u062A\u0642\u0633\u064A\u0645 \u0639\u0627\u0626\u062F \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A 40/5/1\xD79/46: \u0644\u0643 40%\u060C \u0648\u0644\u062F\u0627\u0639\u064A\u0643 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 5%\u060C \u0648\u0644\u0644\u062F\u0627\u0639\u064A\u0646 L2\u2013L10 \u200F1% \u0644\u0643\u0644 \u0645\u0646\u0647\u0645\u060C \u0648\u0644\u0644\u0645\u0646\u0635\u0629 46%. \u0648\u062A\u0636\u064A\u0641 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0645\u062C\u0645\u0639 \u0639\u0645\u0648\u0644\u0629 10%. \u0648\u064A\u0643\u0627\u0641\u0626 \u0645\u062C\u0645\u0639 \u0627\u0644\u0642\u0627\u062F\u0629 \u0623\u0641\u0636\u0644 10,000 \u0642\u0627\u0626\u062F \u0628\u0627\u0644\u0625\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0627\u0644\u0645\u0648\u062B\u0642\u0629 \u0628\u062F\u0641\u0639\u0629 \u062F\u0641\u0639 \u0634\u0647\u0631\u064A\u0629 \u062A\u062E\u0636\u0639 \u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644. \u0627\u0644\u0633\u062D\u0648\u0628\u0627\u062A \u062A\u062A\u0637\u0644\u0628 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629.",
      zh: "\u521B\u4F5C\u8005\u6309 40/5/1\xD79/46 \u7684\u5E7F\u544A\u5206\u6210\u83B7\u5F97\u6536\u76CA\uFF1A\u4F60 40%\uFF0C\u76F4\u63A5\u9080\u8BF7\u4EBA 5%\uFF0CL2\u2013L10 \u9080\u8BF7\u4EBA\u5404 1%\uFF0C\u5E73\u53F0 46%\u3002\u5E7F\u544A\u8D2D\u4E70\u53E6\u6709 10% \u63A8\u5E7F\u6C60\uFF08\u4E00\u7EA7\u9080\u8BF7\u4EBA 5%\uFF0CL2\u2013L10 \u5171\u4EAB 5%\uFF0C\u7EA6\u6BCF\u4EBA 0.5556%\uFF09\u3002\u9886\u8896\u6C60\u6309\u9A8C\u8BC1\u7684\u4E00\u7EA7\u9080\u8BF7\u6570\u5956\u52B1\u524D 10,000 \u540D\u9886\u8896\uFF0C\u6BCF\u6708\u7ECF\u9632\u6B3A\u8BC8\u5BA1\u6838\u540E\u6279\u91CF\u53D1\u653E\u3002\u63D0\u73B0\u9700\u5B8C\u6210 KYC \u5E76\u4E0E\u4E0D\u53EF\u7BE1\u6539\u8D26\u672C\u5BF9\u8D26\u3002"
    },
    steps: [
      "Open Earnings to see your revenue split and pending balance.",
      "Complete KYC ($10/year) to unlock withdrawals.",
      "Request a payout \u2014 it joins the next reconciled payment batch."
    ],
    deepLink: { to: "/creators", label: "See Earnings" }
  },
  {
    id: "privacy",
    title: { en: "Privacy Center", sw: "Kituo cha Faragha", fr: "Centre de confidentialit\xE9", ar: "\u0645\u0631\u0643\u0632 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629", zh: "\u9690\u79C1\u4E2D\u5FC3" },
    module: "Privacy guide",
    version: "v2.13.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["privacy", "data", "personal data", "tracking", "consent", "faragha", "confidentialit\xE9", "donn\xE9es", "\u062E\u0635\u0648\u0635\u064A\u0629", "\u0628\u064A\u0627\u0646\u0627\u062A", "\u9690\u79C1", "\u6570\u636E"],
    answer: {
      en: "The Privacy Center shows exactly what Kaluta holds about you and why, with per-purpose consent toggles. Translation runs through the provider-independent gateway chosen for data sensitivity; passkeys keep biometrics on your device; and self-service deletion erases your data on the schedule you choose \u2014 GDPR/PDPA compliant, no justification required.",
      sw: "Kituo cha Faragha huonyesha haswa data gani Kaluta inashikilia kukuhusu na kwa nini, kwa vipengele vya ridhaa kwa kila kusudio. Tafsiri hupitia lango huru lililochaguliwa kwa unyeti wa data; passkeys huhifadi bayometriki kwenye kifaa chako; na kufuta akaunti kwa kujitegemea hufuta data zako kwa ratiba unayochagua.",
      fr: "Le Centre de confidentialit\xE9 montre exactement ce que Kaluta d\xE9tient sur vous et pourquoi, avec des bascules de consentement par finalit\xE9. La traduction passe par la passerelle choisie selon la sensibilit\xE9 des donn\xE9es ; les passkeys gardent la biom\xE9trie sur votre appareil ; la suppression en libre-service efface vos donn\xE9es selon le calendrier choisi \u2014 conforme RGPD/PDPA.",
      ar: "\u064A\u0639\u0631\u0636 \u0645\u0631\u0643\u0632 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0628\u062F\u0642\u0629 \u0645\u0627 \u062A\u062D\u062A\u0641\u0638 \u0628\u0647 \u0643\u0627\u0644\u0648\u062A\u0627 \u0639\u0646\u0643 \u0648\u0644\u0645\u0627\u0630\u0627\u060C \u0645\u0639 \u0645\u0641\u0627\u062A\u064A\u062D \u0645\u0648\u0627\u0641\u0642\u0629 \u0644\u0643\u0644 \u063A\u0631\u0636. \u062A\u062C\u0631\u064A \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0639\u0628\u0631 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629 \u0648\u0641\u0642 \u062D\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A\u061B \u0648\u062A\u062D\u0641\u0638 \u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0642\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0639\u0644\u0649 \u062C\u0647\u0627\u0632\u0643\u061B \u0648\u0627\u0644\u062D\u0630\u0641 \u0627\u0644\u0630\u0627\u062A\u064A \u064A\u0645\u062D\u0648 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0628\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0630\u064A \u062A\u062E\u062A\u0627\u0631\u0647 \u2014 \u0627\u0645\u062A\u062B\u0627\u0644\u064B\u0627 \u0644\u0640 GDPR/PDPA.",
      zh: "\u9690\u79C1\u4E2D\u5FC3\u7CBE\u786E\u5C55\u793A Kaluta \u6301\u6709\u60A8\u7684\u54EA\u4E9B\u6570\u636E\u53CA\u7528\u9014\uFF0C\u5E76\u63D0\u4F9B\u6309\u76EE\u7684\u7684\u540C\u610F\u5F00\u5173\u3002\u7FFB\u8BD1\u7ECF\u7531\u6309\u6570\u636E\u654F\u611F\u5EA6\u9009\u62E9\u7684\u72EC\u7ACB\u7F51\u5173\u5904\u7406\uFF1B\u901A\u884C\u5BC6\u94A5\u628A\u751F\u7269\u7279\u5F81\u7559\u5728\u60A8\u7684\u8BBE\u5907\u4E0A\uFF1B\u81EA\u52A9\u5220\u9664\u6309\u60A8\u9009\u62E9\u7684\u65F6\u95F4\u8868\u6E05\u9664\u6570\u636E\u2014\u2014\u7B26\u5408 GDPR/PDPA\uFF0C\u65E0\u9700\u8BF4\u660E\u7406\u7531\u3002"
    },
    deepLink: { to: "/safety", label: "Open Privacy Center" }
  },
  {
    id: "passkeys",
    title: { en: "Passkeys & Login Security", sw: "Passkeys na Usalama wa Kuingia", fr: "Passkeys & S\xE9curit\xE9", ar: "\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0645\u0631\u0648\u0631 \u0648\u0623\u0645\u0627\u0646 \u0627\u0644\u062F\u062E\u0648\u0644", zh: "\u901A\u884C\u5BC6\u94A5\u4E0E\u767B\u5F55\u5B89\u5168" },
    module: "Security guide",
    version: "v2.13.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["passkey", "passkeys", "biometric", "fingerprint", "face", "login", "2fa", "otp", "hardware key", "password", "usaimbalaji", "mot de passe", "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", "\u0628\u0635\u0645\u0629", "\u5BC6\u94A5", "\u6307\u7EB9", "\u767B\u5F55"],
    answer: {
      en: "Kaluta uses device-level passkeys: your phone or computer unlocks locally with its own biometrics \u2014 there is no central fingerprint or facial database, ever. You can add email OTP, authenticator apps and hardware keys, review devices and get login alerts for anything unusual.",
      sw: "Kaluta hutumia passkeys za kiwango cha kifaa: simu au kompyuta yake hufungua kwa bayometriki yake \u2014 hakuna hifadhidata ya kati ya vidole au nyuso, kamwe. Unaweza kuongeza OTP ya barua pepe, programu za authenticator na funguo za vifaa, na kupokea arifa za kuingia.",
      fr: "Kaluta utilise des passkeys au niveau de l\u2019appareil : votre t\xE9l\xE9phone ou ordinateur d\xE9verrouille localement avec sa propre biom\xE9trie \u2014 il n\u2019existe aucune base centrale d\u2019empreintes ou de visages. Ajoutez OTP par e-mail, applications d\u2019authentification et cl\xE9s mat\xE9rielles, g\xE9rez vos appareils et recevez des alertes de connexion.",
      ar: "\u062A\u0633\u062A\u062E\u062F\u0645 \u0643\u0627\u0644\u0648\u062A\u0627 \u0645\u0641\u0627\u062A\u064A\u062D \u0645\u0631\u0648\u0631 \u0639\u0644\u0649 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062C\u0647\u0627\u0632: \u0647\u0627\u062A\u0641\u0643 \u0623\u0648 \u062D\u0627\u0633\u0648\u0628\u0643 \u064A\u0641\u062A\u062D \u0645\u062D\u0644\u064A\u064B\u0627 \u0628\u0642\u064A\u0627\u0633\u0627\u062A\u0647 \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u2014 \u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u064A \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0631\u0643\u0632\u064A\u0629 \u0644\u0644\u0628\u0635\u0645\u0627\u062A \u0623\u0648 \u0627\u0644\u0648\u062C\u0648\u0647 \u0625\u0637\u0644\u0627\u0642\u064B\u0627. \u0648\u064A\u0645\u0643\u0646\u0643 \u0625\u0636\u0627\u0641\u0629 \u0631\u0645\u0648\u0632 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0648\u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u0645\u0627\u062F\u064A\u0629\u060C \u0648\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u062C\u0647\u0632\u0629 \u0648\u062A\u0644\u0642\u064A \u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644.",
      zh: "Kaluta \u4F7F\u7528\u8BBE\u5907\u7EA7\u901A\u884C\u5BC6\u94A5\uFF1A\u624B\u673A\u6216\u7535\u8111\u7528\u81EA\u8EAB\u751F\u7269\u7279\u5F81\u5728\u672C\u5730\u89E3\u9501\u2014\u2014\u7EDD\u4E0D\u5B58\u5728\u96C6\u4E2D\u7684\u6307\u7EB9\u6216\u4EBA\u8138\u6570\u636E\u5E93\u3002\u60A8\u8FD8\u53EF\u4EE5\u6DFB\u52A0\u90AE\u7BB1\u9A8C\u8BC1\u7801\u3001\u9A8C\u8BC1\u5668\u5E94\u7528\u548C\u786C\u4EF6\u5BC6\u94A5\uFF0C\u7BA1\u7406\u8BBE\u5907\u5E76\u63A5\u6536\u5F02\u5E38\u767B\u5F55\u63D0\u9192\u3002"
    },
    steps: [
      'Settings \u2192 Security \u2192 "Add a passkey" on this device.',
      "Unlock with your device biometrics \u2014 nothing leaves the device.",
      "Optionally add an authenticator app or hardware key as backup."
    ],
    deepLink: { to: "/safety", label: "See Security" }
  },
  {
    id: "account-deletion",
    title: { en: "Account Deletion", sw: "Kufuta Akaunti", fr: "Suppression de compte", ar: "\u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628", zh: "\u6CE8\u9500\u8D26\u53F7" },
    module: "Account guide",
    version: "v2.12.2",
    roles: ["visitor", "member", "admin"],
    keywords: ["delete", "deactivate", "account deletion", "close account", "leave", "gdpr", "futa akaunti", "supprimer", "compte", "\u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628", "\u6CE8\u9500", "\u5220\u9664\u8D26\u53F7"],
    answer: {
      en: "Self-service, no justification required: Settings \u2192 Account \u2192 Deactivate or Delete. After identity confirmation you can choose an optional cooling period before erasure becomes permanent; the process is GDPR/PDPA compliant, and memorial succession rules protect any family trees or memorials you administer.",
      sw: "Kwa kujitegemea, bila kutoa sababu: Settings \u2192 Account \u2192 Deactivate au Delete. Baada ya kuthibitisha utambulisho unaweza kuchagua kipindi cha kusubiri kabla ya kufutwa kabisa; mchakato unazingatia GDPR/PDPA, na sheria za urithi wa kumbukumbu hulinda miti ya familia unayosimamia.",
      fr: "En libre-service, sans justification : Param\xE8tres \u2192 Compte \u2192 D\xE9sactiver ou Supprimer. Apr\xE8s confirmation d\u2019identit\xE9, vous pouvez choisir une p\xE9riode de r\xE9flexion avant l\u2019effacement d\xE9finitif ; le processus est conforme RGPD/PDPA et les r\xE8gles de succession prot\xE8gent arbres familiaux et m\xE9moriaux que vous administrez.",
      ar: "\u0628\u062E\u062F\u0645\u0629 \u0630\u0627\u062A\u064A\u0629 \u0648\u062F\u0648\u0646 \u062A\u0628\u0631\u064A\u0631: \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u2190 \u0627\u0644\u062D\u0633\u0627\u0628 \u2190 \u062A\u0639\u0637\u064A\u0644 \u0623\u0648 \u062D\u0630\u0641. \u0628\u0639\u062F \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0647\u0648\u064A\u0629 \u064A\u0645\u0643\u0646\u0643 \u0627\u062E\u062A\u064A\u0627\u0631 \u0641\u062A\u0631\u0629 \u062A\u0647\u062F\u0626\u0629 \u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629 \u0642\u0628\u0644 \u0623\u0646 \u064A\u0635\u0628\u062D \u0627\u0644\u0645\u062D\u0648 \u0646\u0647\u0627\u0626\u064A\u064B\u0627\u061B \u0648\u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0645\u062A\u0648\u0627\u0641\u0642\u0629 \u0645\u0639 GDPR/PDPA\u060C \u0648\u0642\u0648\u0627\u0639\u062F \u0627\u0644\u062A\u0639\u0627\u0642\u0628 \u0639\u0644\u0649 \u0627\u0644\u0646\u064F\u0651\u0635\u064F\u0628 \u062A\u062D\u0645\u064A \u0623\u0634\u062C\u0627\u0631 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0648\u0627\u0644\u0646\u064F\u0651\u0635\u064F\u0628 \u0627\u0644\u062A\u064A \u062A\u062F\u064A\u0631\u0647\u0627.",
      zh: "\u5B8C\u5168\u81EA\u52A9\u3001\u65E0\u9700\u8BF4\u660E\u7406\u7531\uFF1A\u8BBE\u7F6E\u2192\u8D26\u53F7\u2192\u505C\u7528\u6216\u5220\u9664\u3002\u8EAB\u4EFD\u786E\u8BA4\u540E\uFF0C\u60A8\u53EF\u4EE5\u9009\u62E9\u53EF\u9009\u7684\u51B7\u9759\u671F\u518D\u6C38\u4E45\u6E05\u9664\uFF1B\u6D41\u7A0B\u7B26\u5408 GDPR/PDPA\uFF0C\u7EAA\u5FF5\u7EE7\u627F\u89C4\u5219\u4F1A\u4FDD\u62A4\u60A8\u7BA1\u7406\u7684\u5BB6\u65CF\u6811\u548C\u7EAA\u5FF5\u9875\u3002"
    },
    deepLink: { to: "/safety", label: "Account control" }
  },
  {
    id: "safety",
    title: { en: "Safety Layers & Moderation", sw: "Tabaka za Usalama", fr: "Couches de s\xE9curit\xE9", ar: "\u0637\u0628\u0642\u0627\u062A \u0627\u0644\u0623\u0645\u0627\u0646", zh: "\u5B89\u5168\u5C42\u7EA7\u4E0E\u5BA1\u6838" },
    module: "Safety guide",
    version: "v2.13.1",
    roles: ["visitor", "member", "admin"],
    keywords: ["safety", "moderation", "report", "community notes", "age mode", "teen", "provenance", "usalama", "s\xE9curit\xE9", "mod\xE9ration", "\u0623\u0645\u0627\u0646", "\u0625\u0634\u0631\u0627\u0641", "\u5B89\u5168", "\u5BA1\u6838", "\u4E3E\u62A5"],
    answer: {
      en: "Safety is layered: automated filters \u2192 community moderation \u2192 platform review \u2192 appeals \u2192 public transparency reports. Child-safe public browsing, teen mode and adult mode set boundaries; Community Notes add context without ever auto-declaring truth; and every media item carries a provenance label \u2014 Original Upload, Edited, AI Assisted, AI Generated or Verified Source.",
      sw: "Usalama una tabaka: vichujio vya kiotomatiki \u2192 usimamizi wa jamii \u2192 mapitio ya jukwaa \u2192 rufaa \u2192 ripoti za uwazi za umma. Kuvinjari kwa watoto, teen mode na adult mode huweka mipaka; Community Notes huongeza muktadha bila kutangaza ukweli; na kila media hubeba lebo ya asili \u2014 Original Upload, Edited, AI Assisted, AI Generated au Verified Source.",
      fr: "La s\xE9curit\xE9 est en couches : filtres automatis\xE9s \u2192 mod\xE9ration communautaire \u2192 revue plateforme \u2192 appels \u2192 rapports publics de transparence. Navigation enfants, mode ado et mode adulte fixent les limites ; les Notes communautaires ajoutent du contexte sans jamais d\xE9cr\xE9ter la v\xE9rit\xE9 ; chaque m\xE9dia porte un label de provenance.",
      ar: "\u0627\u0644\u0623\u0645\u0627\u0646 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0637\u0628\u0642\u0627\u062A: \u0645\u0631\u0634\u062D\u0627\u062A \u0622\u0644\u064A\u0629 \u2190 \u0625\u0634\u0631\u0627\u0641 \u0627\u0644\u0645\u062C\u062A\u0645\u0639 \u2190 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0646\u0635\u0629 \u2190 \u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u2190 \u062A\u0642\u0627\u0631\u064A\u0631 \u0634\u0641\u0627\u0641\u064A\u0629 \u0639\u0644\u0646\u064A\u0629. \u062A\u0635\u0641\u062D \u0622\u0645\u0646 \u0644\u0644\u0623\u0637\u0641\u0627\u0644 \u0648\u0648\u0636\u0639 \u0644\u0644\u0645\u0631\u0627\u0647\u0642\u064A\u0646 \u0648\u0648\u0636\u0639 \u0644\u0644\u0628\u0627\u0644\u063A\u064A\u0646\u061B \u0648\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u062C\u062A\u0645\u0639 \u062A\u0636\u064A\u0641 \u0633\u064A\u0627\u0642\u064B\u0627 \u062F\u0648\u0646 \u0623\u0646 \u062A\u0639\u0644\u0646 \u0627\u0644\u062D\u0642\u064A\u0642\u0629\u061B \u0648\u0643\u0644 \u0648\u0633\u064A\u0637 \u064A\u062D\u0645\u0644 \u0648\u0633\u0645 \u0645\u0635\u062F\u0631: \u0631\u0641\u0639 \u0623\u0635\u0644\u064A\u060C \u0645\u0639\u062F\u0651\u0644\u060C \u0628\u0645\u0633\u0627\u0639\u062F\u0629 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u0645\u0648\u0644\u0651\u062F \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u0648 \u0645\u0635\u062F\u0631 \u0645\u0648\u062B\u0651\u0642.",
      zh: "\u5B89\u5168\u662F\u5206\u5C42\u7684\uFF1A\u81EA\u52A8\u8FC7\u6EE4\u2192\u793E\u533A\u5BA1\u6838\u2192\u5E73\u53F0\u590D\u6838\u2192\u7533\u8BC9\u2192\u516C\u5F00\u900F\u660E\u5EA6\u62A5\u544A\u3002\u513F\u7AE5\u5B89\u5168\u6D4F\u89C8\u3001\u9752\u5C11\u5E74\u6A21\u5F0F\u548C\u6210\u4EBA\u6A21\u5F0F\u8BBE\u5B9A\u8FB9\u754C\uFF1B\u793E\u533A\u6CE8\u91CA\u53EA\u8865\u5145\u80CC\u666F\uFF0C\u7EDD\u4E0D\u81EA\u52A8\u65AD\u8A00\u771F\u76F8\uFF1B\u6BCF\u6761\u5A92\u4F53\u90FD\u5E26\u6709\u6765\u6E90\u6807\u7B7E\u2014\u2014\u539F\u59CB\u4E0A\u4F20\u3001\u5DF2\u7F16\u8F91\u3001AI \u8F85\u52A9\u3001AI \u751F\u6210\u6216\u5DF2\u9A8C\u8BC1\u6765\u6E90\u3002"
    },
    image: "/safety-hero.jpg",
    imageAlt: "A shield formed from softly glowing glass layers",
    deepLink: { to: "/safety", label: "Open Safety" }
  },
  {
    id: "developers",
    title: { en: "Developer Platform", sw: "Jukwaa la Wasanidi", fr: "Plateforme d\xE9veloppeurs", ar: "\u0645\u0646\u0635\u0629 \u0627\u0644\u0645\u0637\u0648\u0631\u064A\u0646", zh: "\u5F00\u53D1\u8005\u5E73\u53F0" },
    module: "Developer docs",
    version: "v2.13.2",
    roles: ["visitor", "member", "admin"],
    keywords: ["developer", "api", "graphql", "webhook", "oauth", "sdk", "publish algorithm", "app marketplace", "msanidi", "d\xE9veloppeur", "\u0645\u0637\u0648\u0631", "\u5F00\u53D1\u8005", "\u63A5\u53E3"],
    answer: {
      en: "The Developer Platform offers REST and GraphQL APIs, webhooks and OAuth, plus the App Marketplace. Developers can publish feed algorithms to the Algorithm Marketplace via API, and the platform is agent-readable: semantic APIs with licensing and paid AI access let external agents consume Kaluta knowledge legitimately.",
      sw: "Jukwaa la Wasanidi lina API za REST na GraphQL, webhooks na OAuth, pamoja na App Marketplace. Wasanidi wanaweza kuchapisha algorithm za mlisho kupitia API, na jukwaa linasomeka na mawakala (agent-readable): API za kisemantiki kwa leseni na ufikiaji wa AI wa kulipia.",
      fr: "La plateforme d\xE9veloppeurs propose des API REST et GraphQL, des webhooks et OAuth, plus l\u2019App Marketplace. Les d\xE9veloppeurs peuvent publier des algorithmes de fil via l\u2019API, et la plateforme est lisible par les agents : API s\xE9mantiques sous licence avec acc\xE8s IA payant.",
      ar: "\u062A\u0648\u0641\u0631 \u0645\u0646\u0635\u0629 \u0627\u0644\u0645\u0637\u0648\u0631\u064A\u0646 \u0648\u0627\u062C\u0647\u0627\u062A REST \u0648GraphQL \u0648webhooks \u0648OAuth \u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0645\u062A\u062C\u0631 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A. \u0648\u064A\u0645\u0643\u0646 \u0644\u0644\u0645\u0637\u0648\u0631\u064A\u0646 \u0646\u0634\u0631 \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0627\u062A \u0627\u0644\u062E\u0644\u0627\u0635\u0627\u062A \u0639\u0628\u0631 \u0627\u0644\u0648\u0627\u062C\u0647\u0629\u060C \u0648\u0627\u0644\u0645\u0646\u0635\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0645\u0646 \u0627\u0644\u0648\u0643\u0644\u0627\u0621: \u0648\u0627\u062C\u0647\u0627\u062A \u062F\u0644\u0627\u0644\u064A\u0629 \u0645\u0631\u062E\u0651\u0635\u0629 \u0645\u0639 \u0648\u0635\u0648\u0644 \u0645\u062F\u0641\u0648\u0639 \u0644\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
      zh: "\u5F00\u53D1\u8005\u5E73\u53F0\u63D0\u4F9B REST \u548C GraphQL API\u3001webhooks \u4E0E OAuth\uFF0C\u4EE5\u53CA\u5E94\u7528\u5E02\u573A\u3002\u5F00\u53D1\u8005\u53EF\u901A\u8FC7 API \u5411\u7B97\u6CD5\u5E02\u573A\u53D1\u5E03\u4FE1\u606F\u6D41\u7B97\u6CD5\uFF1B\u5E73\u53F0\u8FD8\u652F\u6301\u667A\u80FD\u4F53\u53EF\u8BFB\uFF08agent-readable\uFF09\uFF1A\u5E26\u6388\u6743\u548C\u4ED8\u8D39 AI \u8BBF\u95EE\u7684\u8BED\u4E49\u5316 API\u3002"
    },
    image: "/dev-hero.jpg",
    imageAlt: "Code editor fragment with golden arc motifs",
    deepLink: { to: "/developers", label: "Open Developer Docs" }
  },
  /* ------------------------- Admin-only entries ------------------------- */
  {
    id: "admin-ledger",
    title: { en: "Ledger Reconciliation", sw: "Upatanishaji wa Ledger", fr: "Rapprochement du grand livre", ar: "\u062A\u0633\u0648\u064A\u0629 \u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630", zh: "\u8D26\u672C\u5BF9\u8D26" },
    module: "Admin Console \u2014 Finance",
    version: "v2.14.0",
    roles: ["admin"],
    adminOnly: true,
    keywords: ["ledger", "reconcile", "reconciliation", "transaction ledger", "general ledger", "finance", "accounting", "ledgeri", "grand livre", "\u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630", "\u8D26\u672C", "\u5BF9\u8D26"],
    answer: {
      en: "The admin console exposes the immutable Transaction Ledger and General Ledger (Singapore accounting standard). Wallet balances must reconcile to ledger entries \u2014 the Finance view shows reconciliation status per account, drift alerts, and the payment-batch tool for affiliate and Leader\u2019s Pool payouts. Every batch is fraud-reviewed before release.",
      sw: "Konsoli ya msimamizi huonyesha Transaction Ledger na General Ledger zisizobadilika. Salio za pochi lazima zilingane na entries za ledger \u2014 muonekano wa Fedha huonyesha hali ya upatanishaji, arifa za tofauti, na zana ya payment-batch. Kila batch hupitiwa ukaguzi wa udanganyifu kabla ya kutolewa.",
      fr: "La console admin expose le Transaction Ledger et le General Ledger immuables (norme comptable de Singapour). Les soldes des portefeuilles doivent se rapprocher des \xE9critures \u2014 la vue Finance montre le statut de rapprochement par compte, les alertes d\u2019\xE9cart et l\u2019outil de lots de paiement. Chaque lot est contr\xF4l\xE9 anti-fraude avant d\xE9blocage.",
      ar: "\u062A\u0639\u0631\u0636 \u0648\u062D\u062F\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0634\u0631\u0641 \u062F\u0641\u062A\u0631 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0648\u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645 \u063A\u064A\u0631 \u0627\u0644\u0642\u0627\u0628\u0644\u064A\u0646 \u0644\u0644\u062A\u063A\u064A\u064A\u0631 (\u0627\u0644\u0645\u0639\u064A\u0627\u0631 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0633\u0646\u063A\u0627\u0641\u0648\u0631\u064A). \u064A\u062C\u0628 \u0623\u0646 \u062A\u062A\u0637\u0627\u0628\u0642 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0641\u0638 \u0645\u0639 \u0642\u064A\u0648\u062F \u0627\u0644\u062F\u0641\u062A\u0631 \u2014 \u062A\u0639\u0631\u0636 \u0634\u0627\u0634\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0644\u0643\u0644 \u062D\u0633\u0627\u0628 \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0627\u0644\u0627\u0646\u062D\u0631\u0627\u0641 \u0648\u0623\u062F\u0627\u0629 \u062F\u0641\u0639\u0627\u062A \u0627\u0644\u062F\u0641\u0639. \u0643\u0644 \u062F\u0641\u0639\u0629 \u062A\u062E\u0636\u0639 \u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644 \u0642\u0628\u0644 \u0627\u0644\u0625\u0641\u0631\u0627\u062C.",
      zh: "\u7BA1\u7406\u63A7\u5236\u53F0\u5C55\u793A\u4E0D\u53EF\u7BE1\u6539\u7684\u4EA4\u6613\u8D26\u672C\u548C\u603B\u8D26\uFF08\u65B0\u52A0\u5761\u4F1A\u8BA1\u51C6\u5219\uFF09\u3002\u94B1\u5305\u4F59\u989D\u5FC5\u987B\u4E0E\u8D26\u672C\u5206\u5F55\u5BF9\u8D26\u2014\u2014\u8D22\u52A1\u89C6\u56FE\u663E\u793A\u6BCF\u4E2A\u8D26\u6237\u7684\u5BF9\u8D26\u72B6\u6001\u3001\u504F\u5DEE\u8B66\u62A5\u4EE5\u53CA\u63A8\u5E7F\u548C\u9886\u8896\u6C60\u7684\u6279\u91CF\u4ED8\u6B3E\u5DE5\u5177\u3002\u6BCF\u4E2A\u6279\u6B21\u53D1\u653E\u524D\u90FD\u7ECF\u8FC7\u9632\u6B3A\u8BC8\u5BA1\u6838\u3002"
    }
  },
  {
    id: "admin-fraud",
    title: { en: "Anti-Fraud Center", sw: "Kituo cha Kupambana na Udanganyifu", fr: "Centre anti-fraude", ar: "\u0645\u0631\u0643\u0632 \u0645\u0643\u0627\u0641\u062D\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644", zh: "\u53CD\u6B3A\u8BC8\u4E2D\u5FC3" },
    module: "Admin Console \u2014 Fraud",
    version: "v2.14.0",
    roles: ["admin"],
    adminOnly: true,
    keywords: ["fraud", "anti-fraud", "self-referral", "click fraud", "fake kyc", "bot farm", "risk", "udanganyifu", "fraude", "\u0627\u062D\u062A\u064A\u0627\u0644", "\u6B3A\u8BC8"],
    answer: {
      en: "The Anti-Fraud Center scores referral and ad activity for self-referral rings, click fraud, fake KYC and bot farms. Flagged cases enter a review queue with evidence bundles; confirmed fraud freezes payouts and reverses commissions. The fraud-review step is mandatory before every Leader\u2019s Pool payment batch.",
      sw: "Kituo cha Kupambana na Udanganyifu hupiga alama shughuli za marejeo na matangazo kwa self-referral, click fraud, KYC bandia na bot farms. Kesi zilizoalamiwa huingia kwenye foleni ya mapitio zenye ushahidi; udanganyifu uliothibitishwa hufungia malipo na kufuta kamisheni.",
      fr: "Le Centre anti-fraude note l\u2019activit\xE9 de parrainage et publicitaire : auto-parrainage, fraude au clic, faux KYC et fermes de bots. Les cas signal\xE9s rejoignent une file de revue avec faisceaux de preuves ; la fraude confirm\xE9e g\xE8le les paiements et annule les commissions. L\u2019\xE9tape anti-fraude est obligatoire avant chaque lot Leader\u2019s Pool.",
      ar: "\u064A\u0642\u064A\u0651\u0645 \u0645\u0631\u0643\u0632 \u0645\u0643\u0627\u0641\u062D\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644 \u0646\u0634\u0627\u0637 \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0644\u0643\u0634\u0641 \u062D\u0644\u0642\u0627\u062A \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u0627\u0644\u0630\u0627\u062A\u064A\u0629 \u0648\u0627\u0644\u0646\u0642\u0631\u0627\u062A \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644\u064A\u0629 \u0648\u0648\u062B\u0627\u0626\u0642 \u0627\u0644\u0647\u0648\u064A\u0629 \u0627\u0644\u0645\u0632\u064A\u0641\u0629 \u0648\u0645\u0632\u0627\u0631\u0639 \u0627\u0644\u0631\u0648\u0628\u0648\u062A\u0627\u062A. \u062A\u062F\u062E\u0644 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u064E\u0651\u0645\u0629 \u0637\u0627\u0628\u0648\u0631 \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u0639 \u062D\u0632\u0645 \u0623\u062F\u0644\u0629\u061B \u0648\u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644 \u0627\u0644\u0645\u0624\u0643\u062F \u064A\u062C\u0645\u0651\u062F \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0648\u064A\u0639\u0643\u0633 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062A. \u0648\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644 \u0625\u0644\u0632\u0627\u0645\u064A\u0629 \u0642\u0628\u0644 \u0643\u0644 \u062F\u0641\u0639\u0629 \u0645\u0646 \u0645\u062C\u0645\u0639 \u0627\u0644\u0642\u0627\u062F\u0629.",
      zh: "\u53CD\u6B3A\u8BC8\u4E2D\u5FC3\u5BF9\u63A8\u5E7F\u548C\u5E7F\u544A\u6D3B\u52A8\u8BC4\u5206\uFF0C\u8BC6\u522B\u81EA\u6211\u63A8\u8350\u56E2\u4F19\u3001\u70B9\u51FB\u6B3A\u8BC8\u3001\u865A\u5047 KYC \u548C\u50F5\u5C38\u519C\u573A\u3002\u6807\u8BB0\u6848\u4EF6\u8FDE\u8BC1\u636E\u5305\u8FDB\u5165\u5BA1\u6838\u961F\u5217\uFF1B\u786E\u8BA4\u7684\u6B3A\u8BC8\u4F1A\u51BB\u7ED3\u4ED8\u6B3E\u5E76\u64A4\u9500\u4F63\u91D1\u3002\u6BCF\u4E2A\u9886\u8896\u6C60\u4ED8\u6B3E\u6279\u6B21\u524D\u90FD\u5FC5\u987B\u7ECF\u8FC7\u9632\u6B3A\u8BC8\u5BA1\u6838\u3002"
    }
  },
  {
    id: "admin-kyc-queue",
    title: { en: "KYC Review Queue", sw: "Foleni ya KYC", fr: "File de revue KYC", ar: "\u0637\u0627\u0628\u0648\u0631 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0647\u0648\u064A\u0629", zh: "KYC \u5BA1\u6838\u961F\u5217" },
    module: "Admin Console \u2014 KYC",
    version: "v2.11.3",
    roles: ["admin"],
    adminOnly: true,
    keywords: ["kyc queue", "verification queue", "pending verification", "approve kyc", "foleni ya kyc", "file kyc", "\u0637\u0627\u0628\u0648\u0631 \u0627\u0644\u062A\u062D\u0642\u0642", "\u5BA1\u6838\u961F\u5217"],
    answer: {
      en: "The KYC queue lists pending, expiring and failed verifications from KalutaKYC with result-only records. Admins approve, request re-verification or suspend affiliate eligibility; documents themselves never transit the platform \u2014 decisions reference the provider\u2019s verification token.",
      sw: "Foleni ya KYC huonyesha uthibitisho unaosubiri, unaokaribia kuisha na ulioshindwa kutoka KalutaKYC kwa rekodi za matokeo pekee. Wasimamizi huidhinisha, kuomba uthibitisho upya au kusitisha ustahiki wa affiliate; nyaraka zenyewe hazipiti jukwaani.",
      fr: "La file KYC liste les v\xE9rifications en attente, expirantes et \xE9chou\xE9es de KalutaKYC, avec des enregistrements limit\xE9s au r\xE9sultat. Les admins approuvent, demandent une re-v\xE9rification ou suspendent l\u2019\xE9ligibilit\xE9 d\u2019affiliation ; les documents ne transitent jamais par la plateforme.",
      ar: "\u064A\u0639\u0631\u0636 \u0637\u0627\u0628\u0648\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0648\u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u0648\u0627\u0644\u0641\u0627\u0634\u0644\u0629 \u0645\u0646 KalutaKYC \u0628\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0641\u0642\u0637. \u064A\u0639\u062A\u0645\u062F \u0627\u0644\u0645\u0634\u0631\u0641\u0648\u0646 \u0623\u0648 \u064A\u0637\u0644\u0628\u0648\u0646 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u062D\u0642\u0642 \u0623\u0648 \u064A\u0639\u0644\u0642\u0648\u0646 \u0623\u0647\u0644\u064A\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0629\u061B \u0648\u0627\u0644\u0648\u062B\u0627\u0626\u0642 \u0646\u0641\u0633\u0647\u0627 \u0644\u0627 \u062A\u0645\u0631 \u0639\u0628\u0631 \u0627\u0644\u0645\u0646\u0635\u0629 \u0625\u0637\u0644\u0627\u0642\u064B\u0627.",
      zh: "KYC \u961F\u5217\u5217\u51FA KalutaKYC \u5F85\u5BA1\u6838\u3001\u5373\u5C06\u8FC7\u671F\u548C\u5931\u8D25\u7684\u9A8C\u8BC1\uFF0C\u53EA\u4FDD\u5B58\u7ED3\u679C\u8BB0\u5F55\u3002\u7BA1\u7406\u5458\u53EF\u6279\u51C6\u3001\u8981\u6C42\u91CD\u65B0\u9A8C\u8BC1\u6216\u6682\u505C\u63A8\u5E7F\u8D44\u683C\uFF1B\u8BC1\u4EF6\u672C\u8EAB\u7EDD\u4E0D\u7ECF\u8FC7\u5E73\u53F0\uFF0C\u51B3\u5B9A\u4EC5\u5F15\u7528\u670D\u52A1\u5546\u7684\u9A8C\u8BC1\u4EE4\u724C\u3002"
    }
  },
  {
    id: "admin-aiwatch",
    title: { en: "AI Industry Watch", sw: "Ufuatiliaji wa Sekta ya AI", fr: "Veille IA", ar: "\u0645\u0631\u0635\u062F \u0635\u0646\u0627\u0639\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", zh: "AI \u884C\u4E1A\u89C2\u5BDF" },
    module: "Admin Console \u2014 AI Watch",
    version: "v2.14.0",
    roles: ["admin"],
    adminOnly: true,
    keywords: ["ai watch", "industry watch", "development", "advisory", "instruct to execute", "frontier", "model news", "veille", "\u0645\u0631\u0635\u062F", "\u062A\u0637\u0648\u064A\u0631 \u062C\u062F\u064A\u062F", "\u884C\u4E1A\u89C2\u5BDF", "\u524D\u6CBF"],
    answer: {
      en: "AI Watch observes developments in AI and adjacent industry practice, then files an advisory only when adoption would add real value to Kaluta. Each card states what happened, why we should adopt it, why a codebase change is required (with the systems touched) and a proposed branch with sandbox test results. You can review the diff, dismiss, or instruct the assistant to execute \u2014 execution always opens a pull request, and human merge approval is always required.",
      sw: "AI Watch hufuatilia maendeleo ya AI na mbinu za sekta, kisha kuwasilisha ushauri tu pale ambapo kutekeleza kungeongeza thamani kwa Kaluta. Kila kadi hueleza kilichotokea, kwa nini tupitie, kwa nini mabadiliko ya msimbo yanahitajika, na pendekezo la branch na matokeo ya majaribio. Unaweza kupitia diff, kukataa, au kuagiza itekelezwe \u2014 utekelezaji hufungua pull request, na idhini ya binadamu ni lazima kila wakati.",
      fr: "AI Watch observe les d\xE9veloppements de l\u2019IA et des pratiques du secteur, puis ne d\xE9pose un avis que lorsque l\u2019adoption apporterait une vraie valeur \xE0 Kaluta. Chaque carte indique ce qui s\u2019est pass\xE9, pourquoi l\u2019adopter, pourquoi un changement de code est requis (syst\xE8mes touch\xE9s) et propose une branche avec r\xE9sultats de tests en bac \xE0 sable. Vous pouvez relire le diff, ignorer ou ordonner l\u2019ex\xE9cution \u2014 qui ouvre toujours une pull request, avec validation humaine obligatoire.",
      ar: '\u064A\u0631\u0627\u0642\u0628 "\u0645\u0631\u0635\u062F \u0627\u0644\u0630\u0643\u0627\u0621" \u062A\u0637\u0648\u0631\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0645\u0645\u0627\u0631\u0633\u0627\u062A \u0627\u0644\u0635\u0646\u0627\u0639\u0629\u060C \u0648\u0644\u0627 \u064A\u0631\u0641\u0639 \u062A\u0648\u0635\u064A\u0629 \u0625\u0644\u0627 \u062D\u064A\u0646 \u064A\u0636\u064A\u0641 \u0627\u0644\u062A\u0628\u0646\u064A \u0642\u064A\u0645\u0629 \u062D\u0642\u064A\u0642\u064A\u0629 \u0644\u0643\u0627\u0644\u0648\u062A\u0627. \u0643\u0644 \u0628\u0637\u0627\u0642\u0629 \u062A\u0648\u0636\u062D \u0645\u0627 \u062D\u062F\u062B \u0648\u0644\u0645\u0627\u0630\u0627 \u0646\u062A\u0628\u0646\u0627\u0647 \u0648\u0644\u0645\u0627\u0630\u0627 \u064A\u0644\u0632\u0645 \u062A\u063A\u064A\u064A\u0631 \u0641\u064A \u0627\u0644\u0643\u0648\u062F (\u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u062A\u0623\u062B\u0631\u0629) \u0645\u0639 \u0641\u0631\u0639 \u0645\u0642\u062A\u0631\u062D \u0648\u0646\u062A\u0627\u0626\u062C \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u062A \u0641\u064A \u0628\u064A\u0626\u0629 \u0645\u0639\u0632\u0648\u0644\u0629. \u064A\u0645\u0643\u0646\u0643 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0641\u0631\u0642 \u0623\u0648 \u0627\u0644\u0631\u0641\u0636 \u0623\u0648 \u0627\u0644\u0623\u0645\u0631 \u0628\u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u2014 \u0648\u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u064A\u0641\u062A\u062D \u062F\u0627\u0626\u0645\u064B\u0627 \u0637\u0644\u0628 \u062F\u0645\u062C\u060C \u0648\u0645\u0648\u0627\u0641\u0642\u0629 \u0628\u0634\u0631\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u062F\u0645\u062C \u0625\u0644\u0632\u0627\u0645\u064A\u0629 \u062F\u0627\u0626\u0645\u064B\u0627.',
      zh: "AI \u884C\u4E1A\u89C2\u5BDF\u8DDF\u8E2A AI \u53CA\u76F8\u5173\u884C\u4E1A\u7684\u6700\u65B0\u52A8\u6001\uFF0C\u53EA\u6709\u5F53\u91C7\u7EB3\u80FD\u4E3A Kaluta \u5E26\u6765\u5B9E\u9645\u4EF7\u503C\u65F6\u624D\u4F1A\u63D0\u4EA4\u5EFA\u8BAE\u3002\u6BCF\u5F20\u5361\u7247\u8BF4\u660E\u53D1\u751F\u4E86\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\u503C\u5F97\u91C7\u7EB3\u3001\u4E3A\u4EC0\u4E48\u9700\u8981\u4EE3\u7801\u53D8\u66F4\uFF08\u6D89\u53CA\u54EA\u4E9B\u7CFB\u7EDF\uFF09\uFF0C\u5E76\u9644\u5E26\u6C99\u76D2\u6D4B\u8BD5\u901A\u8FC7\u7684\u5206\u652F\u63D0\u6848\u3002\u60A8\u53EF\u4EE5\u5BA1\u67E5\u5DEE\u5F02\u3001\u5FFD\u7565\uFF0C\u6216\u6307\u793A\u52A9\u624B\u6267\u884C\u2014\u2014\u6267\u884C\u603B\u662F\u4EE5\u63D0\u4EA4 Pull Request \u7684\u5F62\u5F0F\u8FDB\u884C\uFF0C\u5E76\u4E14\u59CB\u7EC8\u9700\u8981\u4EBA\u5DE5\u5408\u5E76\u6279\u51C6\u3002"
    },
    deepLink: { to: "/admin", label: "Open Admin Console" }
  },
  {
    id: "crypto-payments",
    title: { en: "Paying with crypto", sw: "Kulipa kwa crypto", fr: "Payer en crypto", ar: "\u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629", zh: "\u52A0\u5BC6\u8D27\u5E01\u652F\u4ED8" },
    module: "Payments guide",
    version: "v2.15.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["crypto", "pay with crypto", "bitcoin", "usdt", "nowpayments", "checkout", "bsc", "crypto malipo", "paiement crypto", "\u062F\u0641\u0639 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629", "\u52A0\u5BC6\u8D27\u5E01", "\u652F\u4ED8"],
    answer: {
      en: "You can pay for subscriptions, ad credit and marketplace items with 350+ cryptocurrencies via NowPayments. Pick your item, choose a coin, and send to the generated deposit address \u2014 status updates arrive live (waiting \u2192 confirming \u2192 finished) through HMAC-signed IPN callbacks. Receipts are auto-converted inside NowPayments custody to USDT on BSC and swept in batches to the Kaluta safe wallet.",
      sw: "Unaweza kulipa subscriptions, ad credit na bidhaa za soko kwa crypto 350+ kupitia NowPayments. Chagua kipengee, chagua sarafu, utume kwa anwani inayotengenezwa \u2014 hali husasishwa moja kwa moja kupitia IPN. Mapato hubadilishwa otomatiki ndani ya custody kuwa USDT ya BSC na kusafirishwa kwa vikwazo kwenda kwenye mkoba salama wa Kaluta.",
      fr: "Vous pouvez payer abonnements, cr\xE9dits publicitaires et articles du march\xE9 avec plus de 350 cryptomonnaies via NowPayments. Choisissez l\u2019article et la devise, puis envoyez au d\xE9p\xF4t g\xE9n\xE9r\xE9 \u2014 les statuts arrivent en direct via des callbacks IPN sign\xE9s HMAC. Les recettes sont converties automatiquement en USDT sur BSC dans la custody, puis transf\xE9r\xE9es par lots vers le portefeuille s\xE9curis\xE9 Kaluta.",
      ar: "\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062F\u0641\u0639 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0648\u0631\u0635\u064A\u062F \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0648\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0633\u0648\u0642 \u0628\u0623\u0643\u062B\u0631 \u0645\u0646 350 \u0639\u0645\u0644\u0629 \u0631\u0642\u0645\u064A\u0629 \u0639\u0628\u0631 NowPayments. \u0627\u062E\u062A\u0631 \u0627\u0644\u0639\u0646\u0635\u0631 \u0648\u0627\u0644\u0639\u0645\u0644\u0629 \u062B\u0645 \u0623\u0631\u0633\u0644 \u0625\u0644\u0649 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u064A\u062F\u0627\u0639 \u0627\u0644\u0645\u064F\u0646\u0634\u0623 \u2014 \u0648\u062A\u0635\u0644\u0643 \u062A\u062D\u062F\u064A\u062B\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0628\u0631 \u0625\u0634\u0639\u0627\u0631\u0627\u062A IPN \u0645\u0648\u0642\u0651\u0639\u0629 \u0628\u0640 HMAC. \u062A\u064F\u062D\u0648\u064E\u0651\u0644 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u062F\u0627\u062E\u0644 \u0627\u0644\u062D\u0641\u0638 \u0625\u0644\u0649 USDT \u0639\u0644\u0649 \u0634\u0628\u0643\u0629 BSC \u062B\u0645 \u062A\u064F\u0631\u0633\u0644 \u0639\u0644\u0649 \u062F\u0641\u0639\u0627\u062A \u0625\u0644\u0649 \u0645\u062D\u0641\u0638\u0629 \u0643\u0627\u0644\u0648\u062A\u0627 \u0627\u0644\u0622\u0645\u0646\u0629.",
      zh: "\u60A8\u53EF\u4EE5\u901A\u8FC7 NowPayments \u4F7F\u7528 350 \u591A\u79CD\u52A0\u5BC6\u8D27\u5E01\u652F\u4ED8\u8BA2\u9605\u3001\u5E7F\u544A\u989D\u5EA6\u548C\u5E02\u573A\u5546\u54C1\u3002\u9009\u62E9\u5546\u54C1\u548C\u5E01\u79CD\u540E\uFF0C\u5411\u751F\u6210\u7684\u5145\u503C\u5730\u5740\u8F6C\u8D26\u5373\u53EF\u2014\u2014\u72B6\u6001\u901A\u8FC7 HMAC \u7B7E\u540D\u7684 IPN \u56DE\u8C03\u5B9E\u65F6\u66F4\u65B0\u3002\u6536\u5230\u7684\u6B3E\u9879\u4F1A\u5728\u6258\u7BA1\u8D26\u6237\u5185\u81EA\u52A8\u5151\u6362\u4E3A BSC \u94FE\u4E0A\u7684 USDT\uFF0C\u5E76\u6210\u6279\u8F6C\u5165 Kaluta \u5B89\u5168\u94B1\u5305\u3002"
    },
    steps: [
      "Open Payments and pick what you want to buy (Premium, ad credit, marketplace item).",
      "Choose your coin \u2014 350+ supported, including USDT on BSC.",
      'Send to the deposit address shown; watch the live status ticker until "finished".'
    ],
    image: "/assistant-illustration-1.jpg",
    imageAlt: "Crypto checkout flow with deposit address and live status",
    deepLink: { to: "/payments", label: "Open Payments" }
  },
  {
    id: "cashout-engine",
    title: { en: "Commission cashout ($1 rule)", sw: "Kutoa kamisheni (kanuni ya $1)", fr: "Retrait des commissions (r\xE8gle du 1 $)", ar: "\u0633\u062D\u0628 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062A (\u0642\u0627\u0639\u062F\u0629 1 \u062F\u0648\u0644\u0627\u0631)", zh: "\u4F63\u91D1\u63D0\u73B0\uFF081 \u7F8E\u5143\u89C4\u5219\uFF09" },
    module: "Payments guide",
    version: "v2.15.0",
    roles: ["member", "admin"],
    keywords: ["cashout", "withdraw", "commission", "one dollar", "$1", "threshold", "escrow", "mass payout", "kutoa", "kamisheni", "retrait", "\u0633\u062D\u0628", "\u0639\u0645\u0648\u0644\u0629", "\u0625\u0633\u0643\u0631\u0648", "\u63D0\u73B0", "\u4F63\u91D1", "\u6258\u7BA1"],
    answer: {
      en: "Affiliate commissions are allocated 10 levels deep on every eligible purchase and tracked in the immutable ledger. When your accrued balance reaches $1, you automatically join the next NowPayments Mass Payouts batch to your whitelisted wallet \u2014 no request needed. Below $1, your commissions stay securely in the NowPayments custody balance (the escrow) until the threshold is met.",
      sw: "Kamisheni hugawanywa ngazi 10 kwa kila nunuzi na kurekodiwa kwenye ledger. Salio likifika $1, unaingia otomatiki kwenye kundi lifuatalo la Mass Payouts kwenda kwenye mkoba wako \u2014 bila ombi. Chini ya $1, kamisheni hubaki salama kwenye salio la custody la NowPayments (escrow) hadi kiwango kifikwe.",
      fr: "Les commissions d\u2019affiliation sont allou\xE9es sur 10 niveaux et consign\xE9es au registre immuable. D\xE8s que votre solde atteint 1 $, vous rejoignez automatiquement le prochain lot de Mass Payouts NowPayments vers votre portefeuille en liste blanche \u2014 sans demande. En dessous de 1 $, elles restent en s\xE9curit\xE9 dans le solde de custody NowPayments (l\u2019escrow) jusqu\u2019au seuil.",
      ar: "\u062A\u064F\u0648\u0632\u064E\u0651\u0639 \u0639\u0645\u0648\u0644\u0627\u062A \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u0639\u0644\u0649 \u0639\u0634\u0631\u0629 \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0648\u062A\u064F\u0633\u062C\u064E\u0651\u0644 \u0641\u064A \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u062B\u0627\u0628\u062A. \u0639\u0646\u062F\u0645\u0627 \u064A\u0628\u0644\u063A \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u0645\u062A\u0631\u0627\u0643\u0645 \u062F\u0648\u0644\u0627\u0631\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627\u060C \u062A\u0646\u0636\u0645 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0625\u0644\u0649 \u062F\u0641\u0639\u0629 \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u062C\u0645\u0627\u0639\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0645\u0646 NowPayments \u0625\u0644\u0649 \u0645\u062D\u0641\u0638\u062A\u0643 \u0627\u0644\u0645\u062F\u0631\u062C\u0629 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0628\u064A\u0636\u0627\u0621 \u2014 \u062F\u0648\u0646 \u0623\u064A \u0637\u0644\u0628. \u0648\u0645\u0627 \u062F\u0648\u0646 \u0627\u0644\u062F\u0648\u0644\u0627\u0631\u060C \u062A\u0628\u0642\u0649 \u0639\u0645\u0648\u0644\u0627\u062A\u0643 \u0645\u062D\u0641\u0648\u0638\u0629 \u0628\u0623\u0645\u0627\u0646 \u0641\u064A \u0631\u0635\u064A\u062F \u0627\u0644\u062D\u0641\u0638 \u0644\u062F\u0649 NowPayments (\u0627\u0644\u0636\u0645\u0627\u0646) \u062D\u062A\u0649 \u0628\u0644\u0648\u063A \u0627\u0644\u062D\u062F.",
      zh: "\u63A8\u8350\u4F63\u91D1\u5728\u6BCF\u4E00\u7B14\u7B26\u5408\u6761\u4EF6\u7684\u8D2D\u4E70\u4E2D\u6309 10 \u7EA7\u6DF1\u5EA6\u5206\u914D\uFF0C\u5E76\u8BB0\u5F55\u5728\u4E0D\u53EF\u7BE1\u6539\u7684\u8D26\u672C\u4E2D\u3002\u5F53\u7D2F\u8BA1\u4F59\u989D\u8FBE\u5230 1 \u7F8E\u5143\u65F6\uFF0C\u60A8\u4F1A\u81EA\u52A8\u52A0\u5165\u4E0B\u4E00\u6279 NowPayments \u6279\u91CF\u4ED8\u6B3E\uFF0C\u76F4\u63A5\u6253\u5165\u60A8\u7684\u767D\u540D\u5355\u94B1\u5305\u2014\u2014\u65E0\u9700\u7533\u8BF7\u3002\u4F4E\u4E8E 1 \u7F8E\u5143\u65F6\uFF0C\u4F63\u91D1\u5B89\u5168\u5730\u4FDD\u5B58\u5728 NowPayments \u6258\u7BA1\u4F59\u989D\uFF08\u6258\u7BA1\u8D26\u6237\uFF09\u4E2D\uFF0C\u76F4\u5230\u8FBE\u5230\u95E8\u69DB\u3002"
    },
    steps: [
      "Earn commissions \u2014 allocations post to the ledger per level (L1\u2026L10).",
      "Watch your balance accumulate toward $1 in your backoffice.",
      "At $1+ the escrow lock opens and you enter the next payout batch automatically."
    ],
    deepLink: { to: "/payments", label: "See the cashout engine" }
  },
  {
    id: "payout-eligibility",
    title: { en: "Payout eligibility (KYC + wallet)", sw: "Ustahiki wa malipo (KYC + mkoba)", fr: "\xC9ligibilit\xE9 aux paiements (KYC + portefeuille)", ar: "\u0623\u0647\u0644\u064A\u0629 \u0627\u0644\u0633\u062D\u0628 (\u0627\u0644\u062A\u062D\u0642\u0642 + \u0627\u0644\u0645\u062D\u0641\u0638\u0629)", zh: "\u63D0\u73B0\u8D44\u683C\uFF08\u5B9E\u540D\u8BA4\u8BC1 + \u94B1\u5305\uFF09" },
    module: "Payments guide",
    version: "v2.15.0",
    roles: ["member", "admin"],
    keywords: ["eligibility", "qualify", "verify", "verified", "wallet address", "backoffice", "kyc", "ustahiki", "\xE9ligibilit\xE9", "\u0623\u0647\u0644\u064A\u0629", "\u0645\u062D\u0641\u0638\u0629", "\u8D44\u683C", "\u94B1\u5305\u5730\u5740", "\u5B9E\u540D"],
    answer: {
      en: 'To qualify for commission payouts you need two things in place: (1) your account verified through KalutaKYC, and (2) your crypto wallet address (BSC) filled into your backoffice. Until both are done you keep earning \u2014 your commissions accrue normally \u2014 but your payouts show "Action required" instead of entering the batch.',
      sw: 'Ili kustahili malipo ya kamisheni unahitaji mambo mawili: (1) akaunti yako kuthibitishwa kupitia KalutaKYC, na (2) anwani ya mkoba wako wa crypto (BSC) kujazwa kwenye backoffice yako. Kabla hayo hujakamilika, kamisheni zinaendelea kukusanyika \u2014 lakini malipo yanaonyesha "Hatua inahitajika".',
      fr: "Pour recevoir vos commissions, deux conditions : (1) compte v\xE9rifi\xE9 via KalutaKYC, (2) adresse de portefeuille crypto (BSC) renseign\xE9e dans votre backoffice. Tant que ce n\u2019est pas fait, vos commissions continuent de s\u2019accumuler, mais vos paiements affichent \xAB Action requise \xBB au lieu d\u2019entrer dans le lot.",
      ar: '\u0644\u0644\u062A\u0623\u0647\u0644 \u0644\u0633\u062D\u0628 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062A \u064A\u0644\u0632\u0645 \u0623\u0645\u0631\u0627\u0646: (1) \u062A\u0648\u062B\u064A\u0642 \u062D\u0633\u0627\u0628\u0643 \u0639\u0628\u0631 KalutaKYC\u060C \u0648(2) \u0625\u062F\u062E\u0627\u0644 \u0639\u0646\u0648\u0627\u0646 \u0645\u062D\u0641\u0638\u062A\u0643 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 (BSC) \u0641\u064A \u0627\u0644\u0645\u0643\u062A\u0628 \u0627\u0644\u062E\u0644\u0641\u064A. \u0648\u062D\u062A\u0649 \u0627\u0643\u062A\u0645\u0627\u0644\u0647\u0645\u0627 \u062A\u0633\u062A\u0645\u0631 \u0639\u0645\u0648\u0644\u0627\u062A\u0643 \u0641\u064A \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u060C \u0644\u0643\u0646 \u0645\u062F\u0641\u0648\u0639\u0627\u062A\u0643 \u062A\u0638\u0647\u0631 "\u0625\u062C\u0631\u0627\u0621 \u0645\u0637\u0644\u0648\u0628" \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u062F\u062E\u0648\u0644 \u0627\u0644\u062F\u0641\u0639\u0629.',
      zh: '\u8981\u83B7\u5F97\u4F63\u91D1\u63D0\u73B0\u8D44\u683C\uFF0C\u9700\u8981\u5B8C\u6210\u4E24\u9879\uFF1A(1) \u901A\u8FC7 KalutaKYC \u5B8C\u6210\u8D26\u6237\u8BA4\u8BC1\uFF1B(2) \u5728\u540E\u53F0\u586B\u5199\u60A8\u7684\u52A0\u5BC6\u94B1\u5305\u5730\u5740\uFF08BSC\uFF09\u3002\u5728\u5B8C\u6210\u4E4B\u524D\uFF0C\u60A8\u7684\u4F63\u91D1\u4F1A\u6B63\u5E38\u7D2F\u8BA1\uFF0C\u4F46\u63D0\u73B0\u72B6\u6001\u4F1A\u663E\u793A"\u9700\u8981\u64CD\u4F5C"\uFF0C\u4E0D\u4F1A\u8FDB\u5165\u4ED8\u6B3E\u6279\u6B21\u3002'
    },
    deepLink: { to: "/payments", label: "Check my eligibility" }
  },
  {
    id: "fiat-escrow-rail",
    title: { en: "Bank cashout (fiat rail)", sw: "Kutoa kwa benki (njia ya fiat)", fr: "Retrait bancaire (rail fiat)", ar: "\u0627\u0644\u0633\u062D\u0628 \u0627\u0644\u0628\u0646\u0643\u064A (\u0642\u0646\u0627\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u062A\u0642\u0644\u064A\u062F\u064A\u0629)", zh: "\u94F6\u884C\u63D0\u73B0\uFF08\u6CD5\u5E01\u901A\u9053\uFF09" },
    module: "Payments guide",
    version: "v2.15.0",
    roles: ["member", "admin"],
    keywords: ["bank", "fiat", "cashout bank", "mangopay", "trolley", "hyperwallet", "escrow service", "benki", "banque", "\u0628\u0646\u0643", "\u0645\u0635\u0631\u0641", "\u94F6\u884C", "\u6CD5\u5E01"],
    answer: {
      en: "A fiat cashout option arrives after onboarding a bank-grade escrow partner that can distribute commissions 10 levels deep worldwide. The recommended provider is Mangopay \u2014 purpose-built escrow wallets, unlimited-duration escrow, multi-party splits across a 10-level chain, per-user KYC\u2019d e-wallets and worldwide bank payouts \u2014 with Trolley, Hyperwallet, Tipalti or PayQuicker as complementary last-mile rails. Both rails reconcile to the same immutable ledger.",
      sw: "Chaguo la kutoa kwa benki linakuja baada ya kupata mshirika wa escrow wa kiwango cha benki awezaye kusambaza kamisheni ngazi 10 ulimwenguni. Mtoa huduma anayependekezwa ni Mangopay \u2014 miamaba ya escrow, muda usio na kikomo, mgawanyo wa pande nyingi ngazi 10, na malipo ya benki ulimwenguni \u2014 na Trolley, Hyperwallet, Tipalti au PayQuicker kama njia za ziada.",
      fr: "Le retrait bancaire arrive apr\xE8s l\u2019int\xE9gration d\u2019un partenaire escrow bancaire capable de distribuer des commissions sur 10 niveaux dans le monde entier. Le prestataire recommand\xE9 est Mangopay \u2014 portefeuilles escrow d\xE9di\xE9s, escrow sans limite de dur\xE9e, r\xE9partitions multi-parties sur 10 niveaux, e-wallets v\xE9rifi\xE9s par utilisateur et paiements bancaires mondiaux \u2014 avec Trolley, Hyperwallet, Tipalti ou PayQuicker en rails compl\xE9mentaires.",
      ar: "\u064A\u0635\u0644 \u062E\u064A\u0627\u0631 \u0627\u0644\u0633\u062D\u0628 \u0627\u0644\u0628\u0646\u0643\u064A \u0628\u0639\u062F \u0627\u0644\u062A\u0639\u0627\u0642\u062F \u0645\u0639 \u0634\u0631\u064A\u0643 \u0636\u0645\u0627\u0646 \u0645\u0635\u0631\u0641\u064A \u0642\u0627\u062F\u0631 \u0639\u0644\u0649 \u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062A \u0639\u0628\u0631 \u0639\u0634\u0631\u0629 \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0639\u0627\u0644\u0645\u064A\u064B\u0627. \u0627\u0644\u0645\u0632\u0648\u0651\u062F \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647 \u0647\u0648 Mangopay \u2014 \u0645\u062D\u0627\u0641\u0638 \u0636\u0645\u0627\u0646 \u0645\u062E\u0635\u0635\u0629\u060C \u0636\u0645\u0627\u0646 \u063A\u064A\u0631 \u0645\u062D\u062F\u0648\u062F \u0627\u0644\u0645\u062F\u0629\u060C \u062A\u0648\u0632\u064A\u0639 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0639\u0628\u0631 10 \u0645\u0633\u062A\u0648\u064A\u0627\u062A\u060C \u0645\u062D\u0627\u0641\u0638 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629 \u0645\u0648\u062B\u0642\u0629 \u0644\u0643\u0644 \u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0628\u0646\u0643\u064A\u0629 \u0639\u0627\u0644\u0645\u064A\u0629 \u2014 \u0645\u0639 Trolley \u0648Hyperwallet \u0648Tipalti \u0623\u0648 PayQuicker \u0643\u0642\u0646\u0648\u0627\u062A \u062A\u0643\u0645\u064A\u0644\u064A\u0629.",
      zh: "\u94F6\u884C\u63D0\u73B0\u9009\u9879\u5C06\u5728\u63A5\u5165\u80FD\u591F\u5168\u7403 10 \u7EA7\u6DF1\u5EA6\u5206\u53D1\u4F63\u91D1\u7684\u94F6\u884C\u7EA7\u6258\u7BA1\u5408\u4F5C\u4F19\u4F34\u540E\u4E0A\u7EBF\u3002\u63A8\u8350\u670D\u52A1\u5546\u4E3A Mangopay\u2014\u2014\u4E13\u7528\u6258\u7BA1\u94B1\u5305\u3001\u65E0\u9650\u671F\u6258\u7BA1\u300110 \u7EA7\u94FE\u591A\u65B9\u5206\u8D26\u3001\u6BCF\u7528\u6237\u5B9E\u540D\u7535\u5B50\u94B1\u5305\u53CA\u5168\u7403\u94F6\u884C\u4ED8\u6B3E\u2014\u2014\u5E76\u53EF\u642D\u914D Trolley\u3001Hyperwallet\u3001Tipalti \u6216 PayQuicker \u4F5C\u4E3A\u8865\u5145\u901A\u9053\u3002\u4E24\u6761\u901A\u9053\u90FD\u4E0E\u540C\u4E00\u672C\u4E0D\u53EF\u7BE1\u6539\u8D26\u672C\u52A0\u5BF9\u8D26\u3002"
    },
    deepLink: { to: "/payments", label: "See the dual-rail plan" }
  },
  {
    id: "onboarding-concierge",
    title: { en: "Onboarding Concierge", sw: "Msaidizi wa Kuanza", fr: "Concierge d\u2019accueil", ar: "\u0645\u0631\u0634\u062F \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645", zh: "\u65B0\u624B\u5F15\u5BFC\u52A9\u624B" },
    module: "App guide",
    version: "v2.15.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["onboarding", "getting started", "new member", "setup", "concierge", "kuanza", "mwanzo", "bienvenue", "\u0627\u0646\u0636\u0645\u0627\u0645", "\u65B0\u624B", "\u5165\u95E8"],
    answer: {
      en: "The AI Onboarding Concierge interviews you when you join \u2014 interests, languages, city, goals \u2014 then builds your starter Kaluta automatically: first Circles, your chosen algorithm, feed-mode defaults, step 1 of your Family Tree, and even a first drafted post. Try the live demo inside the App page.",
      sw: "Msaidizi wa Kuanza wa AI hukuuliza maswali unapojiunga \u2014 maslahi, lugha, mji, malengo \u2014 kisha kujenga Kaluta yako ya mwanzo: Circles za kwanza, algorithm, mipangilio ya mlisho, hatua ya kwanza ya Mti wa Familia, na chapisho la kwanza.",
      fr: "Le Concierge d\u2019accueil IA vous interviewe \xE0 votre arriv\xE9e \u2014 centres d\u2019int\xE9r\xEAt, langues, ville, objectifs \u2014 puis construit votre Kaluta de d\xE9part : premiers Cercles, algorithme choisi, modes de fil par d\xE9faut, premi\xE8re \xE9tape de votre arbre familial et m\xEAme une premi\xE8re publication r\xE9dig\xE9e.",
      ar: "\u064A\u0642\u0648\u0645 \u0645\u0631\u0634\u062F \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0627\u0644\u0630\u0643\u064A \u0628\u0645\u0642\u0627\u0628\u0644\u062A\u0643 \u0639\u0646\u062F \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u2014 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0648\u0627\u0644\u0644\u063A\u0627\u062A \u0648\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0623\u0647\u062F\u0627\u0641 \u2014 \u062B\u0645 \u064A\u0628\u0646\u064A \u0627\u0646\u0637\u0644\u0627\u0642\u062A\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627: \u062F\u0648\u0627\u0626\u0631\u0643 \u0627\u0644\u0623\u0648\u0644\u0649\u060C \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u062A\u0643 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629\u060C \u0623\u0648\u0636\u0627\u0639 \u0627\u0644\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629\u060C \u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u0646 \u0634\u062C\u0631\u0629 \u0639\u0627\u0626\u0644\u062A\u0643\u060C \u0648\u062D\u062A\u0649 \u0645\u0633\u0648\u062F\u0629 \u0645\u0646\u0634\u0648\u0631\u0643 \u0627\u0644\u0623\u0648\u0644.",
      zh: "AI \u65B0\u624B\u5F15\u5BFC\u52A9\u624B\u4F1A\u5728\u60A8\u52A0\u5165\u65F6\u4E0E\u60A8\u5BF9\u8BDD\u2014\u2014\u5174\u8DA3\u3001\u8BED\u8A00\u3001\u57CE\u5E02\u3001\u76EE\u6807\u2014\u2014\u7136\u540E\u81EA\u52A8\u4E3A\u60A8\u642D\u5EFA\u521D\u59CB\u4F53\u9A8C\uFF1A\u9996\u6279\u5708\u5B50\u3001\u6240\u9009\u7B97\u6CD5\u3001\u4FE1\u606F\u6D41\u9ED8\u8BA4\u8BBE\u7F6E\u3001\u5BB6\u65CF\u6811\u7B2C\u4E00\u6B65\uFF0C\u751A\u81F3\u4E3A\u60A8\u8D77\u8349\u7B2C\u4E00\u6761\u5E16\u5B50\u3002"
    },
    deepLink: { to: "/app", label: "Try the concierge demo" }
  },
  {
    id: "heritage-interview",
    title: { en: "Heritage Interview Agent", sw: "Wakala wa Mahojiano ya Urithi", fr: "Agent d\u2019interview patrimoine", ar: "\u0648\u0643\u064A\u0644 \u0645\u0642\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u062A\u0631\u0627\u062B", zh: "\u5BB6\u65CF\u4F20\u627F\u8BBF\u8C08\u52A9\u624B" },
    module: "Family guide",
    version: "v2.15.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["interview", "elder", "story", "record story", "heritage interview", "oral history", "mahojiano", "mzee", "interview", "ain\xE9", "\u0645\u0642\u0627\u0628\u0644\u0629", "\u0643\u0628\u0627\u0631 \u0627\u0644\u0633\u0646", "\u8BBF\u8C08", "\u957F\u8F88"],
    answer: {
      en: "The Heritage Interview Agent holds a gentle guided conversation with an elder in their own language, records it, transcribes it, and files the structured answers into your Family Heritage Archive \u2014 linked to their Person Record and family timeline. The original recording is always preserved byte-for-byte; the transcript is labeled AI Assisted, and every claim cites the recording. AI never invents history.",
      sw: "Wakala wa Mahojiano ya Urithi hufanya mazungumzo ya kuongozwa na mzee kwa lugha yake, kurekodi, kunakili, na kuhifadhi majibu kwenye Kumbukumbu ya Urithi wa Familia \u2014 ukihusisha na Rekodi yake ya Mtu na ratiba ya familia. Rekodi asili huhifadhiwa daima; nakili huwekewa lebo AI Assisted, na kila dai linataja rekodi. AI haitungi historia.",
      fr: "L\u2019Agent d\u2019interview patrimoine m\xE8ne une conversation guid\xE9e et bienveillante avec un a\xEEn\xE9 dans sa langue, l\u2019enregistre, la transcrit et classe les r\xE9ponses structur\xE9es dans vos Archives familiales \u2014 li\xE9es \xE0 sa fiche et \xE0 la chronologie. L\u2019enregistrement original est toujours pr\xE9serv\xE9 \xE0 l\u2019identique ; la transcription est \xE9tiquet\xE9e IA Assist\xE9e, et chaque fait cite l\u2019enregistrement. L\u2019IA n\u2019invente jamais l\u2019histoire.",
      ar: '\u064A\u062C\u0631\u064A \u0648\u0643\u064A\u0644 \u0645\u0642\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u062A\u0631\u0627\u062B \u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0648\u062C\u0651\u0647\u0629 \u0644\u0637\u064A\u0641\u0629 \u0645\u0639 \u0643\u0628\u064A\u0631 \u0641\u064A \u0627\u0644\u0633\u0646 \u0628\u0644\u063A\u062A\u0647\u060C \u0648\u064A\u0633\u062C\u0644\u0647\u0627 \u0648\u064A\u0646\u0633\u062E\u0647\u0627 \u0648\u064A\u062D\u0641\u0638 \u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0641\u064A \u0623\u0631\u0634\u064A\u0641 \u0627\u0644\u062A\u0631\u0627\u062B \u0627\u0644\u0639\u0627\u0626\u0644\u064A \u2014 \u0645\u0631\u0628\u0648\u0637\u0629 \u0628\u0633\u062C\u0644\u0647 \u0627\u0644\u0634\u062E\u0635\u064A \u0648\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A \u0644\u0644\u0639\u0627\u0626\u0644\u0629. \u064A\u064F\u062D\u0641\u0638 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0623\u0635\u0644\u064A \u062F\u0627\u0626\u0645\u064B\u0627 \u0643\u0645\u0627 \u0647\u0648\u061B \u0648\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0646\u0633\u0648\u062E \u0645\u0648\u0633\u0648\u0645 \u0628\u0640"\u0628\u0645\u0633\u0627\u0639\u062F\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A"\u060C \u0648\u0643\u0644 \u0645\u0639\u0644\u0648\u0645\u0629 \u062A\u064F\u0646\u0633\u0628 \u0625\u0644\u0649 \u0627\u0644\u062A\u0633\u062C\u064A\u0644. \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0627 \u064A\u062E\u062A\u0644\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0623\u0628\u062F\u064B\u0627.',
      zh: '\u5BB6\u65CF\u4F20\u627F\u8BBF\u8C08\u52A9\u624B\u4F1A\u7528\u957F\u8F88\u7684\u6BCD\u8BED\u4E0E\u5176\u8FDB\u884C\u6E29\u548C\u7684\u5F15\u5BFC\u5F0F\u5BF9\u8BDD\uFF0C\u5F55\u97F3\u3001\u8F6C\u5199\uFF0C\u5E76\u5C06\u6574\u7406\u597D\u7684\u5185\u5BB9\u5F52\u6863\u5230\u5BB6\u65CF\u4F20\u627F\u6863\u6848\u9986\u2014\u2014\u4E0E\u5176\u4E2A\u4EBA\u6863\u6848\u548C\u5BB6\u65CF\u65F6\u95F4\u7EBF\u5173\u8054\u3002\u539F\u59CB\u5F55\u97F3\u59CB\u7EC8\u9010\u5B57\u8282\u4FDD\u5B58\uFF1B\u8F6C\u5199\u6587\u672C\u6807\u6CE8\u4E3A"AI \u8F85\u52A9"\uFF0C\u6BCF\u5904\u5185\u5BB9\u5747\u5F15\u7528\u5F55\u97F3\u6765\u6E90\u3002AI \u7EDD\u4E0D\u865A\u6784\u5386\u53F2\u3002'
    },
    image: "/assistant-illustration-2.jpg",
    imageAlt: "Heritage interview filed into the family archive",
    deepLink: { to: "/family", label: "Meet the Interview Agent" }
  },
  {
    id: "prepublish-guardian",
    title: { en: "Pre-Publish Guardian", sw: "Mlinzi wa Kabla ya Kuchapisha", fr: "Gardien pr\xE9-publication", ar: "\u062D\u0627\u0631\u0633 \u0645\u0627 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631", zh: "\u53D1\u5E03\u524D\u5B88\u62A4" },
    module: "Creator guide",
    version: "v2.15.0",
    roles: ["member", "admin"],
    keywords: ["pre-publish", "guardian", "flag", "rule", "violation", "will this be flagged", "mlinzi", "avant publication", "\u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631", "\u53D1\u5E03\u524D", "\u8FDD\u89C4"],
    answer: {
      en: 'Before you publish, the Pre-Publish Guardian scans your draft and tells you plainly: whether it is likely to be flagged, the exact rule (e.g. Rule 4.2 \u2014 unverified health claim), why, and a suggested fix. Apply the edit and you get a green "Safe to publish". Moderation that helps you publish \u2014 not strike you after.',
      sw: 'Kabla ya kuchapisha, Mlinzi wa Kabla ya Kuchapisha huchunguza rasimu yako na kukuambia wazi: kama inaweza kuashiria, kanuni halisi (k.m. Kanuni 4.2 \u2014 dai la afya lisilothibitishwa), kwa nini, na mapendekezo ya kurekebisha. Fanya marekebisho upate "Salama kuchapisha".',
      fr: "Avant de publier, le Gardien pr\xE9-publication analyse votre brouillon et vous dit clairement s\u2019il risque d\u2019\xEAtre signal\xE9, la r\xE8gle exacte (ex. R\xE8gle 4.2 \u2014 all\xE9gation sant\xE9 non v\xE9rifi\xE9e), pourquoi, et propose une correction. Appliquez-la et obtenez le feu vert \xAB Publication s\xFBre \xBB.",
      ar: '\u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631\u060C \u064A\u0641\u062D\u0635 \u062D\u0627\u0631\u0633 \u0645\u0627 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631 \u0645\u0633\u0648\u062F\u062A\u0643 \u0648\u064A\u062E\u0628\u0631\u0643 \u0628\u0648\u0636\u0648\u062D: \u0647\u0644 \u0645\u0646 \u0627\u0644\u0645\u0631\u062C\u062D \u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646\u0647\u0627\u060C \u0648\u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 (\u0645\u062B\u0644 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 4.2 \u2014 \u0627\u062F\u0639\u0627\u0621 \u0635\u062D\u064A \u063A\u064A\u0631 \u0645\u0648\u062B\u0642)\u060C \u0648\u0644\u0645\u0627\u0630\u0627\u060C \u0645\u0639 \u0627\u0642\u062A\u0631\u0627\u062D \u062A\u0635\u062D\u064A\u062D. \u0637\u0628\u0651\u0642 \u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u0648\u062A\u062D\u0635\u0644 \u0639\u0644\u0649 "\u0622\u0645\u0646 \u0644\u0644\u0646\u0634\u0631".',
      zh: '\u53D1\u5E03\u524D\uFF0C"\u53D1\u5E03\u524D\u5B88\u62A4"\u4F1A\u626B\u63CF\u60A8\u7684\u8349\u7A3F\u5E76\u660E\u786E\u544A\u77E5\uFF1A\u662F\u5426\u53EF\u80FD\u88AB\u6807\u8BB0\u3001\u5177\u4F53\u8FDD\u53CD\u7684\u89C4\u5219\uFF08\u5982\u89C4\u5219 4.2\u2014\u2014\u672A\u7ECF\u9A8C\u8BC1\u7684\u5065\u5EB7\u58F0\u660E\uFF09\u3001\u539F\u56E0\u4EE5\u53CA\u4FEE\u6539\u5EFA\u8BAE\u3002\u5E94\u7528\u4FEE\u6539\u540E\u5373\u53EF\u83B7\u5F97\u7EFF\u8272\u7684"\u53EF\u4EE5\u5B89\u5168\u53D1\u5E03"\u72B6\u6001\u3002'
    },
    deepLink: { to: "/creators", label: "See the Guardian" }
  },
  {
    id: "wellbeing",
    title: { en: "Wellbeing & Session Intelligence", sw: "Ustawi na Akili ya Kipindi", fr: "Bien-\xEAtre et intelligence de session", ar: "\u0627\u0644\u0631\u0641\u0627\u0647 \u0648\u0630\u0643\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629", zh: "\u5065\u5EB7\u4E0E\u4F1A\u8BDD\u667A\u80FD" },
    module: "App guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["wellbeing", "session intelligence", "scroll", "break", "balance score", "ustawi", "pumziko", "bien-\xEAtre", "\u0627\u0644\u0631\u0641\u0627\u0647", "\u0627\u0633\u062A\u0631\u0627\u062D\u0629", "\u5065\u5EB7", "\u5C4F\u5E55\u65F6\u95F4"],
    answer: {
      en: "Wellbeing & Session Intelligence is an opt-in panel that notices continuous-scroll patterns \u2014 like 42 minutes without a pause \u2014 and responds with a gentle intervention card suggesting a switch to the Positive Content algorithm or a short break. A personal wellbeing dashboard tracks your balance score over time so you can see how your sessions trend. It is private by design: the analysis is for you alone, and no wellbeing data is shared with other members or advertisers.",
      sw: "Ustawi na Akili ya Kipindi ni paneli ya kujiunga inayotambua mifumo ya kusoma bila mapumziko \u2014 kama dakika 42 mfululizo \u2014 na kujibu kwa kadi laini inayopendekeza ubadilishe kwa algorithm ya Positive Content au upumzike kidogo. Dashibodi yako binafsi ya ustawi hufuatilia alama yako ya usawa kwa muda ili uone mwenendo wa vipindi vyako. Ni ya faragha kwa muundo: uchambuzi ni wako pekee, na hakuna data ya ustawi inayoshirikiwa na wanachama wengine au watangazaji.",
      fr: "Bien-\xEAtre et intelligence de session est un panneau optionnel qui d\xE9tecte les sch\xE9mas de d\xE9filement continu \u2014 42 minutes sans pause, par exemple \u2014 et r\xE9pond par une carte d\u2019intervention douce sugg\xE9rant de passer \xE0 l\u2019algorithme Positive Content ou de souffler un peu. Un tableau de bord personnel suit votre score d\u2019\xE9quilibre dans le temps. C\u2019est priv\xE9 par conception : l\u2019analyse est pour vous seul, et aucune donn\xE9e de bien-\xEAtre n\u2019est partag\xE9e avec d\u2019autres membres ou des annonceurs.",
      ar: "\u0627\u0644\u0631\u0641\u0627\u0647 \u0648\u0630\u0643\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629 \u0644\u0648\u062D\u0629 \u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629 \u062A\u0631\u0635\u062F \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u062A\u0645\u0631\u064A\u0631 \u0627\u0644\u0645\u062A\u0648\u0627\u0635\u0644 \u2014 \u0645\u062B\u0644 42 \u062F\u0642\u064A\u0642\u0629 \u062F\u0648\u0646 \u062A\u0648\u0642\u0641 \u2014 \u0648\u062A\u0633\u062A\u062C\u064A\u0628 \u0628\u0628\u0637\u0627\u0642\u0629 \u062A\u062F\u062E\u0644 \u0644\u0637\u064A\u0641\u0629 \u062A\u0642\u062A\u0631\u062D \u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0625\u0644\u0649 \u062E\u0648\u0627\u0631\u0632\u0645\u064A\u0629 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A \u0623\u0648 \u0623\u062E\u0630 \u0627\u0633\u062A\u0631\u0627\u062D\u0629 \u0642\u0635\u064A\u0631\u0629. \u0648\u062A\u062A\u0628\u0639 \u0644\u0648\u062D\u0629 \u0627\u0644\u0631\u0641\u0627\u0647 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u062F\u0631\u062C\u0629 \u062A\u0648\u0627\u0632\u0646\u0643 \u0639\u0628\u0631 \u0627\u0644\u0632\u0645\u0646 \u0644\u062A\u0631\u0649 \u0627\u062A\u062C\u0627\u0647 \u062C\u0644\u0633\u0627\u062A\u0643. \u0648\u0647\u064A \u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u062A\u0635\u0645\u064A\u0645: \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0644\u0643 \u0648\u062D\u062F\u0643\u060C \u0648\u0644\u0627 \u062A\u064F\u0634\u0627\u0631\u0643 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0631\u0641\u0627\u0647 \u0645\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0622\u062E\u0631\u064A\u0646 \u0623\u0648 \u0627\u0644\u0645\u0639\u0644\u0646\u064A\u0646.",
      zh: '\u5065\u5EB7\u4E0E\u4F1A\u8BDD\u667A\u80FD\u662F\u4E00\u4E2A\u81EA\u613F\u5F00\u542F\u7684\u9762\u677F\uFF0C\u80FD\u8BC6\u522B\u8FDE\u7EED\u5237\u5C4F\u884C\u4E3A\u2014\u2014\u4F8B\u5982\u8FDE\u7EED 42 \u5206\u949F\u6CA1\u6709\u505C\u987F\u2014\u2014\u5E76\u4EE5\u6E29\u548C\u7684\u5E72\u9884\u5361\u7247\u56DE\u5E94\uFF0C\u5EFA\u8BAE\u60A8\u5207\u6362\u5230"\u6B63\u80FD\u91CF"\u7B97\u6CD5\u6216\u7A0D\u4F5C\u4F11\u606F\u3002\u4E2A\u4EBA\u5065\u5EB7\u4EEA\u8868\u76D8\u4F1A\u6301\u7EED\u8FFD\u8E2A\u60A8\u7684\u5E73\u8861\u5206\u6570\uFF0C\u8BA9\u60A8\u770B\u6E05\u81EA\u5DF1\u7684\u4F7F\u7528\u8D8B\u52BF\u3002\u5B83\u5728\u8BBE\u8BA1\u4E0A\u5C31\u662F\u79C1\u5BC6\u7684\uFF1A\u5206\u6790\u53EA\u4E3A\u60A8\u670D\u52A1\uFF0C\u4EFB\u4F55\u5065\u5EB7\u6570\u636E\u90FD\u4E0D\u4F1A\u4E0E\u5176\u4ED6\u4F1A\u5458\u6216\u5E7F\u544A\u5546\u5171\u4EAB\u3002'
    },
    steps: [
      "Open the App page and enable the Wellbeing panel \u2014 it is strictly opt-in.",
      'When the intervention card appears, tap "Switch to Positive Content" or "Take a break".',
      "Review your balance score trend on the personal wellbeing dashboard."
    ],
    image: "/assistant-illustration-2.jpg",
    imageAlt: "Wellbeing intervention card with balance score",
    deepLink: { to: "/app", label: "Open the App" }
  },
  {
    id: "data-saver",
    title: { en: "Offline-First & Data Saver", sw: "Offline-First na Kuokoa Data", fr: "Hors-ligne et \xE9conomie de donn\xE9es", ar: "\u0648\u0636\u0639 \u0639\u062F\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u062A\u0648\u0641\u064A\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", zh: "\u79BB\u7EBF\u4F18\u5148\u4E0E\u7701\u6D41\u91CF\u6A21\u5F0F" },
    module: "App guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["data saver", "offline", "low bandwidth", "text-first", "tap to load", "offline queue", "sms", "ussd", "okoa data", "hors ligne", "\u062A\u0648\u0641\u064A\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", "\u062F\u0648\u0646 \u0627\u062A\u0635\u0627\u0644", "\u7701\u6D41\u91CF", "\u79BB\u7EBF"],
    answer: {
      en: 'Low-Bandwidth Mode makes Kaluta offline-first. Flip the Data Saver toggle and the feed turns text-first: media collapses to tap-to-load placeholders that show the exact byte size before you spend it, and audio-first posts keep conversations flowing on thin connections. Posts you write offline sit in a compose queue \u2014 "2 posts queued \u2014 will send when online" \u2014 and an SMS/USSD fallback keeps the essentials reachable with no data at all.',
      sw: 'Hali ya Data Saver huifanya Kaluta kuwa offline-first. Washa Data Saver na mlisho hugeuka kuwa wa maandishi kwanza: media hujikunja kuwa tap-to-load ikionyesha ukubwa halisi wa byte kabla hujatumia, na machapisho ya audio-first huendeleza mazungumzo kwenye mtandao dhaifu. Machapisho uliyoandika nje ya mtandao huingia kwenye foleni \u2014 "machapisho 2 yako foleni \u2014 yatatumwa mtandaoni" \u2014 na njia ya SMS/USSD huweka mambo muhimu yanafikiwa bila data kabisa.',
      fr: "Le mode faible d\xE9bit rend Kaluta hors-ligne d\u2019abord. Activez l\u2019\xE9conomiseur de donn\xE9es et le fil devient texte d\u2019abord : les m\xE9dias se replient en vignettes \xE0 charger d\u2019un toucher, avec leur taille exacte en octets avant de la d\xE9penser, et les publications audio-first gardent la conversation vivante sur les connexions lentes. Vos brouillons hors ligne rejoignent une file \u2014 \xAB 2 publications en attente \u2014 envoi au retour en ligne \xBB \u2014 et le repli SMS/USSD garde l\u2019essentiel accessible sans aucune donn\xE9e.",
      ar: '\u0648\u0636\u0639 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0645\u0646\u062E\u0641\u0636 \u064A\u062C\u0639\u0644 \u0643\u0627\u0644\u0648\u062A\u0627 \u062A\u0639\u0645\u0644 \u062F\u0648\u0646 \u0627\u062A\u0635\u0627\u0644 \u0623\u0648\u0644\u064B\u0627. \u0641\u0639\u0651\u0644 \u0645\u0648\u0641\u0651\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A\u062A\u062D\u0648\u0644 \u0627\u0644\u0645\u0644\u062E\u0635 \u0625\u0644\u0649 \u0646\u0635 \u0623\u0648\u0644\u064B\u0627: \u062A\u0646\u0637\u0648\u064A \u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0625\u0644\u0649 \u0639\u0646\u0627\u0635\u0631 \u062A\u064F\u062D\u0645\u064E\u0651\u0644 \u0628\u0627\u0644\u0646\u0642\u0631 \u0645\u0639 \u0639\u0631\u0636 \u062D\u062C\u0645\u0647\u0627 \u0627\u0644\u062F\u0642\u064A\u0642 \u0628\u0627\u0644\u0628\u0627\u064A\u062A \u0642\u0628\u0644 \u0623\u0646 \u062A\u0646\u0641\u0642\u0647\u060C \u0648\u062A\u062D\u0627\u0641\u0638 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0639\u0644\u0649 \u062A\u062F\u0641\u0642 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0639\u0628\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u0636\u0639\u064A\u0641\u0629. \u0648\u062A\u0646\u062A\u0638\u0631 \u0645\u0633\u0648\u062F\u0627\u062A\u0643 \u0641\u064A \u0642\u0627\u0626\u0645\u0629 \u0625\u0631\u0633\u0627\u0644 \u2014 "\u0645\u0646\u0634\u0648\u0631\u0627\u0646 \u0641\u064A \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u2014 \u0633\u064A\u064F\u0631\u0633\u0644\u0627\u0646 \u0639\u0646\u062F \u0639\u0648\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644" \u2014 \u0648\u064A\u0648\u0641\u0631 \u062E\u064A\u0627\u0631 SMS/USSD \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0627\u062A \u062F\u0648\u0646 \u0623\u064A \u0628\u064A\u0627\u0646\u0627\u062A.',
      zh: '\u4F4E\u5E26\u5BBD\u6A21\u5F0F\u8BA9 Kaluta \u5B9E\u73B0\u79BB\u7EBF\u4F18\u5148\u3002\u6253\u5F00"\u7701\u6D41\u91CF"\u5F00\u5173\u540E\uFF0C\u4FE1\u606F\u6D41\u53D8\u4E3A\u6587\u5B57\u4F18\u5148\uFF1A\u5A92\u4F53\u6298\u53E0\u4E3A\u70B9\u6309\u52A0\u8F7D\u7684\u5360\u4F4D\u7B26\uFF0C\u5E76\u5728\u60A8\u82B1\u8D39\u6D41\u91CF\u524D\u663E\u793A\u786E\u5207\u5B57\u8282\u5927\u5C0F\uFF1B\u97F3\u9891\u4F18\u5148\u7684\u5E16\u5B50\u8BA9\u5BF9\u8BDD\u5728\u5F31\u7F51\u4E0B\u4E5F\u80FD\u7EE7\u7EED\u3002\u79BB\u7EBF\u65F6\u5199\u597D\u7684\u5E16\u5B50\u4F1A\u8FDB\u5165\u53D1\u9001\u961F\u5217\u2014\u2014"2 \u6761\u5E16\u5B50\u6392\u961F\u4E2D\u2014\u2014\u8054\u7F51\u540E\u81EA\u52A8\u53D1\u9001"\u2014\u2014\u800C SMS/USSD \u5907\u7528\u901A\u9053\u786E\u4FDD\u5728\u5B8C\u5168\u6CA1\u6709\u6D41\u91CF\u65F6\u4E5F\u80FD\u4F7F\u7528\u6838\u5FC3\u529F\u80FD\u3002'
    },
    steps: [
      "Toggle Data Saver in the feed header \u2014 media becomes tap-to-load with byte sizes.",
      "Compose while offline; your posts enter the send queue automatically.",
      "No data at all? Use the SMS/USSD fallback for the essentials."
    ],
    deepLink: { to: "/app", label: "Try Data Saver" }
  },
  {
    id: "series",
    title: { en: "Serialized Content", sw: "Maudhui ya Mfululizo", fr: "Contenus en s\xE9ries", ar: "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062A\u0633\u0644\u0633\u0644", zh: "\u8FDE\u8F7D\u5185\u5BB9" },
    module: "App guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["series", "episode", "episode 4 of 12", "next episode", "serialized", "streak", "mfululizo", "kipindi", "s\xE9rie", "\xE9pisode", "\u0645\u0633\u0644\u0633\u0644", "\u062D\u0644\u0642\u0629", "\u8FDE\u8F7D", "\u5267\u96C6"],
    answer: {
      en: 'Serialized Content turns great posts into binge-worthy series. The series rail shows exactly where you are \u2014 "Episode 4 of 12" \u2014 with next-episode play and a notification whenever a new episode drops from a series you follow. Creators earn streak badges for consistent publishing, and readers never lose their place.',
      sw: 'Maudhui ya Mfululizo hubadilisha machapisho mazuri kuwa mfululizo wa kufuatilia. Reli ya mfululizo inaonyesha hasa ulipo \u2014 "Kipindi 4 kati ya 12" \u2014 na uchezaji wa kipindi kinachofuata pamoja na arifa kila kipindi kipya kikitoka kutoka kwa mfululizo unaoufuatilia. Watayarishaji hupata beji za mfululizo kwa kuchapisha kwa nidhamu, na wasomaji hawaupotezi mahali walipo.',
      fr: "Les contenus en s\xE9ries transforment vos meilleures publications en feuilletons \xE0 suivre. Le rail de s\xE9rie indique pr\xE9cis\xE9ment o\xF9 vous en \xEAtes \u2014 \xAB \xC9pisode 4 sur 12 \xBB \u2014 avec lecture de l\u2019\xE9pisode suivant et notification \xE0 chaque nouvel \xE9pisode d\u2019une s\xE9rie suivie. Les cr\xE9ateurs gagnent des badges de r\xE9gularit\xE9, et les lecteurs ne perdent jamais leur place.",
      ar: '\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062A\u0633\u0644\u0633\u0644 \u064A\u062D\u0648\u0651\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0631\u0627\u0626\u0639\u0629 \u0625\u0644\u0649 \u0633\u0644\u0627\u0633\u0644 \u062A\u0633\u062A\u062D\u0642 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629. \u064A\u0639\u0631\u0636 \u0634\u0631\u064A\u0637 \u0627\u0644\u0633\u0644\u0633\u0644\u0629 \u0645\u0648\u0636\u0639\u0643 \u0628\u062F\u0642\u0629 \u2014 "\u0627\u0644\u062D\u0644\u0642\u0629 4 \u0645\u0646 12" \u2014 \u0645\u0639 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062D\u0644\u0642\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0648\u0625\u0634\u0639\u0627\u0631 \u0639\u0646\u062F \u0635\u062F\u0648\u0631 \u062D\u0644\u0642\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 \u0633\u0644\u0633\u0644\u0629 \u062A\u062A\u0627\u0628\u0639\u0647\u0627. \u0648\u064A\u062D\u0635\u0644 \u0627\u0644\u0645\u0628\u062F\u0639\u0648\u0646 \u0639\u0644\u0649 \u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631\u064A\u0629 \u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0647\u0645 \u0628\u0627\u0644\u0646\u0634\u0631\u060C \u0648\u0644\u0646 \u064A\u0636\u064A\u0639 \u0627\u0644\u0642\u0631\u0627\u0621 \u0645\u0643\u0627\u0646\u0647\u0645 \u0623\u0628\u062F\u064B\u0627.',
      zh: '\u8FDE\u8F7D\u5185\u5BB9\u8BA9\u4F18\u8D28\u5E16\u5B50\u53D8\u6210\u503C\u5F97\u8FFD\u66F4\u7684\u7CFB\u5217\u3002\u7CFB\u5217\u8FDB\u5EA6\u6761\u6E05\u6670\u663E\u793A\u60A8\u7684\u4F4D\u7F6E\u2014\u2014"\u7B2C 4 \u96C6\uFF0C\u5171 12 \u96C6"\u2014\u2014\u652F\u6301\u81EA\u52A8\u64AD\u653E\u4E0B\u4E00\u96C6\uFF0C\u5E76\u5728\u60A8\u5173\u6CE8\u7684\u7CFB\u5217\u66F4\u65B0\u65F6\u63A8\u9001\u901A\u77E5\u3002\u521B\u4F5C\u8005\u575A\u6301\u66F4\u65B0\u53EF\u83B7\u5F97\u8FDE\u66F4\u5FBD\u7AE0\uFF0C\u8BFB\u8005\u4E5F\u6C38\u8FDC\u4E0D\u4F1A\u4E22\u5931\u8FDB\u5EA6\u3002'
    },
    deepLink: { to: "/app", label: "Explore series" }
  },
  {
    id: "vault-resurfacing",
    title: { en: "AI Memory Resurfacing", sw: "Kufufua Kumbukumbu kwa AI", fr: "Resurgissement de la m\xE9moire IA", ar: "\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", zh: "AI \u8BB0\u5FC6\u5524\u56DE" },
    module: "App guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["vault", "resurfacing", "memory", "saved item", "knowledge vault", "trending", "kumbukumbu", "m\xE9moire", "coffre", "\u0630\u0627\u0643\u0631\u0629", "\u0627\u0633\u062A\u0631\u062C\u0627\u0639", "\u8BB0\u5FC6", "\u5524\u56DE", "\u77E5\u8BC6\u5E93"],
    answer: {
      en: "The Knowledge Vault does not just store what you save \u2014 it resurfaces it when it matters. If a discussion trends that relates to something you saved months ago \u2014 say, the cassava farming proposal you filed six months back and a trending Kigoma Forum thread \u2014 the Vault brings it back to the top with its context. Every resurfaced card offers Open, View, Dismiss and Undo, so the memory works for you, never against you.",
      sw: "Kumbukumbu (Vault) haituhifadhi tu ulichohifadhi \u2014 hulirudisha linapohitajika. Ikiwa mjadala unaovuma unahusiana na kitu ulichohifadhi miezi iliyopita \u2014 kama pendekezo lako la kilimo cha mihogo uliloweka miezi sita iliyopita na mjadala unaovuma wa Kigoma Forum \u2014 Vault hulirudisha juu na muktadha wake. Kila kadi inayorudishwa ina vitufe vya Open, View, Dismiss na Undo, hivyo kumbukumbu inakufanyia kazi wewe, si dhidi yako.",
      fr: "Le coffre de connaissances ne se contente pas de stocker vos sauvegardes \u2014 il les fait resurgir au bon moment. Si une discussion tendance touche \xE0 un \xE9l\xE9ment sauvegard\xE9 il y a des mois \u2014 par exemple votre projet de culture du manioc archiv\xE9 il y a six mois et un fil du Forum de Kigoma en vogue \u2014 le coffre le remonte avec son contexte. Chaque carte propose Ouvrir, Voir, Ignorer et Annuler : la m\xE9moire travaille pour vous, jamais contre vous.",
      ar: "\u062E\u0632\u0627\u0646\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0644\u0627 \u062A\u062E\u0632\u0651\u0646 \u0645\u0627 \u062A\u062D\u0641\u0638\u0647 \u0641\u062D\u0633\u0628 \u2014 \u0628\u0644 \u062A\u0639\u064A\u062F \u0625\u0638\u0647\u0627\u0631\u0647 \u0639\u0646\u062F\u0645\u0627 \u064A\u0647\u0645. \u0625\u0630\u0627 \u0627\u0646\u062A\u0634\u0631 \u0646\u0642\u0627\u0634 \u064A\u062A\u0635\u0644 \u0628\u0634\u064A\u0621 \u062D\u0641\u0638\u062A\u0647 \u0642\u0628\u0644 \u0623\u0634\u0647\u0631 \u2014 \u0643\u0627\u0642\u062A\u0631\u0627\u062D\u0643 \u0639\u0646 \u0632\u0631\u0627\u0639\u0629 \u0627\u0644\u0643\u0627\u0633\u0627\u0641\u0627 \u0627\u0644\u0645\u0624\u0631\u0634\u0641 \u0642\u0628\u0644 \u0633\u062A\u0629 \u0623\u0634\u0647\u0631 \u0648\u0645\u0648\u0636\u0648\u0639 \u0631\u0627\u0626\u062C \u0641\u064A \u0645\u0646\u062A\u062F\u0649 \u0643\u064A\u063A\u0648\u0645\u0627 \u2014 \u062A\u064F\u0639\u064A\u062F\u0647 \u0627\u0644\u062E\u0632\u0627\u0646\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0645\u0639 \u0633\u064A\u0627\u0642\u0647. \u0648\u0643\u0644 \u0628\u0637\u0627\u0642\u0629 \u0645\u0633\u062A\u0631\u062C\u0639\u0629 \u062A\u062A\u064A\u062D \u0627\u0644\u0641\u062A\u062D \u0648\u0627\u0644\u0639\u0631\u0636 \u0648\u0627\u0644\u062A\u062C\u0627\u0647\u0644 \u0648\u0627\u0644\u062A\u0631\u0627\u062C\u0639\u060C \u0641\u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u062A\u0639\u0645\u0644 \u0644\u0635\u0627\u0644\u062D\u0643 \u0644\u0627 \u0636\u062F\u0643.",
      zh: "\u77E5\u8BC6\u5E93\u4E0D\u4EC5\u4FDD\u5B58\u60A8\u6536\u85CF\u7684\u5185\u5BB9\uFF0C\u8FD8\u4F1A\u5728\u76F8\u5173\u65F6\u523B\u4E3B\u52A8\u5524\u56DE\u3002\u5982\u679C\u67D0\u4E2A\u70ED\u95E8\u8BA8\u8BBA\u4E0E\u60A8\u6570\u6708\u524D\u4FDD\u5B58\u7684\u5185\u5BB9\u76F8\u5173\u2014\u2014\u6BD4\u5982\u60A8\u516D\u4E2A\u6708\u524D\u5F52\u6863\u7684\u6728\u85AF\u79CD\u690D\u63D0\u6848\uFF0C\u6070\u597D\u9047\u4E0A\u57FA\u6208\u9A6C\u8BBA\u575B\u7684\u70ED\u5E16\u2014\u2014\u77E5\u8BC6\u5E93\u4F1A\u5C06\u5176\u8FDE\u540C\u4E0A\u4E0B\u6587\u91CD\u65B0\u7F6E\u9876\u3002\u6BCF\u5F20\u5524\u56DE\u5361\u7247\u90FD\u63D0\u4F9B\u6253\u5F00\u3001\u67E5\u770B\u3001\u5FFD\u7565\u548C\u64A4\u9500\u64CD\u4F5C\uFF0C\u8BA9\u8BB0\u5FC6\u53EA\u4E3A\u60A8\u670D\u52A1\u3002"
    },
    deepLink: { to: "/app", label: "Open the Vault" }
  },
  {
    id: "crisis-alerts",
    title: { en: "Crisis & Community Alerts", sw: "Tahadhari za Dharura na Jamii", fr: "Alertes de crise et communautaires", ar: "\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0627\u0644\u0623\u0632\u0645\u0627\u062A \u0648\u0627\u0644\u0645\u062C\u062A\u0645\u0639", zh: "\u5371\u673A\u4E0E\u793E\u533A\u8B66\u62A5" },
    module: "Safety guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["crisis", "alert", "flood", "i am safe", "check-in", "emergency", "dharura", "tahadhari", "crise", "alerte", "\u0623\u0632\u0645\u0629", "\u062A\u0646\u0628\u064A\u0647", "\u5371\u673A", "\u8B66\u62A5"],
    answer: {
      en: 'Crisis & Community Alert Mode pushes verified geographic alerts \u2014 like a flood warning in Kigoma \u2014 to the members actually in the affected area. One tap sends an "I\u2019m safe" check-in, with a live counter of how many have checked in and automatic notification of your family circle. Alerts are distributed through city, district and neighborhood feeds, so the signal reaches people at the right granularity.',
      sw: 'Hali ya Tahadhari za Dharura husambaza tahadhari zilizothibitishwa kijiografia \u2014 kama onyo la mafuriko Kigoma \u2014 kwa wanachama walioko kweli eneo lililoathirika. Bofya mara moja kutuma ujumbe wa "Niko salama", na kiasi cha moja kwa moja cha waliothibitisha usalama pamoja na arifa otomatiki kwa duru yako ya familia. Tahadhari husambazwa kupitia milisho ya mji, wilaya na mtaa, ili ishara ifike kwa watu kwa kina sahihi.',
      fr: "Le mode Alerte de crise diffuse des alertes g\xE9ographiques v\xE9rifi\xE9es \u2014 comme une alerte inondation \xE0 Kigoma \u2014 aux membres r\xE9ellement pr\xE9sents dans la zone touch\xE9e. Un seul geste envoie un \xAB Je suis en s\xE9curit\xE9 \xBB, avec compteur en direct des personnes enregistr\xE9es et notification automatique de votre cercle familial. Les alertes passent par les fils de ville, de district et de quartier, pour toucher chacun \xE0 la bonne \xE9chelle.",
      ar: '\u0648\u0636\u0639 \u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0627\u0644\u0623\u0632\u0645\u0627\u062A \u064A\u0648\u062C\u0651\u0647 \u062A\u0646\u0628\u064A\u0647\u0627\u062A \u062C\u063A\u0631\u0627\u0641\u064A\u0629 \u0645\u0648\u062B\u0642\u0629 \u2014 \u0643\u062A\u062D\u0630\u064A\u0631 \u0645\u0646 \u0641\u064A\u0636\u0627\u0646 \u0641\u064A \u0643\u064A\u063A\u0648\u0645\u0627 \u2014 \u0625\u0644\u0649 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u064A\u0646 \u0641\u0639\u0644\u064A\u064B\u0627 \u0641\u064A \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0645\u062A\u0636\u0631\u0631\u0629. \u0648\u0628\u0646\u0642\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u062A\u0631\u0633\u0644 \u062A\u0623\u0643\u064A\u062F "\u0623\u0646\u0627 \u0628\u062E\u064A\u0631" \u0645\u0639 \u0639\u062F\u0651\u0627\u062F \u0645\u0628\u0627\u0634\u0631 \u0644\u0645\u0646 \u0633\u062C\u0651\u0644\u0648\u0627 \u0633\u0644\u0627\u0645\u062A\u0647\u0645 \u0648\u0625\u0634\u0639\u0627\u0631 \u062A\u0644\u0642\u0627\u0626\u064A \u0644\u062F\u0627\u0626\u0631\u0629 \u0639\u0627\u0626\u0644\u062A\u0643. \u0648\u062A\u064F\u0648\u0632\u064E\u0651\u0639 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0639\u0628\u0631 \u062E\u0644\u0627\u0635\u0627\u062A \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0648\u0627\u0644\u062D\u064A \u0644\u062A\u0635\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u0627\u0633 \u0628\u0627\u0644\u062F\u0642\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629.',
      zh: '\u5371\u673A\u4E0E\u793E\u533A\u8B66\u62A5\u6A21\u5F0F\u4F1A\u5C06\u7ECF\u8FC7\u6838\u5B9E\u7684\u5730\u7406\u8B66\u62A5\u2014\u2014\u4F8B\u5982\u57FA\u6208\u9A6C\u7684\u6D2A\u6C34\u9884\u8B66\u2014\u2014\u7CBE\u51C6\u63A8\u9001\u7ED9\u771F\u6B63\u8EAB\u5904\u707E\u533A\u7684\u4F1A\u5458\u3002\u4E00\u952E\u5373\u53EF\u53D1\u9001"\u6211\u5F88\u5B89\u5168"\u7B7E\u5230\uFF0C\u5B9E\u65F6\u663E\u793A\u5DF2\u786E\u8BA4\u5B89\u5168\u7684\u4EBA\u6570\uFF0C\u5E76\u81EA\u52A8\u901A\u77E5\u60A8\u7684\u5BB6\u5EAD\u5708\u3002\u8B66\u62A5\u901A\u8FC7\u57CE\u5E02\u3001\u533A\u53BF\u548C\u793E\u533A\u4E09\u7EA7\u4FE1\u606F\u6D41\u5206\u53D1\uFF0C\u786E\u4FDD\u4FE1\u606F\u4EE5\u6070\u5F53\u7684\u7C92\u5EA6\u89E6\u8FBE\u3002'
    },
    steps: [
      "When a verified alert covers your area, it appears at the top of your local feeds.",
      'Tap "I\u2019m safe" \u2014 your family circle is notified and the counter updates live.',
      "Follow the city, district or neighborhood feed for the granularity you need."
    ],
    image: "/assistant-illustration-2.jpg",
    imageAlt: "Crisis alert with I\u2019m safe check-in counter",
    deepLink: { to: "/safety", label: "Open Safety Center" }
  },
  {
    id: "c2pa-signing",
    title: { en: "C2PA Content Credentials", sw: "Hati za Maudhui za C2PA", fr: "Identifiants de contenu C2PA", ar: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u062D\u062A\u0648\u0649 C2PA", zh: "C2PA \u5185\u5BB9\u51ED\u8BC1" },
    module: "Safety guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["c2pa", "provenance", "content credentials", "signed", "manifest", "synthetic media", "deepfake", "hati", "origine", "\u0645\u0635\u062F\u0631", "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F", "\u0627\u0644\u062A\u0648\u0642\u064A\u0639", "\u5185\u5BB9\u51ED\u8BC1", "\u6EAF\u6E90"],
    answer: {
      en: "Every photo and video captured in Kaluta is signed with C2PA content credentials at the moment of capture, and those credentials are preserved through the entire edit chain. Anyone can open the signed manifest \u2014 issuer, timestamp, hash and signature \u2014 and verify for themselves where a piece of media came from. It is Kaluta\u2019s answer to the synthetic-media era: provenance labels you can check, not promises you must trust.",
      sw: "Kila picha na video inayopigwa ndani ya Kaluta huwekewa saini ya hati za maudhui za C2PA wakati wa kupiga, na hati hizo huhifadhiwa kupitia mnyororo wote wa uhariri. Mtu yeyote anaweza kufungua manifest iliyosainiwa \u2014 mtoaji, muda, hash na saini \u2014 na kuthibitisha mwenyewe chanzo cha kipande cha media. Hii ndiyo jibu la Kaluta kwa enzi ya synthetic media: lebo za chanzo unazoweza kukagua, si ahadi unazopaswa kuamini.",
      fr: "Chaque photo et vid\xE9o captur\xE9e dans Kaluta est sign\xE9e avec des identifiants de contenu C2PA au moment de la capture, et ces identifiants sont pr\xE9serv\xE9s tout au long de la cha\xEEne de montage. N\u2019importe qui peut ouvrir le manifeste sign\xE9 \u2014 \xE9metteur, horodatage, empreinte et signature \u2014 et v\xE9rifier l\u2019origine d\u2019un m\xE9dia. C\u2019est la r\xE9ponse de Kaluta \xE0 l\u2019\xE8re des m\xE9dias synth\xE9tiques : des labels de provenance v\xE9rifiables, pas des promesses \xE0 croire.",
      ar: "\u0643\u0644 \u0635\u0648\u0631\u0629 \u0648\u0641\u064A\u062F\u064A\u0648 \u064A\u064F\u0644\u062A\u0642\u0637 \u062F\u0627\u062E\u0644 \u0643\u0627\u0644\u0648\u062A\u0627 \u064A\u064F\u0648\u0642\u064E\u0651\u0639 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0639\u062A\u0645\u0627\u062F \u0645\u062D\u062A\u0648\u0649 C2PA \u0644\u062D\u0638\u0629 \u0627\u0644\u0627\u0644\u062A\u0642\u0627\u0637\u060C \u0648\u062A\u064F\u062D\u0641\u0638 \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0639\u0628\u0631 \u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u062A\u062D\u0631\u064A\u0631 \u0628\u0623\u0643\u0645\u0644\u0647\u0627. \u0648\u064A\u0645\u0643\u0646 \u0644\u0623\u064A \u0634\u062E\u0635 \u0641\u062A\u062D \u0627\u0644\u0628\u064A\u0627\u0646 \u0627\u0644\u0645\u0648\u0642\u0651\u0639 \u2014 \u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0645\u0635\u062F\u0631\u0629 \u0648\u0627\u0644\u0637\u0627\u0628\u0639 \u0627\u0644\u0632\u0645\u0646\u064A \u0648\u0627\u0644\u0628\u0635\u0645\u0629 \u0648\u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u2014 \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u0641\u0633\u0647 \u0645\u0646 \u0645\u0635\u062F\u0631 \u0627\u0644\u0648\u0633\u0627\u0626\u0637. \u0647\u0630\u0627 \u0647\u0648 \u0631\u062F \u0643\u0627\u0644\u0648\u062A\u0627 \u0639\u0644\u0649 \u0639\u0635\u0631 \u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A\u0629: \u0645\u0644\u0635\u0642\u0627\u062A \u0645\u0635\u062F\u0631 \u064A\u0645\u0643\u0646 \u0641\u062D\u0635\u0647\u0627\u060C \u0644\u0627 \u0648\u0639\u0648\u062F \u064A\u062C\u0628 \u062A\u0635\u062F\u064A\u0642\u0647\u0627.",
      zh: "\u5728 Kaluta \u5185\u62CD\u6444\u7684\u6BCF\u5F20\u7167\u7247\u548C\u6BCF\u6BB5\u89C6\u9891\u90FD\u4F1A\u5728\u62CD\u6444\u77AC\u95F4\u7B7E\u7F72 C2PA \u5185\u5BB9\u51ED\u8BC1\uFF0C\u5E76\u5728\u6574\u4E2A\u7F16\u8F91\u94FE\u8DEF\u4E2D\u5B8C\u6574\u4FDD\u7559\u3002\u4EFB\u4F55\u4EBA\u90FD\u53EF\u4EE5\u6253\u5F00\u5DF2\u7B7E\u540D\u7684\u6E05\u5355\u2014\u2014\u7B7E\u53D1\u8005\u3001\u65F6\u95F4\u6233\u3001\u54C8\u5E0C\u503C\u548C\u7B7E\u540D\u2014\u2014\u4EB2\u81EA\u6838\u5B9E\u5A92\u4F53\u7684\u6765\u6E90\u3002\u8FD9\u662F Kaluta \u9762\u5BF9\u5408\u6210\u5A92\u4F53\u65F6\u4EE3\u7684\u7B54\u6848\uFF1A\u53EF\u9A8C\u8BC1\u7684\u6EAF\u6E90\u6807\u7B7E\uFF0C\u800C\u975E\u53EA\u80FD\u8F7B\u4FE1\u7684\u627F\u8BFA\u3002"
    },
    deepLink: { to: "/safety", label: "See provenance" }
  },
  {
    id: "voice-first",
    title: { en: "Voice-First Navigation", sw: "Uabiraji wa Sauti Kwanza", fr: "Navigation voix d\u2019abord", ar: "\u0627\u0644\u062A\u0646\u0642\u0644 \u0628\u0627\u0644\u0635\u0648\u062A \u0623\u0648\u0644\u064B\u0627", zh: "\u8BED\u97F3\u4F18\u5148\u5BFC\u822A" },
    module: "Safety guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["voice", "voice command", "read aloud", "accessibility", "dyslexia", "audio description", "sauti", "accessibilit\xE9", "voix", "\u0635\u0648\u062A", "\u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644", "\u8BED\u97F3", "\u65E0\u969C\u788D", "\u6717\u8BFB"],
    answer: {
      en: 'Kaluta works hands-free. Voice commands like "Open my Circles" or "Read this thread aloud" navigate the app for you, and AI audio descriptions narrate the content of visual posts for members who cannot see them. A dyslexia-friendly reading mode retypes any thread with accessible fonts and spacing. Accessibility is not a bolt-on here \u2014 it is the front door.',
      sw: 'Kaluta inafanya kazi bila kutumia mikono. Amri za sauti kama "Fungua Circles zangu" au "Nisomee mjadala huu" hukusogezea programu, na maelezo ya sauti ya AI hueleza maudhui ya machapisho ya kuona kwa wanachama wasioweza kuyaona. Hali ya kusoma rafiki kwa dyslexia huandika upya mjadala wowote kwa fonti na nafasi zinazosomeka. Upatikanaji si nyongeza hapa \u2014 ni mlango wa mbele.',
      fr: "Kaluta fonctionne mains libres. Des commandes vocales comme \xAB Ouvre mes Cercles \xBB ou \xAB Lis ce fil \xE0 voix haute \xBB naviguent dans l\u2019app pour vous, et les descriptions audio IA narrent le contenu des publications visuelles pour les membres qui ne peuvent pas les voir. Un mode de lecture adapt\xE9 \xE0 la dyslexie remet en page n\u2019importe quel fil avec polices et espacements accessibles. L\u2019accessibilit\xE9 n\u2019est pas une option ici \u2014 c\u2019est la porte d\u2019entr\xE9e.",
      ar: '\u0643\u0627\u0644\u0648\u062A\u0627 \u062A\u0639\u0645\u0644 \u062F\u0648\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u064A\u062F\u064A\u0646. \u0623\u0648\u0627\u0645\u0631 \u0635\u0648\u062A\u064A\u0629 \u0645\u062B\u0644 "\u0627\u0641\u062A\u062D \u062F\u0648\u0627\u0626\u0631\u064A" \u0623\u0648 "\u0627\u0642\u0631\u0623 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0628\u0635\u0648\u062A \u0639\u0627\u0644\u064D" \u062A\u062A\u0646\u0642\u0644 \u0628\u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0646\u064A\u0627\u0628\u0629 \u0639\u0646\u0643\u060C \u0648\u0627\u0644\u0623\u0648\u0635\u0627\u0641 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0633\u0631\u062F \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0645\u0631\u0626\u064A\u0629 \u0644\u0645\u0646 \u0644\u0627 \u064A\u0633\u062A\u0637\u064A\u0639\u0648\u0646 \u0631\u0624\u064A\u062A\u0647\u0627. \u0648\u064A\u064F\u0639\u064A\u062F \u0648\u0636\u0639 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0627\u0626\u0645 \u0644\u0639\u0633\u0631 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u062A\u0646\u0636\u064A\u062F \u0623\u064A \u0645\u0648\u0636\u0648\u0639 \u0628\u062E\u0637\u0648\u0637 \u0648\u062A\u0628\u0627\u0639\u062F \u0645\u064A\u0633\u0651\u0631. \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0647\u0646\u0627 \u0644\u064A\u0633\u062A \u0625\u0636\u0627\u0641\u0629 \u0644\u0627\u062D\u0642\u0629 \u2014 \u0628\u0644 \u0647\u064A \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0623\u0645\u0627\u0645\u064A.',
      zh: 'Kaluta \u652F\u6301\u514D\u624B\u52A8\u64CD\u4F5C\u3002\u8BED\u97F3\u547D\u4EE4\u5982"\u6253\u5F00\u6211\u7684\u5708\u5B50"\u6216"\u6717\u8BFB\u8FD9\u4E2A\u5E16\u5B50"\u53EF\u4EE5\u66FF\u60A8\u5BFC\u822A\u5E94\u7528\uFF0CAI \u97F3\u9891\u63CF\u8FF0\u8FD8\u80FD\u4E3A\u89C6\u969C\u4F1A\u5458\u8BB2\u8FF0\u56FE\u7247\u5E16\u5B50\u7684\u5185\u5BB9\u3002\u9605\u8BFB\u969C\u788D\u53CB\u597D\u6A21\u5F0F\u4F1A\u7528\u6613\u8BFB\u5B57\u4F53\u548C\u95F4\u8DDD\u91CD\u65B0\u6392\u7248\u4EFB\u4F55\u5E16\u5B50\u3002\u65E0\u969C\u788D\u5728\u8FD9\u91CC\u4E0D\u662F\u9644\u52A0\u529F\u80FD\u2014\u2014\u5B83\u5C31\u662F\u6B63\u95E8\u3002'
    },
    deepLink: { to: "/safety", label: "Accessibility features" }
  },
  {
    id: "early-warning",
    title: { en: "Community Early-Warning", sw: "Onyo la Mapema la Jamii", fr: "Alerte pr\xE9coce communautaire", ar: "\u0627\u0644\u0625\u0646\u0630\u0627\u0631 \u0627\u0644\u0645\u0628\u0643\u0631 \u0627\u0644\u0645\u062C\u062A\u0645\u0639\u064A", zh: "\u793E\u533A\u65E9\u671F\u9884\u8B66" },
    module: "Safety guide",
    version: "v2.16.0",
    roles: ["member", "admin"],
    keywords: ["early warning", "moderator", "sentiment", "dispute", "escalation", "community health", "sparkline", "onyo la mapema", "alerte pr\xE9coce", "\u0625\u0646\u0630\u0627\u0631 \u0645\u0628\u0643\u0631", "\u0645\u0634\u0631\u0641", "\u9884\u8B66", "\u793E\u533A\u5065\u5EB7"],
    answer: {
      en: 'Community Early-Warning gives moderators foresight instead of hindsight. The dashboard shows a sentiment-drift sparkline per space, predicts dispute escalation \u2014 "80% likely to need intervention" \u2014 and recommends concrete actions before a thread boils over. Weekly community-health summaries keep the long trend in view, so moderation becomes prevention rather than cleanup.',
      sw: 'Onyo la Mapema la Jamii huwapa wasimamizi uwezo wa kuona mbeleni badala ya nyuma. Dashibodi inaonyesha mstari wa mabadiliko ya hisia kwa kila nafasi, kutabiri kuchochea kwa migogoro \u2014 "nafasi 80% ya kuhitaji uingiliaji" \u2014 na kupendekeza hatua mahususi kabla mjadala haujachacha. Muhtasari wa kila wiki wa afya ya jamii huweka mwenendo wa muda mrefu machoni, hivyo usimamizi hugeuka kuwa kuzuia badala ya kusafisha.',
      fr: "L\u2019alerte pr\xE9coce donne aux mod\xE9rateurs de la pr\xE9voyance plut\xF4t que du recul. Le tableau de bord affiche une courbe de d\xE9rive des sentiments par espace, pr\xE9dit l\u2019escalade des conflits \u2014 \xAB 80 % de chances d\u2019intervention n\xE9cessaire \xBB \u2014 et recommande des actions concr\xE8tes avant que le fil ne d\xE9g\xE9n\xE8re. Les r\xE9sum\xE9s hebdomadaires de sant\xE9 communautaire gardent la tendance longue en vue : la mod\xE9ration devient pr\xE9vention, pas nettoyage.",
      ar: '\u0627\u0644\u0625\u0646\u0630\u0627\u0631 \u0627\u0644\u0645\u0628\u0643\u0631 \u064A\u0645\u0646\u062D \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0628\u0635\u064A\u0631\u0629 \u0627\u0633\u062A\u0628\u0627\u0642\u064A\u0629 \u0628\u062F\u0644 \u0627\u0644\u0646\u0638\u0631 \u0625\u0644\u0649 \u0627\u0644\u062E\u0644\u0641. \u062A\u0639\u0631\u0636 \u0627\u0644\u0644\u0648\u062D\u0629 \u0645\u0646\u062D\u0646\u0649 \u0627\u0646\u062C\u0631\u0627\u0641 \u0627\u0644\u0645\u0634\u0627\u0639\u0631 \u0644\u0643\u0644 \u0645\u0633\u0627\u062D\u0629\u060C \u0648\u062A\u062A\u0646\u0628\u0623 \u0628\u062A\u0635\u0627\u0639\u062F \u0627\u0644\u0646\u0632\u0627\u0639\u0627\u062A \u2014 "\u0627\u062D\u062A\u0645\u0627\u0644 80% \u0644\u0644\u062D\u0627\u062C\u0629 \u0625\u0644\u0649 \u062A\u062F\u062E\u0644" \u2014 \u0648\u062A\u0642\u062A\u0631\u062D \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0645\u0644\u0645\u0648\u0633\u0629 \u0642\u0628\u0644 \u0623\u0646 \u064A\u0634\u062A\u0639\u0644 \u0627\u0644\u0646\u0642\u0627\u0634. \u0648\u062A\u064F\u0628\u0642\u064A \u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0644\u0635\u062D\u0629 \u0627\u0644\u0645\u062C\u062A\u0645\u0639 \u0627\u0644\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0637\u0648\u064A\u0644 \u0641\u064A \u0627\u0644\u0623\u0641\u0642\u060C \u0641\u064A\u062A\u062D\u0648\u0644 \u0627\u0644\u0625\u0634\u0631\u0627\u0641 \u0625\u0644\u0649 \u0648\u0642\u0627\u064A\u0629 \u0628\u062F\u0644 \u062A\u0646\u0638\u064A\u0641 \u0644\u0627\u062D\u0642.',
      zh: '\u793E\u533A\u65E9\u671F\u9884\u8B66\u8BA9\u7248\u4E3B\u62E5\u6709\u5148\u89C1\u4E4B\u660E\uFF0C\u800C\u975E\u4E8B\u540E\u8865\u6551\u3002\u4EEA\u8868\u76D8\u4E3A\u6BCF\u4E2A\u7A7A\u95F4\u663E\u793A\u60C5\u7EEA\u6F02\u79FB\u66F2\u7EBF\uFF0C\u9884\u6D4B\u4E89\u7AEF\u5347\u7EA7\u2014\u2014"80% \u53EF\u80FD\u6027\u9700\u8981\u4ECB\u5165"\u2014\u2014\u5E76\u5728\u8BA8\u8BBA\u5931\u63A7\u4E4B\u524D\u7ED9\u51FA\u5177\u4F53\u5904\u7F6E\u5EFA\u8BAE\u3002\u6BCF\u5468\u793E\u533A\u5065\u5EB7\u62A5\u544A\u5E2E\u52A9\u628A\u63E1\u957F\u671F\u8D8B\u52BF\uFF0C\u8BA9\u7BA1\u7406\u4ECE\u5584\u540E\u53D8\u4E3A\u9884\u9632\u3002'
    },
    deepLink: { to: "/safety", label: "Moderator dashboard" }
  },
  {
    id: "family-year-review",
    title: { en: "Family Year-in-Review", sw: "Mapitio ya Mwaka wa Familia", fr: "R\xE9trospective familiale de l\u2019ann\xE9e", ar: "\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u064A\u0629", zh: "\u5BB6\u5EAD\u5E74\u5EA6\u56DE\u987E" },
    module: "Family guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["year in review", "family documentary", "reunion", "reunion planner", "memorial date", "mapitio", "r\xE9trospective", "r\xE9union", "\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u0627\u0645", "\u0644\u0645 \u0627\u0644\u0634\u0645\u0644", "\u5E74\u5EA6\u56DE\u987E", "\u5BB6\u5EAD\u805A\u4F1A"],
    answer: {
      en: "Family Year-in-Review auto-generates an annual family documentary from your tree growth, archive additions and the year\u2019s milestones \u2014 a premium one-off keepsake the whole family can watch together. The companion Reunion Agent plans the gathering itself: it polls dates across generations, suggests venues near your family-map centroid and stays aware of memorial dates. From the year that was to the gathering ahead, in one place.",
      sw: "Mapitio ya Mwaka wa Familia hutengeneza otomatiki filamu ya familia ya mwaka kutoka kwa ukuaji wa mti wako, nyaraka mpya na matukio muhimu ya mwaka \u2014 kumbukumbu ya premium inayotengenezwa mara moja na kutazamwa na familia nzima pamoja. Wakala wa Reunion hupanga mkusanyiko wenyewe: huchunguza tarehe zinazokubalika na vizazi vyote, kupendekeza mahali karibu na kitovu cha ramani ya familia yako, na kuzingatia tarehe za kumbukumbu.",
      fr: "La r\xE9trospective familiale g\xE9n\xE8re automatiquement un documentaire annuel \xE0 partir de la croissance de votre arbre, des ajouts d\u2019archives et des jalons de l\u2019ann\xE9e \u2014 un souvenir premium, factur\xE9 une fois, que toute la famille regarde ensemble. L\u2019agent R\xE9union planifie le rassemblement lui-m\xEAme : il interroge les disponibilit\xE9s de toutes les g\xE9n\xE9rations, propose des lieux proches du centre de votre carte familiale et tient compte des dates de comm\xE9moration.",
      ar: "\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u064A\u0629 \u062A\u0648\u0644\u0651\u062F \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0641\u064A\u0644\u0645\u064B\u0627 \u0648\u062B\u0627\u0626\u0642\u064A\u064B\u0627 \u0633\u0646\u0648\u064A\u064B\u0627 \u0644\u0644\u0639\u0627\u0626\u0644\u0629 \u0645\u0646 \u0646\u0645\u0648 \u0634\u062C\u0631\u062A\u0643 \u0648\u0625\u0636\u0627\u0641\u0627\u062A \u0627\u0644\u0623\u0631\u0634\u064A\u0641 \u0648\u0623\u0628\u0631\u0632 \u0623\u062D\u062F\u0627\u062B \u0627\u0644\u0639\u0627\u0645 \u2014 \u062A\u0630\u0643\u0627\u0631\u064B\u0627 \u0645\u0645\u064A\u0632\u064B\u0627 \u064A\u064F\u062F\u0641\u0639 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0648\u062A\u0634\u0627\u0647\u062F\u0647 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0643\u0644\u0647\u0627 \u0645\u0639\u064B\u0627. \u0648\u064A\u062E\u0637\u0637 \u0648\u0643\u064A\u0644 \u0644\u0645\u0651 \u0627\u0644\u0634\u0645\u0644 \u0644\u0644\u062A\u062C\u0645\u0639 \u0646\u0641\u0633\u0647: \u064A\u0633\u062A\u0637\u0644\u0639 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0639\u0628\u0631 \u0627\u0644\u0623\u062C\u064A\u0627\u0644\u060C \u0648\u064A\u0642\u062A\u0631\u062D \u0623\u0645\u0627\u0643\u0646 \u0642\u0631\u064A\u0628\u0629 \u0645\u0646 \u0645\u0631\u0643\u0632 \u062E\u0631\u064A\u0637\u0629 \u0639\u0627\u0626\u0644\u062A\u0643\u060C \u0648\u064A\u0631\u0627\u0639\u064A \u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u0630\u0643\u0631\u0649.",
      zh: "\u5BB6\u5EAD\u5E74\u5EA6\u56DE\u987E\u4F1A\u6839\u636E\u5BB6\u65CF\u6811\u7684\u589E\u957F\u3001\u6863\u6848\u65B0\u589E\u5185\u5BB9\u548C\u5E74\u5EA6\u91CC\u7A0B\u7891\uFF0C\u81EA\u52A8\u751F\u6210\u4E00\u90E8\u5E74\u5EA6\u5BB6\u5EAD\u7EAA\u5F55\u7247\u2014\u2014\u4E00\u6B21\u6027\u4ED8\u8D39\u7684\u9AD8\u7EA7\u73CD\u85CF\u54C1\uFF0C\u5168\u5BB6\u53EF\u4EE5\u4E00\u8D77\u89C2\u770B\u3002\u914D\u5957\u7684\u805A\u4F1A\u7B56\u5212\u52A9\u624B\u4F1A\u7B79\u529E\u805A\u4F1A\u672C\u8EAB\uFF1A\u8DE8\u4E16\u4EE3\u6295\u7968\u9009\u51FA\u65E5\u671F\u3001\u63A8\u8350\u9760\u8FD1\u5BB6\u65CF\u5730\u56FE\u4E2D\u5FC3\u7684\u573A\u5730\uFF0C\u5E76\u81EA\u52A8\u7559\u610F\u7EAA\u5FF5\u65E5\u671F\u3002\u4ECE\u521A\u8FC7\u53BB\u7684\u4E00\u5E74\u5230\u5373\u5C06\u5230\u6765\u7684\u76F8\u805A\uFF0C\u5C3D\u5728\u540C\u4E00\u4E2A\u5730\u65B9\u3002"
    },
    steps: [
      "Open the Family page and request your Year-in-Review documentary (premium one-off).",
      "Let the Reunion Agent poll every generation for dates that work.",
      "Pick a venue near your family-map centroid; memorial dates are respected automatically."
    ],
    image: "/assistant-illustration-1.jpg",
    imageAlt: "Family year-in-review documentary and reunion planner",
    deepLink: { to: "/family", label: "Open Family" }
  },
  {
    id: "remembrance-gatherings",
    title: { en: "Remembrance Gatherings", sw: "Mikutano ya Ukumbusho", fr: "Rassemblements du souvenir", ar: "\u062A\u062C\u0645\u0639\u0627\u062A \u0627\u0644\u0630\u0643\u0631\u0649", zh: "\u8FFD\u601D\u805A\u4F1A" },
    module: "Family guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["remembrance", "gathering", "memorial", "graveyard", "attendance", "ukumbusho", "comm\xE9moration", "rassemblement", "\u0630\u0643\u0631\u0649", "\u062A\u062C\u0645\u0639", "\u8FFD\u601D", "\u7EAA\u5FF5\u805A\u4F1A"],
    answer: {
      en: "Remembrance Gatherings turn memory into presence. From a memorial in the Digital Graveyard you can plan a family gathering \u2014 an anniversary, an unveiling or a quiet visit \u2014 with invitations and attendance tracking built in. They connect to the reunion planner, so the living calendar of the family always keeps room for those who came before.",
      sw: "Mikutano ya Ukumbusho hubadilisha kumbukumbu kuwa uwepo. Kutoka kwenye kaburi la kidijitali unaweza kupanga mkusanyiko wa familia \u2014 kumbukumbu ya mwaka, ufunuo wa jiwe au ziara ya kimya \u2014 na mialiko na ufuatiliaji wa mahudhurio vimejengwa ndani. Inaunganishwa na mpangaji wa reunion, hivyo kalenda hai ya familia huweka nafasi daima kwa waliotangulia.",
      fr: "Les rassemblements du souvenir transforment la m\xE9moire en pr\xE9sence. Depuis un m\xE9morial du cimeti\xE8re num\xE9rique, planifiez un rassemblement familial \u2014 anniversaire, inauguration d\u2019une st\xE8le ou visite recueillie \u2014 avec invitations et suivi des pr\xE9sences int\xE9gr\xE9s. Connect\xE9s au planificateur de r\xE9unions, ils gardent une place, dans le calendrier vivant de la famille, \xE0 ceux qui nous ont pr\xE9c\xE9d\xE9s.",
      ar: "\u062A\u062C\u0645\u0639\u0627\u062A \u0627\u0644\u0630\u0643\u0631\u0649 \u062A\u062D\u0648\u0651\u0644 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0625\u0644\u0649 \u062D\u0636\u0648\u0631. \u0645\u0646 \u0646\u064F\u0635\u0628 \u0641\u064A \u0627\u0644\u0645\u0642\u0628\u0631\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u064A\u0645\u0643\u0646\u0643 \u062A\u062E\u0637\u064A\u0637 \u062A\u062C\u0645\u0639 \u0639\u0627\u0626\u0644\u064A \u2014 \u0630\u0643\u0631\u0649 \u0633\u0646\u0648\u064A\u0629 \u0623\u0648 \u0625\u0632\u0627\u062D\u0629 \u0633\u062A\u0627\u0631 \u0623\u0648 \u0632\u064A\u0627\u0631\u0629 \u0647\u0627\u062F\u0626\u0629 \u2014 \u0645\u0639 \u062F\u0639\u0648\u0627\u062A \u0648\u062A\u062A\u0628\u0639 \u0644\u0644\u062D\u0636\u0648\u0631 \u0645\u062F\u0645\u062C\u064A\u0646. \u0648\u0647\u064A \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0645\u062E\u0637\u0637 \u0644\u0645\u0651 \u0627\u0644\u0634\u0645\u0644\u060C \u0641\u062A\u064F\u0628\u0642\u064A \u0623\u062C\u0646\u062F\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u062D\u064A\u0629 \u0645\u0643\u0627\u0646\u064B\u0627 \u062F\u0627\u0626\u0645\u064B\u0627 \u0644\u0645\u0646 \u0633\u0628\u0642\u0648\u0646\u0627.",
      zh: "\u8FFD\u601D\u805A\u4F1A\u8BA9\u601D\u5FF5\u5316\u4E3A\u76F8\u805A\u3002\u60A8\u53EF\u4EE5\u4ECE\u6570\u5B57\u7EAA\u5FF5\u56ED\u4E2D\u7684\u7EAA\u5FF5\u9986\u53D1\u8D77\u5BB6\u5EAD\u805A\u4F1A\u2014\u2014\u5FCC\u65E5\u3001\u63ED\u7891\u4EEA\u5F0F\u6216\u5B89\u9759\u7684\u796D\u626B\u2014\u2014\u5185\u7F6E\u9080\u8BF7\u548C\u51FA\u5E2D\u8FFD\u8E2A\u529F\u80FD\u3002\u5B83\u4E0E\u805A\u4F1A\u7B56\u5212\u52A9\u624B\u76F8\u8FDE\uFF0C\u8BA9\u5BB6\u5EAD\u65E5\u5386\u6C38\u8FDC\u4E3A\u5148\u4EBA\u4FDD\u7559\u4E00\u5E2D\u4E4B\u5730\u3002"
    },
    deepLink: { to: "/memorials", label: "Open Memorials" }
  },
  {
    id: "live-intelligence",
    title: { en: "Live Intelligence Layer", sw: "Safu ya Akili ya Moja kwa Moja", fr: "Couche d\u2019intelligence en direct", ar: "\u0637\u0628\u0642\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0645\u0628\u0627\u0634\u0631", zh: "\u76F4\u64AD\u667A\u80FD\u5C42" },
    module: "Platform guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["live", "captions", "live room", "question clustering", "whisper", "highlight", "moja kwa moja", "direct", "sous-titres", "\u0628\u062B \u0645\u0628\u0627\u0634\u0631", "\u062A\u0631\u062C\u0645\u0629 \u0645\u0628\u0627\u0634\u0631\u0629", "\u76F4\u64AD", "\u5B57\u5E55", "\u5B9E\u65F6"],
    answer: {
      en: 'The Live Intelligence Layer makes live rooms smarter for everyone in them. Real-time translated captions follow the conversation in each listener\u2019s language, and audience questions are clustered so a host sees "34 asked about pricing" instead of a wall of chat. A whisper-assistant feeds the host private cues mid-stream, and highlights can be marked right on the stream timeline as they happen.',
      sw: 'Safu ya Akili ya Moja kwa Moja hufanya vyumba vya moja kwa moja kuwa mahiri kwa kila aliyemo. Manukuu yaliyotafsiriwa wakati halisi hufuata mazungumzo kwa lugha ya kila msikilizaji, na maswali ya hadhira hupangwa makundi ili mwenyeji aone "34 wameuliza kuhusu bei" badala ya ukuta wa mazungumzo. Msaidizi wa siri humpa mwenyeji ishara za faragha katikati ya stream, na matukio muhimu yanaweza kuwekewa alama moja kwa moja kwenye ratiba ya stream yanapotokea.',
      fr: "La couche d\u2019intelligence en direct rend les salles live plus intelligentes pour tous. Des sous-titres traduits en temps r\xE9el suivent la conversation dans la langue de chacun, et les questions du public sont regroup\xE9es \u2014 \xAB 34 questions sur les tarifs \xBB au lieu d\u2019un mur de messages. Un assistant-murmure souffle des rep\xE8res priv\xE9s \xE0 l\u2019h\xF4te en plein direct, et les temps forts se marquent directement sur la ligne de temps du stream.",
      ar: '\u0637\u0628\u0642\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u062A\u062C\u0639\u0644 \u063A\u0631\u0641 \u0627\u0644\u0628\u062B \u0623\u0630\u0643\u0649 \u0644\u0643\u0644 \u0645\u0646 \u0641\u064A\u0647\u0627. \u062A\u0631\u062C\u0645\u0629 \u0645\u0635\u0627\u062D\u0628\u0629 \u0645\u062A\u0631\u062C\u0645\u0629 \u0641\u0648\u0631\u064A\u064B\u0627 \u062A\u062A\u0627\u0628\u0639 \u0627\u0644\u062D\u0648\u0627\u0631 \u0628\u0644\u063A\u0629 \u0643\u0644 \u0645\u0633\u062A\u0645\u0639\u060C \u0648\u062A\u064F\u062C\u0645\u064E\u0651\u0639 \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062C\u0645\u0647\u0648\u0631 \u0644\u064A\u0631\u0649 \u0627\u0644\u0645\u0636\u064A\u0641 "34 \u0633\u0623\u0644\u0648\u0627 \u0639\u0646 \u0627\u0644\u0623\u0633\u0639\u0627\u0631" \u0628\u062F\u0644\u064B\u0627 \u0645\u0646 \u062C\u062F\u0627\u0631 \u0645\u0646 \u0627\u0644\u0631\u0633\u0627\u0626\u0644. \u0648\u0645\u0633\u0627\u0639\u062F \u0647\u0645\u0633 \u064A\u0645\u062F \u0627\u0644\u0645\u0636\u064A\u0641 \u0628\u0625\u0634\u0627\u0631\u0627\u062A \u062E\u0627\u0635\u0629 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0628\u062B\u060C \u0648\u064A\u0645\u0643\u0646 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0644\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0645\u064A\u0632\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0637 \u0627\u0644\u0632\u0645\u0646\u064A \u0644\u0644\u0628\u062B \u0644\u062D\u0638\u0629 \u062D\u062F\u0648\u062B\u0647\u0627.',
      zh: '\u76F4\u64AD\u667A\u80FD\u5C42\u8BA9\u76F4\u64AD\u95F4\u91CC\u7684\u6BCF\u4E2A\u4EBA\u90FD\u66F4\u4ECE\u5BB9\u3002\u5B9E\u65F6\u7FFB\u8BD1\u5B57\u5E55\u4EE5\u6BCF\u4F4D\u542C\u4F17\u7684\u8BED\u8A00\u8DDF\u968F\u5BF9\u8BDD\uFF1B\u89C2\u4F17\u63D0\u95EE\u81EA\u52A8\u805A\u7C7B\uFF0C\u4E3B\u64AD\u770B\u5230\u7684\u662F"34 \u4EBA\u8BE2\u95EE\u4E86\u4EF7\u683C"\u800C\u4E0D\u662F\u5237\u5C4F\u7684\u5F39\u5E55\u3002\u8033\u8BED\u52A9\u624B\u5728\u76F4\u64AD\u4E2D\u4E3A\u4E3B\u64AD\u63D0\u4F9B\u79C1\u5BC6\u63D0\u793A\uFF0C\u7CBE\u5F69\u77AC\u95F4\u53EF\u4EE5\u76F4\u63A5\u5728\u76F4\u64AD\u65F6\u95F4\u8F74\u4E0A\u5373\u65F6\u6807\u8BB0\u3002'
    },
    deepLink: { to: "/platform", label: "See the platform" }
  },
  {
    id: "a2a-registry",
    title: { en: "Agent-to-Agent Registry", sw: "Daftari la Mawakala kwa Mawakala", fr: "Registre agent-\xE0-agent", ar: "\u0633\u062C\u0644 \u0627\u0644\u0648\u0643\u064A\u0644 \u0625\u0644\u0649 \u0627\u0644\u0648\u0643\u064A\u0644", zh: "\u4EE3\u7406\u5BF9\u4EE3\u7406\u6CE8\u518C\u8868" },
    module: "Developer guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["a2a", "agent registry", "agent-to-agent", "verified agent", "permission scope", "rate limit", "signed offer", "registre", "\u0633\u062C\u0644 \u0627\u0644\u0648\u0643\u0644\u0627\u0621", "\u0648\u0643\u064A\u0644", "\u4EE3\u7406", "\u6CE8\u518C\u8868"],
    answer: {
      en: "The Agent-to-Agent Registry lists verified business and service agents \u2014 with badges, explicit permission scopes and rate limits \u2014 so your personal assistant can query them on your behalf. Ask for a Kilimanjaro trek quote and your assistant receives a signed, structured offer you can accept or decline. For businesses, paid agent placement in the registry is a B2B revenue stream that funds the platform without selling user attention.",
      sw: "Daftari la Mawakala kwa Mawakala linaorodhesha mawakala wa biashara na huduma waliothibitishwa \u2014 kwa beji, ruhusa zilizobainishwa na mipaka ya mzigo \u2014 ili msaidizi wako binafsi awaulize kwa niaba yako. Omba bei ya safari ya Kilimanjaro na msaidizi wako hupokea ofa iliyosainiwa na iliyopangwa unayoweza kukubali au kukataa. Kwa biashara, kuorodheshwa kwa malipo ndani ya daftari ni njia ya mapato ya B2B inayofadhili jukwaa bila kuuza umakini wa watumiaji.",
      fr: "Le registre agent-\xE0-agent r\xE9pertorie des agents commerciaux et de services v\xE9rifi\xE9s \u2014 avec badges, port\xE9es de permissions explicites et limites de d\xE9bit \u2014 pour que votre assistant personnel les interroge en votre nom. Demandez un devis de trek au Kilimandjaro et votre assistant re\xE7oit une offre structur\xE9e et sign\xE9e, \xE0 accepter ou \xE0 d\xE9cliner. Pour les entreprises, le placement payant dans le registre est un revenu B2B qui finance la plateforme sans vendre l\u2019attention des utilisateurs.",
      ar: "\u0633\u062C\u0644 \u0627\u0644\u0648\u0643\u064A\u0644 \u0625\u0644\u0649 \u0627\u0644\u0648\u0643\u064A\u0644 \u064A\u0639\u0631\u0636 \u0648\u0643\u0644\u0627\u0621 \u0623\u0639\u0645\u0627\u0644 \u0648\u062E\u062F\u0645\u0627\u062A \u0645\u0648\u062B\u0642\u064A\u0646 \u2014 \u0628\u0634\u0627\u0631\u0627\u062A \u0648\u0646\u0637\u0627\u0642\u0627\u062A \u0623\u0630\u0648\u0646\u0627\u062A \u0635\u0631\u064A\u062D\u0629 \u0648\u062D\u062F\u0648\u062F \u0644\u0644\u0645\u0639\u062F\u0644 \u2014 \u0644\u064A\u062A\u0645\u0643\u0646 \u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0634\u062E\u0635\u064A \u0645\u0646 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0645\u0646\u0647\u0645 \u0646\u064A\u0627\u0628\u0629 \u0639\u0646\u0643. \u0627\u0637\u0644\u0628 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0644\u0631\u062D\u0644\u0629 \u0643\u0644\u064A\u0645\u0646\u062C\u0627\u0631\u0648 \u0641\u064A\u062A\u0644\u0642\u0649 \u0645\u0633\u0627\u0639\u062F\u0643 \u0639\u0631\u0636\u064B\u0627 \u0645\u0646\u0638\u0645\u064B\u0627 \u0648\u0645\u0648\u0642\u0651\u0639\u064B\u0627 \u064A\u0645\u0643\u0646\u0643 \u0642\u0628\u0648\u0644\u0647 \u0623\u0648 \u0631\u0641\u0636\u0647. \u0648\u0644\u0644\u0634\u0631\u0643\u0627\u062A\u060C \u064A\u064F\u0639\u062F \u0627\u0644\u062A\u0646\u0633\u064A\u0628 \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u0641\u064A \u0627\u0644\u0633\u062C\u0644 \u0645\u0635\u062F\u0631 \u0625\u064A\u0631\u0627\u062F\u0627\u062A B2B \u064A\u0645\u0648\u0651\u0644 \u0627\u0644\u0645\u0646\u0635\u0629 \u062F\u0648\u0646 \u0628\u064A\u0639 \u0627\u0646\u062A\u0628\u0627\u0647 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646.",
      zh: "\u4EE3\u7406\u5BF9\u4EE3\u7406\u6CE8\u518C\u8868\u6536\u5F55\u7ECF\u8FC7\u9A8C\u8BC1\u7684\u5546\u4E1A\u548C\u670D\u52A1\u4EE3\u7406\u2014\u2014\u9644\u5E26\u5FBD\u7AE0\u3001\u660E\u786E\u7684\u6743\u9650\u8303\u56F4\u548C\u901F\u7387\u9650\u5236\u2014\u2014\u8BA9\u60A8\u7684\u4E2A\u4EBA\u52A9\u624B\u53EF\u4EE5\u4EE3\u60A8\u5411\u5B83\u4EEC\u67E5\u8BE2\u3002\u8BE2\u95EE\u4E5E\u529B\u9A6C\u624E\u7F57\u5F92\u6B65\u62A5\u4EF7\uFF0C\u60A8\u7684\u52A9\u624B\u4F1A\u6536\u5230\u4E00\u4EFD\u5DF2\u7B7E\u540D\u7684\u7ED3\u6784\u5316\u62A5\u4EF7\uFF0C\u7531\u60A8\u51B3\u5B9A\u63A5\u53D7\u6216\u62D2\u7EDD\u3002\u5BF9\u4F01\u4E1A\u800C\u8A00\uFF0C\u6CE8\u518C\u8868\u4E2D\u7684\u4ED8\u8D39\u4EE3\u7406\u4F4D\u662F\u4E00\u9879 B2B \u6536\u5165\u6765\u6E90\uFF0C\u8BA9\u5E73\u53F0\u65E0\u9700\u51FA\u552E\u7528\u6237\u6CE8\u610F\u529B\u4E5F\u80FD\u83B7\u5F97\u8D44\u91D1\u3002"
    },
    deepLink: { to: "/developers", label: "Agent registry" }
  },
  {
    id: "verifiable-credentials",
    title: { en: "Verifiable Credentials", sw: "Hati Zinazothibitishwa", fr: "Attestations v\xE9rifiables", ar: "\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u062D\u0642\u0642", zh: "\u53EF\u9A8C\u8BC1\u51ED\u8BC1" },
    module: "Developer guide",
    version: "v2.16.0",
    roles: ["visitor", "member", "admin"],
    keywords: ["verifiable credentials", "w3c", "reputation", "export reputation", "trust score", "credential", "hati", "attestation", "\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A", "\u0633\u0645\u0639\u0629", "\u51ED\u8BC1", "\u58F0\u8A89"],
    answer: {
      en: "Your Kaluta reputation is yours to carry. Export expertise badges, trust scores and sales history as signed, W3C-style verifiable credentials, then present them to any other platform that can verify the signature. Identity and earned trust stop being locked inside one app and become a cross-ecosystem asset.",
      sw: "Sifa yako ya Kaluta ni yako kubeba. Hamisha beji za utaalamu, alama za uaminifu na historia ya mauzo kama hati zilizosainiwa zinazothibitishwa za mtindo wa W3C, kisha uzionyeshe kwa jukwaa jingine lolote linaloweza kuthibitisha saini. Utambulisho na uaminifu uliopatikana huacha kufungwa ndani ya app moja na hugeuka kuwa mali ya mfumo mzima.",
      fr: "Votre r\xE9putation Kaluta vous appartient. Exportez badges d\u2019expertise, scores de confiance et historique de ventes sous forme d\u2019attestations v\xE9rifiables sign\xE9es, de style W3C, puis pr\xE9sentez-les \xE0 toute autre plateforme capable d\u2019en v\xE9rifier la signature. L\u2019identit\xE9 et la confiance acquise cessent d\u2019\xEAtre enferm\xE9es dans une seule app et deviennent un atout inter-\xE9cosyst\xE8mes.",
      ar: "\u0633\u0645\u0639\u062A\u0643 \u0641\u064A \u0643\u0627\u0644\u0648\u062A\u0627 \u0645\u0644\u0643 \u0644\u0643 \u062A\u062D\u0645\u0644\u0647\u0627 \u0645\u0639\u0643. \u0635\u062F\u0651\u0631 \u0634\u0627\u0631\u0627\u062A \u0627\u0644\u062E\u0628\u0631\u0629 \u0648\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u062B\u0642\u0629 \u0648\u0633\u062C\u0644 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0643\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0645\u0648\u0642\u0651\u0639\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u0645\u0637 W3C\u060C \u062B\u0645 \u0627\u0639\u0631\u0636\u0647\u0627 \u0639\u0644\u0649 \u0623\u064A \u0645\u0646\u0635\u0629 \u0623\u062E\u0631\u0649 \u0642\u0627\u062F\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062A\u0648\u0642\u064A\u0639. \u0647\u0643\u0630\u0627 \u062A\u062A\u062D\u0648\u0644 \u0627\u0644\u0647\u0648\u064A\u0629 \u0648\u0627\u0644\u062B\u0642\u0629 \u0627\u0644\u0645\u0643\u062A\u0633\u0628\u0629 \u0645\u0646 \u062D\u0628\u0633 \u062F\u0627\u062E\u0644 \u062A\u0637\u0628\u064A\u0642 \u0648\u0627\u062D\u062F \u0625\u0644\u0649 \u0623\u0635\u0644 \u0639\u0627\u0628\u0631 \u0644\u0644\u0623\u0646\u0638\u0645\u0629.",
      zh: "\u60A8\u5728 Kaluta \u79EF\u7D2F\u7684\u58F0\u8A89\u5F52\u60A8\u6240\u6709\uFF0C\u53EF\u4EE5\u968F\u8EAB\u643A\u5E26\u3002\u5C06\u4E13\u4E1A\u5FBD\u7AE0\u3001\u4FE1\u4EFB\u5206\u6570\u548C\u9500\u552E\u8BB0\u5F55\u5BFC\u51FA\u4E3A W3C \u6807\u51C6\u7684\u5DF2\u7B7E\u540D\u53EF\u9A8C\u8BC1\u51ED\u8BC1\uFF0C\u7136\u540E\u5411\u4EFB\u4F55\u80FD\u591F\u9A8C\u8BC1\u7B7E\u540D\u7684\u5176\u4ED6\u5E73\u53F0\u51FA\u793A\u3002\u8EAB\u4EFD\u548C\u8F9B\u82E6\u8D62\u5F97\u7684\u4FE1\u4EFB\u4E0D\u518D\u88AB\u9501\u5728\u5355\u4E00\u5E94\u7528\u5185\uFF0C\u800C\u662F\u6210\u4E3A\u8DE8\u751F\u6001\u7CFB\u7EDF\u7684\u8D44\u4EA7\u3002"
    },
    deepLink: { to: "/developers", label: "Credentials docs" }
  },
  {
    id: "training-licensing",
    title: { en: "AI-Training Licensing", sw: "Uleseni wa Mafunzo ya AI", fr: "Licence d\u2019entra\xEEnement IA", ar: "\u062A\u0631\u062E\u064A\u0635 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A", zh: "AI \u8BAD\u7EC3\u6388\u6743" },
    module: "Developer guide",
    version: "v2.16.0",
    roles: ["member", "admin"],
    keywords: ["training", "licensing", "ai training", "consent", "revocation", "compensation", "opt-in", "leseni", "licence", "\u062A\u0631\u062E\u064A\u0635", "\u062A\u062F\u0631\u064A\u0628", "\u8BAD\u7EC3\u6388\u6743", "\u540C\u610F"],
    answer: {
      en: "Creator AI-Training Licensing puts your work under your terms. An opt-in consent panel offers granular scopes \u2014 text, video, voice \u2014 and a duration you choose, and revocation comes with a purge SLA so your content leaves the training corpus on schedule. When licensed use generates compensation, it is routed to you via the immutable ledger, traceable like every other Kaluta payment.",
      sw: "Uleseni wa Mafunzo ya AI huweka kazi yako chini ya masharti yako. Paneli ya ridhaa ya kujiunga inatoa wigo wa kina \u2014 maandishi, video, sauti \u2014 na muda unaouchagua wewe, na kufuta ridhaa kunakuja na SLA ya kusafisha ili maudhui yako yaondoke kwenye mkusanyo wa mafunzo kwa ratiba. Fidia inapotokana na matumizi ya leseni, huelekezwa kwako kupitia ledger isiyobadilika, ikifuatiliwa kama malipo mengine yote ya Kaluta.",
      fr: "La licence d\u2019entra\xEEnement IA place votre \u0153uvre sous vos conditions. Un panneau de consentement explicite offre des port\xE9es granulaires \u2014 texte, vid\xE9o, voix \u2014 et une dur\xE9e que vous choisissez, et la r\xE9vocation s\u2019accompagne d\u2019un SLA de purge pour que votre contenu quitte le corpus d\u2019entra\xEEnement dans les d\xE9lais. Toute compensation issue de l\u2019usage licenci\xE9 vous est achemin\xE9e via le registre immuable, tra\xE7able comme tout paiement Kaluta.",
      ar: "\u062A\u0631\u062E\u064A\u0635 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u0636\u0639 \u0639\u0645\u0644\u0643 \u062A\u062D\u062A \u0634\u0631\u0648\u0637\u0643. \u062A\u0642\u062F\u0645 \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629 \u0646\u0637\u0627\u0642\u0627\u062A \u062F\u0642\u064A\u0642\u0629 \u2014 \u0646\u0635 \u0648\u0641\u064A\u062F\u064A\u0648 \u0648\u0635\u0648\u062A \u2014 \u0648\u0645\u062F\u0629 \u062A\u062E\u062A\u0627\u0631\u0647\u0627 \u0628\u0646\u0641\u0633\u0643\u060C \u0648\u064A\u0623\u062A\u064A \u0627\u0644\u0625\u0644\u063A\u0627\u0621 \u0645\u0639 \u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u0645\u0633\u062A\u0648\u0649 \u062E\u062F\u0645\u0629 \u0644\u0644\u062D\u0630\u0641 \u0644\u064A\u063A\u0627\u062F\u0631 \u0645\u062D\u062A\u0648\u0627\u0643 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0641\u064A \u0645\u0648\u0639\u062F\u0647. \u0648\u0639\u0646\u062F\u0645\u0627 \u064A\u0646\u062A\u062C \u0639\u0646 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u0631\u062E\u0651\u0635 \u062A\u0639\u0648\u064A\u0636\u060C \u064A\u064F\u0648\u062C\u064E\u0651\u0647 \u0625\u0644\u064A\u0643 \u0639\u0628\u0631 \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062B\u0627\u0628\u062A\u060C \u0642\u0627\u0628\u0644\u064B\u0627 \u0644\u0644\u062A\u062A\u0628\u0639 \u0643\u0623\u064A \u062F\u0641\u0639\u0629 \u0623\u062E\u0631\u0649 \u0641\u064A \u0643\u0627\u0644\u0648\u062A\u0627.",
      zh: "\u521B\u4F5C\u8005 AI \u8BAD\u7EC3\u6388\u6743\u8BA9\u60A8\u7684\u4F5C\u54C1\u6309\u60A8\u7684\u6761\u6B3E\u4F7F\u7528\u3002\u81EA\u613F\u5F00\u542F\u7684\u540C\u610F\u9762\u677F\u63D0\u4F9B\u7EC6\u7C92\u5EA6\u8303\u56F4\u2014\u2014\u6587\u5B57\u3001\u89C6\u9891\u3001\u8BED\u97F3\u2014\u2014\u5E76\u7531\u60A8\u9009\u62E9\u6388\u6743\u671F\u9650\uFF1B\u64A4\u9500\u6388\u6743\u9644\u5E26\u6E05\u9664\u670D\u52A1\u7B49\u7EA7\u627F\u8BFA\uFF0C\u786E\u4FDD\u60A8\u7684\u5185\u5BB9\u6309\u65F6\u9000\u51FA\u8BAD\u7EC3\u8BED\u6599\u5E93\u3002\u6388\u6743\u4F7F\u7528\u4EA7\u751F\u7684\u62A5\u916C\u4F1A\u901A\u8FC7\u4E0D\u53EF\u7BE1\u6539\u8D26\u672C\u652F\u4ED8\u7ED9\u60A8\uFF0C\u4E0E Kaluta \u7684\u5176\u4ED6\u4ED8\u6B3E\u4E00\u6837\u53EF\u8FFD\u6EAF\u3002"
    },
    deepLink: { to: "/developers", label: "Licensing panel" }
  },
  {
    id: "ai-quality-ops",
    title: { en: "AI Quality & Operations", sw: "Ubora wa AI na Uendeshaji", fr: "Qualit\xE9 IA et op\xE9rations", ar: "\u062C\u0648\u062F\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A", zh: "AI \u8D28\u91CF\u4E0E\u8FD0\u7EF4" },
    module: "Admin guide",
    version: "v2.16.0",
    roles: ["admin"],
    adminOnly: true,
    keywords: ["quality gate", "eval", "feature flag", "kill switch", "observability", "rollout", "performance budget", "reconciliation", "ubora", "qualit\xE9", "\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062C\u0648\u062F\u0629", "\u8D28\u91CF\u95E8\u7981", "\u7070\u5EA6\u53D1\u5E03"],
    answer: {
      en: "The admin console runs platform quality as an engineering discipline. An AI evaluation harness enforces per-language quality gates that block unsafe model swaps, while feature flags ship changes through staged rollouts with kill switches. Per-provider AI observability, on-device model routing for sensitive paths, performance budgets, ledger reconciliation bots and visual-regression plus accessibility CI keep the whole system honest \u2014 with machine-readable branding for downstream tooling.",
      sw: "Konsoli ya msimamizi huendesha ubora wa jukwaa kama fani ya uhandisi. Kifaa cha tathmini cha AI hutumia milango ya ubora kwa kila lugha inayozuia kubadilishwa kwa modeli zisizo salama, na feature flags husafirisha mabadiliko kwa rollout za hatua kwa hatua zenye kill switches. Ufuatiliaji wa AI kwa kila mtoa huduma, uelekezaji wa modeli kwenye kifaa kwa njia nyeti, bajeti za utendaji, roboti za upatanisho wa ledger na CI ya visual-regression na upatikanaji huweka mfumo mzima waaminifu \u2014 na branding inayosomeka na mashine kwa zana za chini.",
      fr: "La console admin pilote la qualit\xE9 de la plateforme comme une discipline d\u2019ing\xE9nierie. Un harnais d\u2019\xE9valuation IA impose des portes qualit\xE9 par langue qui bloquent les remplacements de mod\xE8les \xE0 risque, et les feature flags d\xE9ploient les changements par paliers avec kill switches. Observabilit\xE9 IA par fournisseur, routage de mod\xE8les sur appareil pour les chemins sensibles, budgets de performance, bots de r\xE9conciliation du registre et CI de r\xE9gression visuelle et d\u2019accessibilit\xE9 gardent le syst\xE8me honn\xEAte \u2014 avec un branding lisible par machine pour l\u2019outillage en aval.",
      ar: "\u062A\u062F\u064A\u0631 \u0648\u062D\u062F\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0634\u0631\u0641 \u062C\u0648\u062F\u0629 \u0627\u0644\u0645\u0646\u0635\u0629 \u0643\u062A\u062E\u0635\u0635 \u0647\u0646\u062F\u0633\u064A. \u062A\u0641\u0631\u0636 \u0623\u062F\u0627\u0629 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0648\u0627\u0628\u0627\u062A \u062C\u0648\u062F\u0629 \u0644\u0643\u0644 \u0644\u063A\u0629 \u062A\u062D\u062C\u0628 \u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u063A\u064A\u0631 \u0627\u0644\u0622\u0645\u0646\u060C \u0628\u064A\u0646\u0645\u0627 \u062A\u0634\u062D\u0646 \u0623\u0639\u0644\u0627\u0645 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u062A\u063A\u064A\u064A\u0631\u0627\u062A \u0639\u0628\u0631 \u0637\u0631\u062D \u062A\u062F\u0631\u064A\u062C\u064A \u0645\u0639 \u0645\u0641\u0627\u062A\u064A\u062D \u0625\u064A\u0642\u0627\u0641 \u0637\u0627\u0631\u0626. \u0648\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0644\u0643\u0644 \u0645\u0632\u0648\u062F\u060C \u0648\u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \u0644\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0633\u0629\u060C \u0648\u0645\u064A\u0632\u0627\u0646\u064A\u0627\u062A \u0627\u0644\u0623\u062F\u0627\u0621\u060C \u0648\u0631\u0648\u0628\u0648\u062A\u0627\u062A \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0633\u062C\u0644\u060C \u0648\u062A\u0643\u0627\u0645\u0644 \u0645\u0633\u062A\u0645\u0631 \u0644\u0644\u0627\u0646\u062D\u062F\u0627\u0631 \u0627\u0644\u0628\u0635\u0631\u064A \u0648\u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u2014 \u0643\u0644\u0647\u0627 \u062A\u062D\u0641\u0638 \u0646\u0632\u0627\u0647\u0629 \u0627\u0644\u0646\u0638\u0627\u0645\u060C \u0645\u0639 \u0647\u0648\u064A\u0629 \u0628\u0635\u0631\u064A\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0622\u0644\u064A\u064B\u0627 \u0644\u0644\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629.",
      zh: "\u7BA1\u7406\u63A7\u5236\u53F0\u5C06\u5E73\u53F0\u8D28\u91CF\u4F5C\u4E3A\u5DE5\u7A0B\u5B66\u79D1\u6765\u8FD0\u8425\u3002AI \u8BC4\u4F30\u6846\u67B6\u6267\u884C\u6309\u8BED\u8A00\u5212\u5206\u7684\u8D28\u91CF\u95E8\u7981\uFF0C\u963B\u6B62\u4E0D\u5B89\u5168\u7684\u6A21\u578B\u66FF\u6362\uFF1B\u529F\u80FD\u5F00\u5173\u901A\u8FC7\u5E26\u7D27\u6025\u7194\u65AD\u7684\u5206\u9636\u6BB5\u7070\u5EA6\u53D1\u5E03\u53D8\u66F4\u3002\u6309\u670D\u52A1\u5546\u7684 AI \u53EF\u89C2\u6D4B\u6027\u3001\u654F\u611F\u8DEF\u5F84\u7684\u7AEF\u4FA7\u6A21\u578B\u8DEF\u7531\u3001\u6027\u80FD\u9884\u7B97\u3001\u8D26\u672C\u5BF9\u8D26\u673A\u5668\u4EBA\uFF0C\u4EE5\u53CA\u89C6\u89C9\u56DE\u5F52\u4E0E\u65E0\u969C\u788D CI\uFF0C\u5171\u540C\u4FDD\u969C\u7CFB\u7EDF\u7684\u8BDA\u5B9E\u53EF\u9760\u2014\u2014\u5E76\u4E3A\u4E0B\u6E38\u5DE5\u5177\u63D0\u4F9B\u673A\u5668\u53EF\u8BFB\u7684\u54C1\u724C\u89C4\u8303\u3002"
    },
    deepLink: { to: "/admin", label: "Open Admin Console" }
  },
  {
    id: "commerce-copilot",
    title: { en: "Commerce Copilot", sw: "Msaidizi wa Biashara", fr: "Copilote commerce", ar: "\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u062C\u0627\u0631\u0629", zh: "\u7535\u5546\u526F\u9A7E" },
    module: "Commerce guide",
    version: "v2.16.0",
    roles: ["member", "admin"],
    keywords: ["commerce copilot", "listing", "photos", "demand forecast", "live shopping", "price suggestion", "biashara", "copilote", "annonce", "\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u062C\u0627\u0631\u0629", "\u0625\u0639\u0644\u0627\u0646 \u0645\u0646\u062A\u062C", "\u7535\u5546", "\u76F4\u64AD\u5E26\u8D27"],
    answer: {
      en: "Commerce Copilot writes the boring half of selling. Snap photos of an item and it generates the listing \u2014 title, description and a suggested price \u2014 ready for you to review and publish. Demand-forecast sparklines show when your category is heating up, and a live-shopping host assistant keeps product cues and answers at hand while you stream.",
      sw: "Msaidizi wa Biashara huandika sehemu ngumu ya kuuza. Piga picha za bidhaa nao hutengeneza orodha \u2014 jina, maelezo na bei iliyopendekezwa \u2014 tayari wewe kupitia na kuchapisha. Mistari ya utabiri wa mahitaji inaonyesha lini aina yako inapanda moto, na msaidizi wa mwenyeji wa live-shopping huweka ishara za bidhaa na majibu karibu nawe unapostream.",
      fr: "Le Copilote commerce r\xE9dige la moiti\xE9 fastidieuse de la vente. Photographiez un article et il g\xE9n\xE8re l\u2019annonce \u2014 titre, description et prix sugg\xE9r\xE9 \u2014 pr\xEAte \xE0 relire et \xE0 publier. Les courbes de pr\xE9vision de demande montrent quand votre cat\xE9gorie chauffe, et l\u2019assistant d\u2019animation live-shopping garde fiches produits et r\xE9ponses sous la main pendant votre stream.",
      ar: "\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u064A\u0643\u062A\u0628 \u0627\u0644\u0646\u0635\u0641 \u0627\u0644\u0645\u0645\u0644 \u0645\u0646 \u0627\u0644\u0628\u064A\u0639. \u0627\u0644\u062A\u0642\u0637 \u0635\u0648\u0631\u064B\u0627 \u0644\u0644\u0645\u0646\u062A\u062C \u0641\u064A\u0648\u0644\u0651\u062F \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u2014 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0648\u0635\u0641 \u0648\u0633\u0639\u0631\u064B\u0627 \u0645\u0642\u062A\u0631\u062D\u064B\u0627 \u2014 \u062C\u0627\u0647\u0632\u064B\u0627 \u0644\u0645\u0631\u0627\u062C\u0639\u062A\u0643 \u0648\u0646\u0634\u0631\u0647. \u0648\u062A\u0648\u0636\u062D \u0645\u0646\u062D\u0646\u064A\u0627\u062A \u062A\u0648\u0642\u0639 \u0627\u0644\u0637\u0644\u0628 \u0645\u062A\u0649 \u062A\u0634\u062A\u0639\u0644 \u0641\u0626\u062A\u0643\u060C \u0628\u064A\u0646\u0645\u0627 \u064A\u064F\u0628\u0642\u064A \u0645\u0633\u0627\u0639\u062F \u0645\u0636\u064A\u0641 \u0627\u0644\u062A\u0633\u0648\u0642 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A \u0641\u064A \u0645\u062A\u0646\u0627\u0648\u0644 \u064A\u062F\u0643 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0628\u062B.",
      zh: "\u7535\u5546\u526F\u9A7E\u66FF\u60A8\u5B8C\u6210\u5356\u8D27\u4E2D\u7E41\u7410\u7684\u90A3\u4E00\u534A\u3002\u62CD\u4E0B\u5546\u54C1\u7167\u7247\uFF0C\u5B83\u5C31\u4F1A\u751F\u6210\u5546\u54C1\u4FE1\u606F\u2014\u2014\u6807\u9898\u3001\u63CF\u8FF0\u548C\u5EFA\u8BAE\u552E\u4EF7\u2014\u2014\u4F9B\u60A8\u5BA1\u6838\u540E\u53D1\u5E03\u3002\u9700\u6C42\u9884\u6D4B\u66F2\u7EBF\u544A\u8BC9\u60A8\u54C1\u7C7B\u4F55\u65F6\u5347\u6E29\uFF0C\u76F4\u64AD\u5E26\u8D27\u52A9\u624B\u5728\u60A8\u5F00\u64AD\u65F6\u968F\u65F6\u63D0\u4F9B\u5546\u54C1\u8981\u70B9\u548C\u5E94\u7B54\u5EFA\u8BAE\u3002"
    },
    steps: [
      "Open Commerce and photograph the item you want to sell.",
      "Review the generated title, description and price suggestion \u2014 then publish.",
      "Go live: the host assistant feeds you product cues and answers in-stream."
    ],
    image: "/app-feed-mock.jpg",
    imageAlt: "Commerce copilot generating a listing from photos",
    deepLink: { to: "/commerce", label: "Open Commerce" }
  },
  {
    id: "ad-creative-intel",
    title: { en: "Ad Creative Intelligence", sw: "Akili ya Matangazo Bunifu", fr: "Intelligence cr\xE9ative publicitaire", ar: "\u0630\u0643\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0628\u062F\u0627\u0639\u064A", zh: "\u5E7F\u544A\u521B\u610F\u667A\u80FD" },
    module: "Commerce guide",
    version: "v2.16.0",
    roles: ["member", "admin"],
    keywords: ["ad creative", "brand voice", "predicted performance", "creative fatigue", "ctr", "variant", "matangazo", "cr\xE9atif", "publicit\xE9", "\u0625\u0639\u0644\u0627\u0646", "\u0625\u0628\u062F\u0627\u0639\u064A", "\u5E7F\u544A\u521B\u610F", "\u54C1\u724C\u58F0\u97F3"],
    answer: {
      en: 'Ad Creative Intelligence turns one brief into a tested campaign. It generates ad variants trained on your brand voice, scores each with a predicted performance before you spend a cent, and fans variants out across your languages automatically. While the campaign runs, creative-fatigue alerts \u2014 "CTR decaying \u2014 rotate variant B" \u2014 tell you exactly when to refresh.',
      sw: 'Akili ya Matangazo Bunifu hubadilisha muhtasari mmoja kuwa kampeni iliyojaribiwa. Hutengeneza matangazo mbadala yaliyofunzwa kwa sauti ya chapa yako, kuyapa kila moja alama ya utendaji unaotabiriwa kabla hujatumia senti, na kusambaza matangazo kwa lugha zako kiotomatiki. Kampeni ikiendelea, arifa za uchovu wa ubunifu \u2014 "CTR inashuka \u2014 zamisha tangazo B" \u2014 hukuambia hasa lini ubadilishe.',
      fr: "L\u2019intelligence cr\xE9ative transforme un brief en campagne test\xE9e. Elle g\xE9n\xE8re des variantes d\u2019annonces entra\xEEn\xE9es sur votre voix de marque, note chacune avec une performance pr\xE9dite avant la moindre d\xE9pense, et les d\xE9cline automatiquement dans vos langues. Pendant la campagne, les alertes de fatigue cr\xE9ative \u2014 \xAB CTR en baisse \u2014 faites tourner la variante B \xBB \u2014 indiquent le moment exact de rafra\xEEchir.",
      ar: '\u0630\u0643\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0625\u0628\u062F\u0627\u0639\u064A \u064A\u062D\u0648\u0651\u0644 \u0645\u0648\u062C\u0632\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627 \u0625\u0644\u0649 \u062D\u0645\u0644\u0629 \u0645\u064F\u062E\u062A\u0628\u064E\u0631\u0629. \u064A\u0648\u0644\u0651\u062F \u0646\u0633\u062E\u064B\u0627 \u0625\u0639\u0644\u0627\u0646\u064A\u0629 \u0645\u062F\u0631\u0651\u0628\u0629 \u0639\u0644\u0649 \u0635\u0648\u062A \u0639\u0644\u0627\u0645\u062A\u0643\u060C \u0648\u064A\u0645\u0646\u062D \u0643\u0644 \u0646\u0633\u062E\u0629 \u062F\u0631\u062C\u0629 \u0623\u062F\u0627\u0621 \u0645\u062A\u0648\u0642\u0639\u0629 \u0642\u0628\u0644 \u0623\u0646 \u062A\u0646\u0641\u0642 \u0641\u0644\u0633\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627\u060C \u0648\u064A\u0648\u0632\u0651\u0639 \u0627\u0644\u0646\u0633\u062E \u0639\u0628\u0631 \u0644\u063A\u0627\u062A\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627. \u0648\u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062D\u0645\u0644\u0629\u060C \u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0625\u0646\u0647\u0627\u0643 \u0627\u0644\u0625\u0628\u062F\u0627\u0639 \u2014 "\u0646\u0633\u0628\u0629 \u0627\u0644\u0646\u0642\u0631 \u062A\u062A\u062F\u0647\u0648\u0631 \u2014 \u0628\u062F\u0651\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u0633\u062E\u0629 \u0628" \u2014 \u062A\u062E\u0628\u0631\u0643 \u0628\u0627\u0644\u0636\u0628\u0637 \u0645\u062A\u0649 \u062A\u062C\u062F\u062F.',
      zh: '\u5E7F\u544A\u521B\u610F\u667A\u80FD\u628A\u4E00\u4EFD\u7B80\u62A5\u53D8\u6210\u7ECF\u8FC7\u6D4B\u8BD5\u7684\u8425\u9500\u6D3B\u52A8\u3002\u5B83\u57FA\u4E8E\u60A8\u7684\u54C1\u724C\u58F0\u97F3\u751F\u6210\u591A\u4E2A\u5E7F\u544A\u53D8\u4F53\uFF0C\u5728\u60A8\u82B1\u8D39\u4E00\u5206\u94B1\u4E4B\u524D\u4E3A\u6BCF\u4E2A\u53D8\u4F53\u7ED9\u51FA\u9884\u6D4B\u6548\u679C\u5206\uFF0C\u5E76\u81EA\u52A8\u6309\u60A8\u7684\u8BED\u8A00\u94FA\u5F00\u53D8\u4F53\u3002\u6295\u653E\u671F\u95F4\uFF0C\u521B\u610F\u75B2\u52B3\u63D0\u9192\u2014\u2014"\u70B9\u51FB\u7387\u6B63\u5728\u8870\u51CF\u2014\u2014\u8BF7\u8F6E\u6362\u53D8\u4F53 B"\u2014\u2014\u4F1A\u7CBE\u786E\u544A\u8BC9\u60A8\u4F55\u65F6\u8BE5\u66F4\u65B0\u7D20\u6750\u3002'
    },
    deepLink: { to: "/commerce", label: "Open Advertising" }
  }
];
var KB_BY_ID = Object.fromEntries(KB_ENTRIES.map((e) => [e.id, e]));
var SW_MARKERS = ["nawezaje", "jambo", "habari", "kwenye", "mti", "familia", "pesa", "fedha", "kuthibitisha", "vipi", "nini", "wapi", "kwanini", "tafadhali", "asante", "mlisho", "duka", "tangazo", "akaunti", "jamaa", "kwa", "na", "ya", "kwa", "ninaweza", "ni", "sijui", "kufuta"];
var FR_MARKERS = ["comment", "pourquoi", "est", "les", "des", "une", "avec", "pour", "dans", "sur", "compte", "famille", "argent", "publicit\xE9", "merci", "o\xF9", "quoi", "quel", "quelle", "faire", "mon", "ma", "mes", "je", "vous", "nous", "pas", "plus"];
function detectLanguage(text, fallback = "en") {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  const words = text.toLowerCase().split(/[^a-zàâäçéèêëîïôöùûü'’]+/i).filter(Boolean);
  let sw = 0;
  let fr = 0;
  for (const w of words) {
    if (SW_MARKERS.includes(w)) sw++;
    if (FR_MARKERS.includes(w)) fr++;
  }
  if (sw >= 2 && sw >= fr) return "sw";
  if (fr >= 2) return "fr";
  if (sw === 1 && fr === 0 && words.length <= 6) return "sw";
  return fallback;
}
function matchEntry(query) {
  const q = query.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const entry of KB_ENTRIES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.length >= 7 ? 3 : kw.length >= 4 ? 2 : 1;
    }
    for (const lang of Object.keys(entry.title)) {
      const t = entry.title[lang].toLowerCase();
      if (t.length > 3 && q.includes(t)) score += 4;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (!best || bestScore < 2) return { entry: null, score: bestScore };
  return { entry: best, score: bestScore };
}
var UI_STRINGS = {
  en: {
    placeholder: "Ask about any feature\u2026",
    listening: "Listening\u2026 speak now",
    voiceUnsupported: "Voice input isn\u2019t supported by this browser \u2014 typing works everywhere.",
    tabWritten: "Written + images",
    tabVideo: "Video clip",
    openInApp: "Open in app",
    fromSource: "From",
    updated: "updated",
    suggestionsFor: "Popular here",
    noInfo: "I don't have verified information about that yet \u2014 I'd rather say so than guess. Try asking about feeds, family tree, memorials, marketplace, subscriptions, safety or developers.",
    adminRefusal: "That topic is scoped to administrators, and your current access ({role}) doesn\u2019t include it. I never reveal admin capabilities outside the admin role \u2014 if you\u2019re an admin, switch the role demo above or open the Admin Console.",
    escalateNote: "I\u2019ve noted this as an escalation for the admin team.",
    videoTitle: "Demo walkthrough",
    captionsNote: "Captions match your language automatically",
    roleLabel: "View as",
    visitor: "Visitor",
    member: "Member",
    admin: "Admin",
    watchTab: "AI Watch",
    send: "Send",
    spokenReplies: "Spoken replies",
    typing: "Kaluta Assistant is thinking\u2026",
    langChip: "Replying in {lang}",
    deepLinkLabel: "Open in app"
  },
  sw: {
    placeholder: "Uliza kuhusu kipengele chochote\u2026",
    listening: "Ninasikiliza\u2026 zungumza sasa",
    voiceUnsupported: "Ingizo la sauti halitumiki na kivinjari hiki \u2014 kuandika kunafanya kazi kote.",
    tabWritten: "Maandishi + picha",
    tabVideo: "Video ya demo",
    openInApp: "Fungua kwenye app",
    fromSource: "Kutoka",
    updated: "imesasishwa",
    suggestionsFor: "Maarufu hapa",
    noInfo: "Sina taarifa zilizothibitishwa kuhusu hilo bado \u2014 nafasisi kusema hivyo kuliko kukisia. Jaribu kuuliza kuhusu mlisho, mti wa familia, makaburi, soko, usajili, usalama au wasanidi.",
    adminRefusal: "Mada hiyo ni ya wasimamizi pekee, na ufikiaji wako wa sasa ({role}) haujajumuisha. Sisirichaji uwezo wa msimamizi nje ya jukumu hilo \u2014 kama wewe ni msimamizi, badilisha jukumu hapo juu au fungua Konsoli ya Msimamizi.",
    escalateNote: "Nimeandika hili kama escalation kwa timu ya wasimamizi.",
    videoTitle: "Onyesho la demo",
    captionsNote: "Manukuu hulingana na lugha yako kiotomatiki",
    roleLabel: "Tazama kama",
    visitor: "Mgeni",
    member: "Mwanachama",
    admin: "Msimamizi",
    watchTab: "AI Watch",
    send: "Tuma",
    spokenReplies: "Majibu ya sauti",
    typing: "Kaluta Assistant inafikiria\u2026",
    langChip: "Najibu kwa {lang}",
    deepLinkLabel: "Fungua kwenye app"
  },
  fr: {
    placeholder: "Posez une question sur une fonctionnalit\xE9\u2026",
    listening: "\xC9coute en cours\u2026 parlez",
    voiceUnsupported: "La saisie vocale n\u2019est pas prise en charge par ce navigateur \u2014 le texte fonctionne partout.",
    tabWritten: "\xC9crit + images",
    tabVideo: "Clip vid\xE9o",
    openInApp: "Ouvrir dans l\u2019app",
    fromSource: "Source",
    updated: "mise \xE0 jour",
    suggestionsFor: "Populaire ici",
    noInfo: "Je n\u2019ai pas encore d\u2019information v\xE9rifi\xE9e \xE0 ce sujet \u2014 je pr\xE9f\xE8re le dire plut\xF4t que deviner. Essayez les fils, l\u2019arbre familial, les m\xE9moriaux, la marketplace, les abonnements, la s\xE9curit\xE9 ou les d\xE9veloppeurs.",
    adminRefusal: "Ce sujet est r\xE9serv\xE9 aux administrateurs et votre acc\xE8s actuel ({role}) ne l\u2019inclut pas. Je ne r\xE9v\xE8le jamais les capacit\xE9s admin hors du r\xF4le admin \u2014 si vous \xEAtes admin, changez le r\xF4le de d\xE9mo ci-dessus ou ouvrez la console d\u2019administration.",
    escalateNote: "J\u2019ai transmis cela comme escalade \xE0 l\u2019\xE9quipe admin.",
    videoTitle: "D\xE9monstration guid\xE9e",
    captionsNote: "Les sous-titres suivent votre langue automatiquement",
    roleLabel: "Voir comme",
    visitor: "Visiteur",
    member: "Membre",
    admin: "Admin",
    watchTab: "Veille IA",
    send: "Envoyer",
    spokenReplies: "R\xE9ponses vocales",
    typing: "Kaluta Assistant r\xE9fl\xE9chit\u2026",
    langChip: "R\xE9ponse en {lang}",
    deepLinkLabel: "Ouvrir dans l\u2019app"
  },
  ar: {
    placeholder: "\u0627\u0633\u0623\u0644 \u0639\u0646 \u0623\u064A \u0645\u064A\u0632\u0629\u2026",
    listening: "\u0623\u0633\u062A\u0645\u0639\u2026 \u062A\u062D\u062F\u062B \u0627\u0644\u0622\u0646",
    voiceUnsupported: "\u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0635\u0648\u062A\u064A \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u2014 \u0627\u0644\u0643\u062A\u0627\u0628\u0629 \u062A\u0639\u0645\u0644 \u0641\u064A \u0643\u0644 \u0645\u0643\u0627\u0646.",
    tabWritten: "\u0643\u062A\u0627\u0628\u0629 + \u0635\u0648\u0631",
    tabVideo: "\u0645\u0642\u0637\u0639 \u0641\u064A\u062F\u064A\u0648",
    openInApp: "\u0627\u0641\u062A\u062D \u0641\u064A \u0627\u0644\u062A\u0637\u0628\u064A\u0642",
    fromSource: "\u0627\u0644\u0645\u0635\u062F\u0631",
    updated: "\u0645\u062D\u062F\u0651\u062B",
    suggestionsFor: "\u0634\u0627\u0626\u0639 \u0647\u0646\u0627",
    noInfo: "\u0644\u064A\u0633 \u0644\u062F\u064A \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0645\u0648\u062B\u0642\u0629 \u0639\u0646 \u0630\u0644\u0643 \u0628\u0639\u062F \u2014 \u0623\u0641\u0636\u0651\u0644 \u0642\u0648\u0644 \u0630\u0644\u0643 \u0628\u062F\u0644 \u0627\u0644\u062A\u062E\u0645\u064A\u0646. \u062C\u0631\u0651\u0628 \u0627\u0644\u0633\u0624\u0627\u0644 \u0639\u0646 \u0627\u0644\u062E\u0644\u0627\u0635\u0627\u062A \u0623\u0648 \u0634\u062C\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0623\u0648 \u0627\u0644\u0646\u064F\u0651\u0635\u064F\u0628 \u0623\u0648 \u0627\u0644\u0633\u0648\u0642 \u0623\u0648 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0623\u0648 \u0627\u0644\u0623\u0645\u0627\u0646 \u0623\u0648 \u0627\u0644\u0645\u0637\u0648\u0631\u064A\u0646.",
    adminRefusal: "\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0645\u062E\u0635\u0635 \u0644\u0644\u0645\u0634\u0631\u0641\u064A\u0646\u060C \u0648\u0635\u0644\u0627\u062D\u064A\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 ({role}) \u0644\u0627 \u062A\u0634\u0645\u0644\u0647. \u0644\u0627 \u0623\u0643\u0634\u0641 \u0642\u062F\u0631\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u062E\u0627\u0631\u062C \u062F\u0648\u0631 \u0627\u0644\u0645\u0634\u0631\u0641 \u0623\u0628\u062F\u064B\u0627 \u2014 \u0625\u0630\u0627 \u0643\u0646\u062A \u0645\u0634\u0631\u0641\u064B\u0627\u060C \u0628\u062F\u0651\u0644 \u0627\u0644\u062F\u0648\u0631 \u0623\u0639\u0644\u0627\u0647 \u0623\u0648 \u0627\u0641\u062A\u062D \u0648\u062D\u062F\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0634\u0631\u0641.",
    escalateNote: "\u062F\u0648\u0651\u0646\u062A \u0647\u0630\u0627 \u0643\u062A\u0635\u0639\u064A\u062F \u0644\u0641\u0631\u064A\u0642 \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646.",
    videoTitle: "\u062C\u0648\u0644\u0629 \u062A\u0648\u0636\u064A\u062D\u064A\u0629",
    captionsNote: "\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0645\u0635\u0627\u062D\u0628\u0629 \u062A\u0637\u0627\u0628\u0642 \u0644\u063A\u062A\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627",
    roleLabel: "\u0627\u0639\u0631\u0636 \u0628\u0635\u0641\u062A\u064A",
    visitor: "\u0632\u0627\u0626\u0631",
    member: "\u0639\u0636\u0648",
    admin: "\u0645\u0634\u0631\u0641",
    watchTab: "\u0645\u0631\u0635\u062F \u0627\u0644\u0630\u0643\u0627\u0621",
    send: "\u0625\u0631\u0633\u0627\u0644",
    spokenReplies: "\u0631\u062F\u0648\u062F \u0635\u0648\u062A\u064A\u0629",
    typing: "\u0645\u0633\u0627\u0639\u062F \u0643\u0627\u0644\u0648\u062A\u0627 \u064A\u0641\u0643\u0631\u2026",
    langChip: "\u0623\u062C\u064A\u0628 \u0628\u0640{lang}",
    deepLinkLabel: "\u0627\u0641\u062A\u062D \u0641\u064A \u0627\u0644\u062A\u0637\u0628\u064A\u0642"
  },
  zh: {
    placeholder: "\u8BE2\u95EE\u4EFB\u4F55\u529F\u80FD\u2026",
    listening: "\u6B63\u5728\u8046\u542C\u2026\u8BF7\u8BF4\u8BDD",
    voiceUnsupported: "\u6B64\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8F93\u5165\u2014\u2014\u6587\u5B57\u8F93\u5165\u5728\u4EFB\u4F55\u5730\u65B9\u90FD\u53EF\u7528\u3002",
    tabWritten: "\u56FE\u6587\u89E3\u7B54",
    tabVideo: "\u6F14\u793A\u89C6\u9891",
    openInApp: "\u5728\u5E94\u7528\u4E2D\u6253\u5F00",
    fromSource: "\u6765\u6E90",
    updated: "\u66F4\u65B0\u4E8E",
    suggestionsFor: "\u6B64\u5904\u70ED\u95E8",
    noInfo: "\u6211\u6682\u65F6\u6CA1\u6709\u5173\u4E8E\u8FD9\u4E2A\u95EE\u9898\u7684\u5DF2\u9A8C\u8BC1\u4FE1\u606F\u2014\u2014\u6211\u5B81\u53EF\u5982\u5B9E\u76F8\u544A\u4E5F\u4E0D\u731C\u6D4B\u3002\u53EF\u4EE5\u8BD5\u8BD5\u8BE2\u95EE\u4FE1\u606F\u6D41\u3001\u5BB6\u65CF\u6811\u3001\u7EAA\u5FF5\u56ED\u3001\u5E02\u573A\u3001\u8BA2\u9605\u3001\u5B89\u5168\u6216\u5F00\u53D1\u8005\u5E73\u53F0\u3002",
    adminRefusal: "\u8BE5\u4E3B\u9898\u4EC5\u9650\u7BA1\u7406\u5458\u8BBF\u95EE\uFF0C\u60A8\u5F53\u524D\u7684\u6743\u9650\uFF08{role}\uFF09\u4E0D\u5305\u62EC\u5B83\u3002\u6211\u7EDD\u4E0D\u4F1A\u5411\u975E\u7BA1\u7406\u5458\u89D2\u8272\u900F\u9732\u7BA1\u7406\u5458\u529F\u80FD\u2014\u2014\u5982\u679C\u60A8\u662F\u7BA1\u7406\u5458\uFF0C\u8BF7\u5207\u6362\u4E0A\u65B9\u7684\u89D2\u8272\u6F14\u793A\u6216\u6253\u5F00\u7BA1\u7406\u63A7\u5236\u53F0\u3002",
    escalateNote: "\u6211\u5DF2\u5C06\u6B64\u8BB0\u5F55\u4E3A\u63D0\u4EA4\u7ED9\u7BA1\u7406\u56E2\u961F\u7684\u5347\u7EA7\u8BF7\u6C42\u3002",
    videoTitle: "\u6F14\u793A\u5BFC\u89C8",
    captionsNote: "\u5B57\u5E55\u81EA\u52A8\u5339\u914D\u60A8\u7684\u8BED\u8A00",
    roleLabel: "\u4EE5\u8EAB\u4EFD\u67E5\u770B",
    visitor: "\u8BBF\u5BA2",
    member: "\u4F1A\u5458",
    admin: "\u7BA1\u7406\u5458",
    watchTab: "AI \u89C2\u5BDF",
    send: "\u53D1\u9001",
    spokenReplies: "\u8BED\u97F3\u56DE\u590D",
    typing: "Kaluta \u52A9\u624B\u601D\u8003\u4E2D\u2026",
    langChip: "\u6B63\u5728\u7528{lang}\u56DE\u590D",
    deepLinkLabel: "\u5728\u5E94\u7528\u4E2D\u6253\u5F00"
  }
};
function fmt(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
var MODULE_CONTEXTS = [
  { match: /^\/family/, moduleName: "Family Tree", suggestionIds: ["family-tree", "heritage-ai", "safety", "family-year-review"] },
  { match: /^\/memorials/, moduleName: "Digital Graveyard", suggestionIds: ["graveyard", "remembrance-gatherings", "family-tree", "privacy"] },
  { match: /^\/feeds/, moduleName: "Feeds", suggestionIds: ["feed-modes", "algorithm-marketplace", "translation"] },
  { match: /^\/creators/, moduleName: "Creator Studio", suggestionIds: ["creator-studio", "earnings", "subscriptions"] },
  { match: /^\/commerce/, moduleName: "Marketplace", suggestionIds: ["marketplace-margin", "advertising", "earnings", "commerce-copilot", "ad-creative-intel"] },
  { match: /^\/payments/, moduleName: "Payments", suggestionIds: ["crypto-payments", "cashout-engine", "payout-eligibility", "fiat-escrow-rail"] },
  { match: /^\/pricing/, moduleName: "Pricing", suggestionIds: ["subscriptions", "kyc", "earnings"] },
  { match: /^\/safety/, moduleName: "Safety & Privacy", suggestionIds: ["safety", "privacy", "crisis-alerts", "c2pa-signing", "voice-first", "early-warning"] },
  { match: /^\/developers/, moduleName: "Developer Platform", suggestionIds: ["developers", "a2a-registry", "verifiable-credentials", "training-licensing", "algorithm-marketplace", "subscriptions"] },
  { match: /^\/admin/, moduleName: "Admin Console", suggestionIds: ["admin-aiwatch", "admin-ledger", "admin-fraud", "admin-kyc-queue", "ai-quality-ops"] },
  { match: /^\/app/, moduleName: "Create", suggestionIds: ["creator-studio", "feed-modes", "onboarding-concierge", "wellbeing", "data-saver", "series"] },
  { match: /^\/platform/, moduleName: "Platform", suggestionIds: ["live-intelligence", "translation", "communities"] }
];
var DEFAULT_SUGGESTIONS = ["feed-modes", "family-tree", "crypto-payments"];
function contextForPath(pathname) {
  return MODULE_CONTEXTS.find((c) => c.match.test(pathname)) ?? null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_SUGGESTIONS,
  INGEST_LOG,
  KB_BY_ID,
  KB_ENTRIES,
  KB_LAST_SYNC,
  KB_VERSION,
  LANG_META,
  MODULE_CONTEXTS,
  UI_STRINGS,
  contextForPath,
  detectLanguage,
  fmt,
  matchEntry
});
