const dayNames={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:7};
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d=new Date(`${value}T00:00:00Z`); return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===value;
}
export function validTime(value) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function validateCourse(course) {
  if (!course.title?.trim()) throw new Error('课程名称不能为空');
  if (!Number.isInteger(Number(course.weekday)) || +course.weekday<1 || +course.weekday>7) throw new Error('星期必须是 1 到 7');
  if (!validTime(course.start)||!validTime(course.end)||course.end<=course.start) throw new Error('请填写有效时间，结束时间须晚于开始时间');
  if (course.startDate&&!validDate(course.startDate)||course.endDate&&!validDate(course.endDate)) throw new Error('课程日期格式不正确');
  return {...course,weekday:+course.weekday};
}
function csvRows(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if((c===','||c==='\t')&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('CSV 引号没有闭合');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
function decodeICS(s=''){return s.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');}
function icsDate(value,params='') {
  if(!/^\d{8}T\d{6}Z?$/.test(value))throw new Error('仅支持带具体开始、结束时间的课表事件，全天事件请手动添加');
  const tz=params.match(/TZID=([^;:]+)/)?.[1];
  if(tz&&!['Asia/Shanghai','UTC','Etc/UTC'].includes(tz))throw new Error(`暂不支持时区 ${tz}，请先转换为 Asia/Shanghai`);
  const v=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(9,11)}:${value.slice(11,13)}:${value.slice(13,15)}`;
  const utc=value.endsWith('Z')||tz==='UTC'||tz==='Etc/UTC';
  const d=new Date(`${v}${utc?'Z':'+08:00'}`);
  if(Number.isNaN(+d))throw new Error('ICS 日期无效');
  const cn=new Date(+d+8*3600000).toISOString();
  return {date:cn.slice(0,10),time:cn.slice(11,16),weekday:new Date(`${cn.slice(0,10)}T12:00:00Z`).getUTCDay()||7};
}
function parseICS(text,filename){
  const warnings=[],courses=[];
  const unfolded=text.replace(/\r?\n[ \t]/g,'');
  const events=[...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g)];
  if(!events.length)throw new Error('未找到 ICS 课程事件');
  for(let n=0;n<events.length;n++) {
    const fields={};
    for(const line of events[n][1].split(/\r?\n/)){const m=line.match(/^([^:;]+)([^:]*):(.*)$/);if(m){(fields[m[1]]??=[]).push({params:m[2],value:m[3]});}}
    try {
      if(fields['RECURRENCE-ID'])throw new Error('包含调课例外 RECURRENCE-ID；请先拆分为独立事件');
      if(fields.RDATE)throw new Error('包含 RDATE 追加日期；请先拆分为独立事件');
      const start=icsDate(fields.DTSTART?.[0]?.value||'',fields.DTSTART?.[0]?.params),end=icsDate(fields.DTEND?.[0]?.value||'',fields.DTEND?.[0]?.params);
      if(start.date!==end.date)throw new Error('暂不支持跨天课程');
      const rawRule=fields.RRULE?.[0]?.value||'';
      const rule=Object.fromEntries(rawRule.split(';').filter(Boolean).map(x=>x.split('=')));
      if(rawRule&&(rule.FREQ!=='WEEKLY'||Object.keys(rule).some(k=>!['FREQ','INTERVAL','BYDAY','UNTIL','COUNT','WKST'].includes(k))||![1,2].includes(Number(rule.INTERVAL||1))))throw new Error(`暂不支持重复规则 ${rawRule}，请导出具体日期后重试`);
      if(rule.BYDAY&&rule.BYDAY.split(',').some(d=>!dayNames[d]))throw new Error('BYDAY 中包含暂不支持的带序号星期');
      if(rule.COUNT&&(!/^\d+$/.test(rule.COUNT)||+rule.COUNT<1))throw new Error('RRULE COUNT 无效');
      const weekdays=rule.BYDAY?rule.BYDAY.split(',').map(d=>dayNames[d]):[start.weekday];
      const exdates=(fields.EXDATE||[]).flatMap(f=>f.value.split(',').map(v=>icsDate(v,f.params).date));
      const until=rule.UNTIL?rule.UNTIL.slice(0,4)+'-'+rule.UNTIL.slice(4,6)+'-'+rule.UNTIL.slice(6,8):'';
      if(until&&!validDate(until))throw new Error('RRULE UNTIL 日期无效');
      const course={title:decodeICS(fields.SUMMARY?.[0]?.value),teacher:'',location:decodeICS(fields.LOCATION?.[0]?.value),start:start.time,end:end.time,source:filename||'ICS 导入',startDate:start.date,endDate:until||(!rawRule?start.date:''),recurrence:rawRule,exdates,weeks:rawRule?(Number(rule.INTERVAL||1)===2?'隔周（按开始日期）':'每周'):'单次课程',attendance:'待补充',grading:'待补充'};
      for(const weekday of weekdays)courses.push(validateCourse({...course,weekday}));
      if(exdates.length)warnings.push(`${course.title}：已保留 ${exdates.length} 个停课日期，请核对节假日安排。`);
      if(rule.COUNT)warnings.push(`${course.title}：已保留重复次数 COUNT=${rule.COUNT}；请在正式使用前核对结束周次。`);
    }catch(e){warnings.push(`事件 ${n+1} 未导入：${e.message}`);}
  }
  if(!courses.length)throw new Error(warnings.join('\n')||'未识别到课程');
  return {courses,warnings};
}
export function parseTimetable(text,filename='导入课表') {
  if(typeof text!=='string'||!text.trim())throw new Error('请上传 ICS/CSV 或粘贴课表文本');
  if(text.length>250000)throw new Error('课表内容过大，请控制在 250 KB 以内');
  if(text.includes('BEGIN:VCALENDAR')||text.includes('BEGIN:VEVENT'))return parseICS(text,filename);
  const rows=csvRows(text.replace(/^\uFEFF/,''));
  const names={title:['title','课程','课程名称','课程名'],teacher:['teacher','教师','老师','授课老师'],weekday:['weekday','星期','周几'],start:['start','开始','开始时间'],end:['end','结束','结束时间'],location:['location','地点','教室'],weeks:['weeks','周次'],attendance:['attendance','考勤'],grading:['grading','成绩构成','考核']};
  const header=rows.shift()?.map(s=>s.trim())||[];
  const indices=Object.fromEntries(Object.entries(names).map(([k,aliases])=>[k,header.findIndex(h=>aliases.includes(h))]));
  if(['title','weekday','start','end'].some(k=>indices[k]<0))throw new Error('CSV 需要表头：课程名称,星期,开始时间,结束时间,教室,教师,周次');
  const courses=[],warnings=[];
  for(let i=0;i<rows.length;i++) {
    try {
      const course=Object.fromEntries(Object.keys(names).map(k=>[k,indices[k]<0?'':(rows[i][indices[k]]||'').trim()]));
      const cn={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':7,'天':7};
      course.weekday=Number(course.weekday)||cn[course.weekday.replace(/^(星期|周)/,'')];
      courses.push(validateCourse({...course,source:filename}));
    }catch(e){warnings.push(`第 ${i+2} 行未导入：${e.message}`);}
  }
  if(!courses.length)throw new Error(warnings.join('\n')||'课表没有课程行');
  return {courses,warnings};
}
