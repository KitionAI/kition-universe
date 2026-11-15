import type { Lang } from './universe';

type Copy = { en: string; zh: string };
export interface MissionStep {
  kit: string;
  capability: string;
  title: Copy;
  action: Copy;
  output: Copy;
  review: Copy;
  file: string;
}
export interface Mission {
  id: string;
  number: string;
  color: string;
  title: Copy;
  summary: Copy;
  brief: Copy;
  input: Copy;
  result: Copy;
  steps: MissionStep[];
}
const c = (en: string, zh: string): Copy => ({ en, zh });
export const MISSION_POSITION: [number, number, number] = [-180, 0, 28];
export const MISSION_NAME = c('Mission Galaxy', '任务星系');
export const MISSION_DESCRIPTION = c('Explore three illustrated AI workflows across Kition kits. Play a route, inspect each example artifact and review the handoff.', '探索三条跨 Kit 的 AI 工作流演示：播放航线，查看每一步的示例产物，再审阅交付。');
export const missions: Mission[] = [
  {
    id: 'report', number: '01', color: '#ffbe78',
    title: c('From data to a story', '从数据到汇报'),
    summary: c('Turn a small dataset into a clear report and presentation.', '把一组数据，整理成讲得清楚的报告与演示。'),
    brief: c('Prepare a monthly operations review from the sample regional data. Keep the numbers traceable and the conclusions concise.', '根据示例区域数据准备月度经营汇报。数字需要可追溯，结论要简洁，并保留人工核对环节。'),
    input: c('Sample CSV · 3 regions · 2 months', '示例 CSV · 3 个区域 · 2 个月'),
    result: c('Analysis, report, presentation and annotated PDF', '分析表、报告、演示文稿与批注 PDF'),
    steps: [
      { kit: 'sheet', capability: 'charts', title: c('Find the signal', '分析数据'), action: c('Compare the two months and plot each region’s contribution.', '比较两个月的数据，整理各区域的贡献与变化。'), output: c('A comparison table and a chart using preset sample values.', '使用预设示例数据的对照表与图表。'), review: c('Check the units, formula ranges and the 42 → 54 total.', '核对单位、公式范围，以及合计从 42 到 54 的变化。'), file: 'regional-review.xlsx' },
      { kit: 'doc', capability: 'layout', title: c('Build the argument', '撰写报告'), action: c('Organize the findings into a summary, evidence and next actions.', '把发现组织成摘要、依据和下一步行动。'), output: c('A report outline that refers back to the sample table.', '引用示例分析表的报告结构。'), review: c('Separate observed changes from proposed explanations.', '区分数据事实与原因推测，检查引用是否一致。'), file: 'monthly-review.docx' },
      { kit: 'slide', capability: 'stage', title: c('Tell the story', '组织演示'), action: c('Give the main finding its own slide, followed by evidence and actions.', '将关键发现、数据依据和行动建议拆成演示页面。'), output: c('A presentation storyboard with one finding per slide.', '每页一个重点的演示分镜。'), review: c('Check chart labels, text size and the narrative order.', '检查图表标注、字号与叙事顺序。'), file: 'monthly-review.kslide' },
      { kit: 'pdf', capability: 'forms', title: c('Review the handoff', '审阅交付'), action: c('Review an example PDF handoff and mark the items that need confirmation.', '在示例 PDF 交付稿上标出需要确认的内容。'), output: c('An annotated handoff preview, ready for human review.', '带审阅标记的交付示意，等待人工确认。'), review: c('Confirm the figures and conclusions before sharing.', '确认关键数字、结论和页面完整性后再分享。'), file: 'monthly-review.pdf' },
    ],
  },
  {
    id: 'brand', number: '02', color: '#bb9bff',
    title: c('From brand to website', '从品牌到网站'),
    summary: c('Give a fictional orbital observatory a coherent visual identity.', '为虚构的轨道观测站建立统一的视觉形象。'),
    brief: c('Create an identity and landing-page concept for ORBIT, a fictional observatory. Carry its visual language from a vector mark to a responsive page.', '为虚构的 ORBIT 观测站构思品牌与落地页，让标识、视觉素材、界面和网页延续同一套语言。'),
    input: c('Fictional ORBIT brief · supplied space image', '虚构 ORBIT 品牌简报 · 已有深空素材'),
    result: c('Vector identity, image treatment, interface and page preview', '矢量标识、视觉素材、界面与网页预览'),
    steps: [
      { kit: 'vector', capability: 'paths', title: c('Shape the identity', '构建标识'), action: c('Explore a geometric orbit symbol with a simple wordmark.', '用几何轨道构建标识，配上简洁的文字组合。'), output: c('An orbital mark and a small color palette.', '轨道标识与一组品牌颜色。'), review: c('Check silhouette, small-size legibility and contrast.', '检查轮廓、小尺寸辨识度和对比度。'), file: 'orbit-identity.kvector' },
      { kit: 'photo', capability: 'adjust', title: c('Set the atmosphere', '处理视觉'), action: c('Use the supplied space image as a background and tune its contrast.', '将已有深空素材作为背景，调整色调与对比度。'), output: c('An illustrative hero composition using the existing image.', '使用已有素材构成的首屏视觉示意。'), review: c('Keep enough contrast behind text and preserve source layers.', '确保文字区域可读，并保留素材图层。'), file: 'orbit-hero.psd' },
      { kit: 'design', capability: 'layout', title: c('Design the interface', '设计界面'), action: c('Arrange the hero, navigation and observation cards as reusable frames.', '组织首屏、导航和观测卡片，构思可复用的布局。'), output: c('An interface layout with reusable card patterns.', '包含重复卡片结构的界面布局示意。'), review: c('Check spacing, reading order and component consistency.', '检查间距、阅读顺序与组件一致性。'), file: 'orbit-interface.kdesign' },
      { kit: 'html', capability: 'viewport', title: c('Preview the page', '预览网页'), action: c('Inspect an illustrative page at desktop and mobile widths.', '查看桌面和手机宽度下的页面示意。'), output: c('A responsive page concept. Design and HTML are preview kits; this is not an automatic export pipeline.', '响应式页面概念。Design 和 HTML 为预览 Kit，此处演示工作流构想，不代表自动转换已接通。'), review: c('Review layout and assets at both widths; verify browser behavior separately.', '核对两种宽度的布局与素材，并单独验证浏览器表现。'), file: 'orbit.html' },
    ],
  },
  {
    id: 'knowledge', number: '03', color: '#77dbc8',
    title: c('From sources to knowledge', '从资料到知识库'),
    summary: c('Connect documents, notes and a source index into a navigable map.', '把资料、笔记和来源索引连接成可探索的知识地图。'),
    brief: c('Organize three fictional observation notes into a small knowledge base. Keep references attached to every conclusion.', '将三份虚构观测记录整理成小型知识库，每个结论都保留可追溯的来源。'),
    input: c('3 fictional observation documents', '3 份虚构观测资料'),
    result: c('Reviewed sources, linked notes, index and relationship map', '审阅资料、关联笔记、来源索引与关系图'),
    steps: [
      { kit: 'pdf', capability: 'forms', title: c('Read the sources', '审阅资料'), action: c('Mark relevant passages and note the page that supports each claim.', '标注相关段落，记录每条信息对应的来源页。'), output: c('Three fictional source excerpts with review annotations.', '三份虚构来源摘录与审阅标记。'), review: c('Check context and preserve the exact source reference.', '核对上下文，并保留准确的来源位置。'), file: 'observation-notes.pdf' },
      { kit: 'note', capability: 'links', title: c('Connect the notes', '关联笔记'), action: c('Write concise notes and connect related observations with links.', '将观察整理成简短笔记，并连接相关主题。'), output: c('Linked notes about orbit, light and observation windows.', '围绕轨道、光照与观测窗口的关联笔记。'), review: c('Keep facts and interpretations distinct; test each source link.', '区分事实和解读，检查来源链接。'), file: 'observation-index.md' },
      { kit: 'table', capability: 'fields', title: c('Index the evidence', '建立索引'), action: c('Organize sources by topic, reference and review state.', '按主题、来源位置和审阅状态整理资料。'), output: c('A structured source index with three example records.', '包含三条示例记录的结构化来源索引。'), review: c('Look for missing references and duplicate records.', '检查缺失来源、重复记录与字段一致性。'), file: 'source-index.ktable' },
      { kit: 'board', capability: 'connectors', title: c('Map the relationships', '绘制关系'), action: c('Connect the topics on a board and explain each relationship.', '在白板上连接主题，为每条关系补充含义。'), output: c('An explorable relationship-map concept.', '可供讨论和审阅的关系图示意。'), review: c('Check that every connection is supported by a source.', '确认每条关系都有依据，标明尚待验证的推断。'), file: 'observation-map.kboard' },
    ],
  },
];

export const missionCopy = (lang: Lang) => ({
  name: MISSION_NAME[lang],
  description: MISSION_DESCRIPTION[lang],
  demo: lang === 'zh' ? '交互演示' : 'INTERACTIVE DEMO',
  control: lang === 'zh' ? 'AI 任务控制中心' : 'AI Mission Control',
  explore: lang === 'zh' ? '查看任务航线' : 'Explore the flight plan',
});
