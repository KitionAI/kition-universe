// Interface strings for "Built with Kition" (/built-with/ and the settlement
// lists). Copy that also appears on the star map lives in data/universe.yaml
// under productGalaxy; product facts live in data/products.yaml.
import type { Lang } from '../lib/universe';
import { KIT_COUNT } from '../lib/kits';
import type { Category, Product } from '../lib/products';

const en = {
  'bw.name': 'Built with Kition',
  'bw.settlement': 'Product planet',
  'bw.settlements': 'Product planets',
  // list
  'bw.title': 'Built with Kition: products built on the Kition kits',
  'bw.description':
    'Built with Kition lists products made on the {total} Kition kits with the Kition SDK. Free to submit and list, no paid ranking, every product planet the same size.',
  'bw.sdkLine': 'Built on the {sdk} ({license}).',
  'bw.badgeLink': 'Get the badge',
  'bw.rules':
    'Free to submit, free to list. No paid ranking and no featured slots: editor’s picks come first, then the newest, and every product planet is shown at the same size.',
  'bw.notEndorsement':
    'A listing is not an endorsement. Kition does not review, audit or vouch for products made by others; check them yourself before you rely on them.',
  'bw.filters': 'Filter product planets',
  'bw.filterKit': 'Kit',
  'bw.filterDelivery': 'Delivery',
  'bw.filterCategory': 'Category',
  'bw.any': 'Any',
  'bw.clear': 'Clear filters',
  'bw.showing': 'Showing {n} of {total}',
  'bw.empty': 'No product planet matches these filters yet.',
  'bw.byKition': 'by Kition',
  'bw.pick': 'Editor’s pick',
  'bw.paused': 'Paused',
  'bw.preview': 'Preview',
  'bw.previewBody': 'This product is in development. The description below covers its current capabilities and limits.',
  'bw.d.exploreKits': 'Explore the kits it uses',
  'bw.pausedBody': 'This product is paused. Its page stays online, but it has left the star map and the lists.',
  'bw.kits': 'Kits',
  'bw.open': 'Open {name}',
  // detail
  'bw.d.title': '{name}: {tagline}',
  'bw.d.visit': 'Visit {name}',
  'bw.d.source': 'Source code',
  'bw.d.facts': 'Facts',
  'bw.d.kits': 'Kits it uses',
  'bw.d.delivery': 'How it uses them',
  'bw.d.collab': 'Collaboration',
  'bw.d.category': 'Category',
  'bw.d.author': 'Made by',
  'bw.d.open': 'Open source',
  'bw.d.added': 'Listed',
  'bw.d.checked': 'Last checked',
  'bw.d.others': 'Other product planets that use the same kit',
  'bw.d.report': 'Report a listing',
  'bw.d.reportBody': 'Broken link, missing badge or wrong facts? Open a report on GitHub.',
  'bw.d.back': 'All product planets',
  'bw.d.screenshot': 'Screenshot of {name}',
  // badge
  'bw.badge.title': 'The Built with Kition badge',
  'bw.badge.h1': 'The Built with Kition badge',
  'bw.badge.sub':
    'Put the badge on your product page, linked back to Kition Universe, and your product can be listed as a product planet.',
  'bw.badge.dark': 'Dark badge',
  'bw.badge.light': 'Light badge',
  'bw.badge.forDark': 'for dark pages',
  'bw.badge.forLight': 'for light pages',
  'bw.badge.html': 'HTML',
  'bw.badge.md': 'Markdown',
  'bw.badge.download': 'Download SVG',
  'bw.badge.condition':
    'The badge is a condition for being listed here, not for using the Kition SDK. The SDK is Apache-2.0: use it with or without the badge.',
  'bw.badge.files':
    'The badge is a plain SVG file: no scripts, no tracking parameters, no external fonts. Keep the wording as it is and do not add other trademarks to it.',
  'bw.badge.next': 'Badge in place? Add your product planet.',
  'bw.copy': 'Copy',
  'bw.copied': 'Copied',
  // submit
  'bw.submit.title': 'Add your product planet to Built with Kition',
  'bw.submit.howTitle': 'How listing works',
  'bw.submit.step1': 'Open the issue form',
  'bw.submit.step1Body':
    'Fill in the form on GitHub: name, link, tagline, the kits you use and how you deliver them. It is free.',
  'bw.submit.step2': 'Automated check',
  'bw.submit.step2Body':
    'A check reads the form: the link opens, the badge is on the page and links back, the kits are real and no field breaks the rules.',
  'bw.submit.step3': 'A maintainer merges it',
  'bw.submit.step3Body':
    'A maintainer adds the entry to data/products.yaml. After the next deploy your product planet shows up here, on the planet of every kit it uses and in the Product Galaxy.',
  'bw.submit.rulesTitle': 'The rules',
  'bw.submit.r1': 'Free to submit and free to list. No paid ranking, featured slots, ads or paywalls, now or later.',
  'bw.submit.r2': 'Your product is public, it works, and its page shows the Built with Kition badge linking back.',
  'bw.submit.r3': 'Editor’s picks first, then the newest. Every product planet is shown at the same size.',
  'bw.submit.r4': 'No invented numbers, reviews or user counts. Fields you leave out are simply not shown.',
  'bw.submit.r5': 'No other company’s trademarks (Office, Adobe, Photoshop and so on) in your product planet name, badge or logo.',
  'bw.submit.r6': 'Links to your site carry rel="nofollow ugc" until the badge has been checked.',
  'bw.submit.r7': 'Products that stop working are marked paused or removed. A listing is not an endorsement.',
  'bw.submit.cta': 'Open the form on GitHub',
  'bw.submit.sdkTitle': 'Four ways to use a kit',
  // planet + catalog
  'bw.onPlanet': 'Product planets that use this kit',
  'bw.onPlanetSub': 'Products built with this kit. Every product planet is the same size, no paid spots.',
  'bw.catalogLine': 'Product planets:',
  'footer.builtWith': 'Built with Kition',
};

type Key = keyof typeof en;

const zh: Record<Key, string> = {
  'bw.name': 'Built with Kition',
  'bw.settlement': '产品星球',
  'bw.settlements': '产品星球',
  'bw.title': 'Built with Kition：用 Kition kit 搭出来的产品',
  'bw.description': 'Built with Kition 收录用 Kition SDK 在 {total} 个 Kition kit 上搭出来的产品。免费提交、免费登记，没有付费排名，所有产品星球一样大。',
  'bw.sdkLine': '基于 {sdk}（{license}）。',
  'bw.badgeLink': '获取徽章',
  'bw.rules': '免费提交，免费登记。没有付费排名，没有推荐位：编辑精选在前，其余按登记时间从新到旧，所有产品星球一样大。',
  'bw.notEndorsement': '登记不代表背书。Kition 不审核、不担保其他人做的产品，使用前请自行判断。',
  'bw.filters': '筛选产品星球',
  'bw.filterKit': 'Kit',
  'bw.filterDelivery': '接入方式',
  'bw.filterCategory': '类别',
  'bw.any': '全部',
  'bw.clear': '清除筛选',
  'bw.showing': '显示 {n} / {total}',
  'bw.empty': '还没有符合这些条件的产品星球。',
  'bw.byKition': 'Kition 出品',
  'bw.pick': '编辑精选',
  'bw.paused': '已暂停',
  'bw.preview': '产品预览',
  'bw.previewBody': '这个产品仍在开发中，以下介绍说明当前能力与可用范围。',
  'bw.d.exploreKits': '探索它使用的 Kit',
  'bw.pausedBody': '这个产品已暂停。页面仍然保留，但它已离开星图和列表。',
  'bw.kits': 'Kit',
  'bw.open': '打开 {name}',
  'bw.d.title': '{name}：{tagline}',
  'bw.d.visit': '访问 {name}',
  'bw.d.source': '源代码',
  'bw.d.facts': '基本信息',
  'bw.d.kits': '用到的 kit',
  'bw.d.delivery': '接入方式',
  'bw.d.collab': '协作',
  'bw.d.category': '类别',
  'bw.d.author': '作者',
  'bw.d.open': '开源仓库',
  'bw.d.added': '登记于',
  'bw.d.checked': '最近检查',
  'bw.d.others': '用到同一个 Kit 的其他产品星球',
  'bw.d.report': '举报这条登记',
  'bw.d.reportBody': '链接失效、徽章不见了或者信息不对？到 GitHub 提交举报。',
  'bw.d.back': '全部产品星球',
  'bw.d.screenshot': '{name} 截图',
  'bw.badge.title': 'Built with Kition 徽章',
  'bw.badge.h1': 'Built with Kition 徽章',
  'bw.badge.sub': '把徽章放到你的产品页面上，并链接回 Kition Universe，你的产品就可以登记为产品星球。',
  'bw.badge.dark': '深色徽章',
  'bw.badge.light': '浅色徽章',
  'bw.badge.forDark': '用于深色页面',
  'bw.badge.forLight': '用于浅色页面',
  'bw.badge.html': 'HTML',
  'bw.badge.md': 'Markdown',
  'bw.badge.download': '下载 SVG',
  'bw.badge.condition': '徽章是在这里登记的条件，不是使用 Kition SDK 的条件。SDK 以 Apache-2.0 开源，放不放徽章都可以用。',
  'bw.badge.files': '徽章是纯 SVG 文件：没有脚本、没有追踪参数、不加载外部字体。请不要改动文字，也不要往里加其他商标。',
  'bw.badge.next': '徽章放好了？来登记你的产品星球。',
  'bw.copy': '复制',
  'bw.copied': '已复制',
  'bw.submit.title': '把你的产品星球登记到 Built with Kition',
  'bw.submit.howTitle': '登记流程',
  'bw.submit.step1': '填写 issue 表单',
  'bw.submit.step1Body': '在 GitHub 上填表：名称、链接、一句话介绍、用到的 kit 和接入方式。完全免费。',
  'bw.submit.step2': '自动检查',
  'bw.submit.step2Body': '自动检查会读取表单：链接能打开，页面上有链回来的徽章，kit 真实存在，没有字段违反规则。',
  'bw.submit.step3': '维护者合并',
  'bw.submit.step3Body': '维护者把条目加进 data/products.yaml。下次部署后，你的产品星球会出现在这里、出现在它用到的每个 kit 的星球上，也会出现在产品星系里。',
  'bw.submit.rulesTitle': '规则',
  'bw.submit.r1': '免费提交，免费登记。没有付费排名、推荐位、广告或付费墙，以后也不会有。',
  'bw.submit.r2': '产品是公开的、能用的，页面上有链回来的 Built with Kition 徽章。',
  'bw.submit.r3': '编辑精选在前，其余从新到旧。所有产品星球一样大。',
  'bw.submit.r4': '不编造数字、评价或用户数。你没填的字段就不显示。',
  'bw.submit.r5': '产品星球名称、徽章和 logo 里不能有其他公司的商标（Office、Adobe、Photoshop 等）。',
  'bw.submit.r6': '在徽章核实之前，指向你网站的链接带 rel="nofollow ugc"。',
  'bw.submit.r7': '不能用了的产品会被标记为暂停或移除。登记不代表背书。',
  'bw.submit.cta': '到 GitHub 填写表单',
  'bw.submit.sdkTitle': '使用 kit 的四种方式',
  'bw.onPlanet': '用这个 Kit 的产品星球',
  'bw.onPlanetSub': '用这个 kit 做出来的产品。每个产品星球一样大，没有付费位置。',
  'bw.catalogLine': '产品星球：',
  'footer.builtWith': 'Built with Kition',
};

const dict: Record<Lang, Record<Key, string>> = { en, zh };

export function bw(lang: Lang) {
  return (key: Key, vars: Record<string, string | number> = {}) =>
    dict[lang][key].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? (k === 'total' ? KIT_COUNT : `{${k}}`)));
}

const categories: Record<Category, { en: string; zh: string }> = {
  office: { en: 'Office', zh: '办公' },
  design: { en: 'Design', zh: '设计' },
  video: { en: 'Video', zh: '视频' },
  engineering: { en: 'Engineering', zh: '工程' },
  education: { en: 'Education', zh: '教育' },
  'developer-tools': { en: 'Developer tools', zh: '开发者工具' },
  'ai-agent': { en: 'AI agents', zh: 'AI Agent' },
  other: { en: 'Other', zh: '其他' },
};
export const categoryName = (c: Category, lang: Lang) => categories[c][lang];

const collabs: Record<NonNullable<Product['collab']>, { en: string; zh: string }> = {
  none: { en: 'Single user, no real-time collaboration', zh: '单人使用，无实时协作' },
  cloud: { en: 'Real-time collaboration in the cloud', zh: '云端实时协作' },
  server: { en: 'Real-time collaboration on your own server', zh: '在自己的服务器上实时协作' },
};
export const collabName = (c: NonNullable<Product['collab']>, lang: Lang) => collabs[c][lang];
