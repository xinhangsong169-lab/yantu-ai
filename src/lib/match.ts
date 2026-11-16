import type { Profile, Project } from '../types';

export type FitStatus = 'recorded' | 'missing' | 'unconfirmed';

export type FitRow = {
  item: string;
  status: FitStatus;
  detail: string;
};

const CHECKS: { item: string; announce: RegExp; have: RegExp; recorded: string; missing: string }[] = [
  {
    item: '硕士学历',
    announce: /硕士|研究生/,
    have: /硕士/,
    recorded: '档案里的学历是硕士研究生。',
    missing: '公告提到硕士或研究生，档案里还没有写学历。'
  },
  {
    item: '计算机相关专业',
    announce: /计算机/,
    have: /计算机/,
    recorded: '档案专业里包含计算机。',
    missing: '公告提到计算机，档案专业里还没有这项。'
  },
  {
    item: 'Python',
    announce: /Python/i,
    have: /Python/i,
    recorded: '技能档案里写了 Python。',
    missing: '公告要求 Python，技能档案里还没有。'
  },
  {
    item: 'PyTorch',
    announce: /PyTorch|pytorch/,
    have: /PyTorch|pytorch/,
    recorded: '技能档案里写了 PyTorch。',
    missing: '公告要求 PyTorch，技能档案里还没有。'
  },
  {
    item: '检索或 RAG 经历',
    announce: /RAG|检索|多模态/,
    have: /RAG|检索|多模态/,
    recorded: '研究方向或项目记录里有检索、多模态或 RAG。',
    missing: '公告希望有检索或 RAG 经历，当前项目和技能里还没有写到。'
  },
  {
    item: '模型部署',
    announce: /部署|推理服务|工程化/,
    have: /部署|ONNX|TensorRT|服务化/i,
    recorded: '档案或项目里写过部署相关经历。',
    missing: '公告写了部署或工程化要求，档案和项目里还没有对应记录。'
  }
];

export function fitAnnouncement(text: string, profile: Profile, projects: Project[]): FitRow[] {
  const archive = [
    profile.school,
    profile.degree,
    profile.major,
    profile.year,
    profile.graduation,
    profile.direction,
    profile.skills,
    profile.careerGoal,
    ...projects.flatMap((project) => [project.title, project.description, project.goal, ...(project.tags || [])])
  ]
    .filter(Boolean)
    .join('\n');
  const rows: FitRow[] = [];
  for (const check of CHECKS) {
    if (!check.announce.test(text)) continue;
    rows.push({
      item: check.item,
      status: check.have.test(archive) ? 'recorded' : 'missing',
      detail: check.have.test(archive) ? check.recorded : check.missing
    });
  }
  const graduationLine = text
    .split('\n')
    .filter((line) => /毕业|届/.test(line))
    .join('\n');
  const years = [...new Set(graduationLine.match(/20\d{2}/g) || [])];
  if (years.length) {
    const graduation = profile.graduation || '';
    rows.push({
      item: '毕业年份',
      status: graduation && years.includes(graduation) ? 'recorded' : graduation ? 'missing' : 'unconfirmed',
      detail: graduation
        ? `档案毕业年份是 ${graduation}。公告这几句里出现 ${years.join('、')}，请再对照“届别”原文。`
        : '公告写了毕业年份，档案里还没填。'
    });
  }
  if (/政治面貌|中共党员|党员|学生干部/.test(text)) {
    rows.push({
      item: '资格条件',
      status: 'unconfirmed',
      detail: '公告提到政治面貌、党员或学生干部，档案里尚未填写。'
    });
  }
  return rows;
}
