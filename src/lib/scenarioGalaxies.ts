import type { Lang } from './universe';
import { BASE } from './base.ts';
type Copy = { en: string; zh: string };
/** How a galaxy is laid out: steps in a line, a loop around the result, two groups, or one kit in the middle. */
export type GalaxyForm = 'lane' | 'ring' | 'binary' | 'hub';
export interface ScenarioGalaxy {
  id: string;
  form: GalaxyForm;
  /** the kit in the middle of a hub galaxy */
  hub?: string;
  name: Copy;
  summary: Copy;
  outcome: Copy;
  color: string;
  position: [number, number, number];
  kits: { kit: string; scenario: string }[];
  /** who proposed it, for a galaxy that came in through the galaxy form (CONTRIBUTING.md); none for the built-in ones */
  by?: { name: string; url?: string; github?: string };
  /** YYYY-MM-DD it was added (contributed galaxies) */
  added?: string;
}
const c = (en: string, zh: string): Copy => ({ en, zh });
const k = (kit: string, scenario: string) => ({ kit, scenario });
// A galaxy is a use case. Its planets are shared kits, linked to real kit scenarios.
export const scenarioGalaxies: ScenarioGalaxy[] = [
  { id:'business-review', form:'lane', name:c('Business Review','经营汇报'), color:'#ffbd73', position:[-170,0,20], summary:c('Make the numbers clear, explain the results and prepare the review.','把数字分析清楚，说明经营结果，准备汇报材料。'), outcome:c('Regional analysis, written report, review deck and annotated handoff.','区域分析、书面报告、汇报演示与审阅交付。'), kits:[k('sheet','sales-pivot'),k('doc','report'),k('slide','quarterly-review'),k('pdf','fill-sign')] },
  { id:'brand-studio', form:'ring', name:c('Brand Studio','品牌工作室'), color:'#bc9aff', position:[-130,0,-155], summary:c('Build a visual identity and carry it from the logo to the website.','从标志出发，把品牌视觉延伸到图像、界面和网站。'), outcome:c('A logo, product imagery, interface layouts and a landing-page preview.','品牌标志、产品图像、界面布局与落地页预览。'), kits:[k('vector','logo'),k('photo','product-retouch'),k('design','app-interface'),k('html','landing-page')] },
  { id:'research-lab', form:'lane', name:c('Research Lab','研究实验室'), color:'#75ddc9', position:[30,0,-190], summary:c('Connect sources, ideas and findings into a body of knowledge.','把来源、想法和发现连接成可追溯的知识体系。'), outcome:c('Searchable source documents, a linked wiki, a mind map and a research report.','可检索资料、关联知识库、思维导图与研究报告。'), kits:[k('pdf','searchable-scans'),k('note','research-wiki'),k('board','mind-map'),k('doc','report')] },
  { id:'editorial', form:'lane', name:c('Editorial Studio','编辑出版'), color:'#f0a4c8', position:[210,0,-180], summary:c('Shape an idea into an article, a publication and a shareable edition.','把想法整理成文章、出版物和可分享的版本。'), outcome:c('An illustrated draft, a report, magazine spreads and a reviewed PDF.','图文草稿、正式文稿、杂志跨页与审阅 PDF。'), kits:[k('note','design-doc'),k('doc','report'),k('layout','magazine'),k('pdf','redact')] },
  { id:'film-production', form:'binary', name:c('Film Production','影视制作'), color:'#a9b6dc', position:[345,0,-25], summary:c('Edit the story, create the titles and prepare the film’s key art.','剪辑叙事、制作动态包装，准备影片主视觉。'), outcome:c('An edited interview, animated lower thirds and a layered poster.','访谈剪辑、动态人名条与分层海报。'), kits:[k('film','interview-cut'),k('motion','lower-third'),k('photo','event-poster')] },
  { id:'social-campaign', form:'binary', name:c('Social Campaign','社媒传播'), color:'#f29bd6', position:[310,0,165], summary:c('Adapt one visual idea into images, motion and captioned clips.','让同一视觉创意延展为配图、动态内容与字幕短片。'), outcome:c('Brand illustrations, social images, motion titles and short videos.','品牌插画、社媒配图、动态标题与短视频。'), kits:[k('vector','recolor'),k('photo','social-set'),k('motion','title'),k('film','captioned-clip')] },
  { id:'architecture', form:'hub', hub:'cad', name:c('Architecture','建筑与空间'), color:'#8ac8dc', position:[165,0,280], summary:c('Explore a space from the first diagram to drawings and a 3D scene.','从概念图到平面图、三维场景和空间展示。'), outcome:c('A spatial mind map, a floor plan, a room scene and a presentation brochure.','空间思维图、户型平面图、房间场景与展示手册。'), kits:[k('board','mind-map'),k('cad','floor-plan'),k('scene','room-scene'),k('layout','brochure')] },
  { id:'product-design', form:'ring', name:c('Product Design','产品设计'), color:'#dbaa78', position:[-20,0,300], summary:c('Develop a physical product through drawings, models and visual presentation.','通过工程图、模型和视觉展示推进实体产品设计。'), outcome:c('Dimensioned drawings, a lit 3D model, retouched imagery and a product brochure.','尺寸工程图、布光模型、精修图像与产品手册。'), kits:[k('cad','part'),k('scene','product-model'),k('photo','product-retouch'),k('layout','brochure')] },
  { id:'team-planning', form:'hub', hub:'table', name:c('Team Planning','团队协作'), color:'#83db9c', position:[-210,0,245], summary:c('Turn a team conversation into a shared plan and a review.','把团队讨论整理成共同计划与复盘。'), outcome:c('Reviewed notes, a delivery tracker, a retrospective board and a review deck.','审阅记录、交付跟踪表、复盘白板与汇报演示。'), kits:[k('note','meeting-notes'),k('table','task-tracker'),k('board','retro'),k('slide','quarterly-review')] },
  { id:'client-workspace', form:'hub', hub:'table', name:c('Client Workspace','客户工作台'), color:'#7cbedf', position:[-345,0,85], summary:c('Keep client relationships, agreements and project budgets connected.','把客户关系、合作协议与项目预算组织在一起。'), outcome:c('A client CRM, reviewed contracts, signed forms and a monthly budget.','客户 CRM、审阅合同、签署表单与月度预算。'), kits:[k('table','client-crm'),k('doc','contract-review'),k('pdf','fill-sign'),k('sheet','budget')] },
  { id:'learning-studio', form:'hub', hub:'note', name:c('Learning Studio','教学工作室'), color:'#d4ca7e', position:[-330,0,-120], summary:c('Turn research into a lesson people can read, watch and explore.','把研究内容组织成可阅读、观看和探索的课程。'), outcome:c('A course wiki, a concept map, a multimedia deck and captioned lessons.','课程知识库、概念图、多媒体课件与字幕视频。'), kits:[k('note','research-wiki'),k('board','mind-map'),k('slide','training-deck'),k('film','captioned-clip')] },
  { id:'web-experiences', form:'ring', name:c('Web Experiences','网站与界面'), color:'#8fafff', position:[-110,0,-335], summary:c('Explore an interface from components and prototypes to responsive previews.','从组件、原型到响应式预览，探索完整界面体验。'), outcome:c('A connected prototype, an icon set, responsive layouts and web imagery.','交互原型、图标集、响应式布局与网站图像。'), kits:[k('design','connected-prototype'),k('vector','icon-set'),k('html','responsive-page'),k('photo','social-set')] },
];
/** What someone would say they want to do; the task bar offers these as shortcuts. */
export const scenarioAsks: Record<string, Copy> = {
  'business-review': c('Prepare a quarterly review', '做季度经营汇报'),
  'brand-studio': c('Design a brand', '设计一套品牌'),
  'research-lab': c('Organise my research', '整理研究资料'),
  editorial: c('Publish a magazine feature', '出版一篇杂志专题'),
  'film-production': c('Cut an interview film', '剪一条访谈片'),
  'social-campaign': c('Run a social campaign', '做一轮社媒传播'),
  architecture: c('Plan a room and draw it', '画户型、搭房间'),
  'product-design': c('Design a physical product', '设计一件实体产品'),
  'team-planning': c('Plan a project with my team', '和团队排项目计划'),
  'client-workspace': c('Keep track of clients and contracts', '管理客户和合同'),
  'learning-studio': c('Build a course', '做一门课程'),
  'web-experiences': c('Prototype a website', '做网站原型'),
};
export const GALAXY_COUNT = scenarioGalaxies.length + 2;
export const scenarioHref = (lang: Lang, id?: string) => `${BASE}${lang === 'zh' ? '/zh' : ''}/scenarios/${id ? id + '/' : ''}`;
export const scenarioGalaxy = (id: string) => scenarioGalaxies.find(g => g.id === id);
export const legacyScenario = (id: string | null) => (({ report:'business-review', brand:'brand-studio', knowledge:'research-lab' } as Record<string,string>)[id || ''] || 'business-review');
