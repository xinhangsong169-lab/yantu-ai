export function demoRecords() {
  const date='2026-11-11', projectId='demo-project';
  const record='导师：先核对检索数据集中的重复样本和标签分布。固定数据划分和计算预算，比较基线与改进模型。下周组会前整理结果表，保留没有提升的结果，不要只汇报最好的一个数。';
  return {
    profile:[{id:'profile',name:'林同学',school:'示范大学（演示）',degree:'硕士研究生',major:'计算机科学与技术',year:'研二',graduation:'2028',direction:'多模态检索与 RAG',skills:'Python、PyTorch',careerGoal:'算法实习',locations:'上海、杭州',weeklyGoal:'完成检索基线对照实验'}],
    projects:[{id:projectId,title:'面向复杂查询的多模态检索',description:'研究如何在有限计算预算下提升图文检索质量。',goal:'完成公平的基线对照，明确收益来源',stage:'实验验证',status:'active',tags:['多模态检索','RAG'],nextStep:'固定数据划分，补齐同预算基线',question:'在固定计算预算下，怎样提高复杂查询的图文检索质量？',baseline:'同数据划分、同候选集合、同计算预算的现有检索模型',metric:'Recall@10',stageQuestion:'数据划分固定之后，基线对照有没有超过现有模型？'}],
    courses:[
      {id:'demo-course-ml',title:'高级机器学习',teacher:'陈老师',location:'信息楼 A301',weekday:3,start:'14:00',end:'15:40',weeks:'1-16',attendance:'课堂签到；请以教师最新通知为准',grading:'平时 30% · 期末 70%',source:'演示教学大纲（示例）'},
      {id:'demo-course-math',title:'最优化理论与方法',teacher:'王老师',location:'理科楼 B204',weekday:1,start:'10:00',end:'11:40',weeks:'1-16',attendance:'随堂练习计入平时成绩',grading:'作业 40% · 期末 60%',source:'演示教学大纲（示例）'},
      {id:'demo-course-writing',title:'学术写作与表达',teacher:'李老师',location:'研学楼 202',weekday:5,start:'09:00',end:'10:40',weeks:'1-12',attendance:'请假需提前联系老师',grading:'课堂展示 40% · 课程论文 60%',source:'演示课程说明（示例）'}
    ],
    meetings:[{id:'demo-meeting',title:'检索项目阶段进展讨论',date:'2026-11-06',projectId,record,summary:'优先核对数据质量，再在固定预算下完成对照实验；下次带上完整结果和未解决的问题。',requirements:[{text:'核对重复样本与标签分布',evidence:'先核对检索数据集中的重复样本和标签分布。'},{text:'固定划分和计算预算做对照',evidence:'固定数据划分和计算预算，比较基线与改进模型。'},{text:'下次汇报保留负面结果',evidence:'下周组会前整理结果表，保留没有提升的结果，不要只汇报最好的一个数。'}],questions:['具体的同预算上限需在实验前确认'],confirmed:true}],
    tasks:[
      {id:'demo-task-data',title:'核对数据集重复样本与标签分布',description:'整理去重统计和标签分布，保存检查脚本与结果。',sourceType:'meeting',sourceId:'demo-meeting',projectId,dueAt:'2026-11-10',priority:'high',status:'done',evidence:'先核对检索数据集中的重复样本和标签分布。'},
      {id:'demo-task-baseline',title:'补齐同预算基线对照实验',description:'固定数据划分、候选集合与计算预算；记录完整设置。',sourceType:'meeting',sourceId:'demo-meeting',projectId,dueAt:'2026-11-12',priority:'high',status:'doing',evidence:'固定数据划分和计算预算，比较基线与改进模型。'},
      {id:'demo-task-report',title:'整理下次组会的完整结果表',description:'包含正面、负面结果，汇报未解决的问题和下一步判断。',sourceType:'meeting',sourceId:'demo-meeting',projectId,dueAt:'2026-11-13',priority:'high',status:'todo',evidence:'下周组会前整理结果表，保留没有提升的结果，不要只汇报最好的一个数。'},
      {id:'demo-task-course',title:'完成机器学习课程实验报告',description:'提交前核对实验分析与引用。',sourceType:'course',sourceId:'demo-course-ml',dueAt:'2026-11-15',priority:'medium',status:'todo',evidence:'演示课程作业（示例）'}
    ],
    papers:[{id:'demo-paper',title:'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',authors:'Lewis et al.',year:'2020',url:'https://arxiv.org/abs/2005.11401',projectId,note:'阅读笔记示例：区分检索质量与生成质量，实验需要分别记录。',status:'reading',answers:'检索质量和生成质量要分开记，不能用一个总分代替检索。',method:'先检索，再把检索到的材料交给生成。',gap:'还没有在当前课题的数据划分上核对这篇的设置。'}],
    experiments:[{id:'demo-experiment',title:'检索数据质量检查',projectId,date:'2026-11-10',meetingId:'demo-meeting',change:'核对重复样本和标签分布',control:'固定数据划分',metric:'',delta:'',flat:'还没有跑对照，不能说有没有提升',next:'补齐同预算基线',evidence:'先核对检索数据集中的重复样本和标签分布。',setup:'固定数据划分；核对重复样本和标签分布。',result:'',conclusion:'下一步先确认数据划分，再执行同预算对照。'}],
    memories:[
      {id:'demo-memory-direction',key:'当前研究方向',value:'多模态检索与 RAG',domain:'research',sourceType:'profile',sourceId:'profile',sourceLabel:'演示个人档案',confirmed:true,active:true,updatedAt:date},
      {id:'demo-memory-feedback',key:'最近的导师要求',value:'固定数据划分和计算预算，比较基线与改进模型。',domain:'meetings',sourceType:'meeting',sourceId:'demo-meeting',sourceLabel:'11 月 6 日组会 · 演示记录',confirmed:true,active:true,updatedAt:date},
      {id:'demo-memory-career',key:'职业目标',value:'优先探索上海、杭州的算法实习',domain:'career',sourceType:'profile',sourceId:'profile',sourceLabel:'演示个人档案',confirmed:true,active:true,updatedAt:date}
    ],opportunities:[],conversations:[]
  };
}
export async function initialize(store, owner, mode='demo', force=false) {
  if (!force && await store.get(owner,'_meta','settings')) return;
  const records=mode==='demo'?demoRecords():{profile:[{id:'profile',name:'同学',degree:'硕士研究生'}]};
  const operations=[];
  for (const [collection,items] of Object.entries(records)) for (const record of items) operations.push({type:'put',collection,record});
  operations.push({type:'put',collection:'_meta',record:{id:'settings',demo:mode==='demo',initializedAt:new Date().toISOString()}});
  await store.batch(owner,operations);
}
