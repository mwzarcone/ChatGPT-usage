
(function(){
const ux=document.getElementById('ux');
const fInt=d3.format(','), fPct1=d3.format('.1f');
const compact=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
const ui={view:'map',page:'usage',metric:'pct',scen:'base',hor:'12',smetric:'added'};
const sort={usage:{f:'mau_base',asc:false},scen:{f:'added_12m',asc:false}};
const q={usage:'',scen:''};

dash.calc('natl',{title:'US totals and leaders',description:'Totals and leading states from the state estimates.',inputs:['states'],
  fn:(states)=>{const t=d3.sum(states,r=>+r.mau_base);const u=d3.greatest(states,r=>+r.mau_base);const p=d3.greatest(states,r=>+r.pct_of_population);
    return [{total_mau:t,top_users_state:u.state,top_users_value:+u.mau_base,top_pct_state:p.state,top_pct_value:+p.pct_of_population}];}});
dash.calc('rankchg',{title:'US rank change',description:'US per-capita rank in the first and latest quarter.',inputs:['rank_quarter'],
  fn:(rank_quarter)=>{const us=rank_quarter.filter(r=>r.country==='United States');const a=us[0],b=us[us.length-1];return [{first_rank:+a.rank,first_q:a.quarter,last_rank:+b.rank,last_q:b.quarter}];}});
dash.calc('scen_nat',{title:'National scenario totals',description:'Sum of state projections for each scenario.',inputs:['scenarios'],
  fn:(scenarios)=>['low','base','high'].map(s=>{const r=scenarios.filter(x=>x.scenario===s);return {scenario:s,growth_pct:+r[0].national_growth_pct,mau_now:d3.sum(r,x=>+x.mau_now),mau_6m:d3.sum(r,x=>+x.mau_6m),mau_12m:d3.sum(r,x=>+x.mau_12m)};})});

const ok=(...ids)=>ids.every(i=>dash.data(i).status==='ok');
const fail=(el,id)=>{el.replaceChildren();if(id&&dash.data(id).status==='loading')return;const d=document.createElement('div');d.className='ux-fail';const i=document.createElement('i');d.append(i,document.createTextNode('Failed to load'));el.append(d);};
const tip=document.getElementById('tip');
function showTip(ev,lines){tip.replaceChildren();lines.forEach(t=>{const d=document.createElement('div');d.textContent=t;tip.append(d);});tip.style.display='block';
  const b=ux.getBoundingClientRect();let x=ev.clientX-b.left+12,y=ev.clientY-b.top+12;const w=tip.offsetWidth;if(x+w>b.width)x=b.width-w-4;if(x<0)x=0;tip.style.left=x+'px';tip.style.top=y+'px';}
const hideTip=()=>{tip.style.display='none';};

function ramp(v,min,max){const t=max>min?(v-min)/(max-min):0;return 'color-mix(in srgb, '+dash.colors[0]+' '+Math.round(8+62*t)+'%, var(--color-panel))';}
const TCOL=r=>{if(!r.rank_trend)return 'color-mix(in srgb, var(--color-fg-muted) 22%, var(--color-panel))';const t=Math.min(1,Math.abs(r.rank_trend_places)/20),p=Math.round(35+50*t);return 'color-mix(in srgb, '+(r.rank_trend>0?'#2f9e6e':'#c2453f')+' '+p+'%, var(--color-panel))';};
function trendLegend(el){const lg=document.createElement('div');lg.className='ux-legend';[['Slipping','color-mix(in srgb, #c2453f 70%, var(--color-panel))'],['Steady','color-mix(in srgb, var(--color-fg-muted) 22%, var(--color-panel))'],['Climbing','color-mix(in srgb, #2f9e6e 70%, var(--color-panel))']].forEach(([t,c])=>{const s=document.createElement('span');s.style.cssText='display:inline-block;width:.9rem;height:.9rem;border-radius:2px;background:'+c;const l=document.createElement('span');l.textContent=t;lg.append(s,l);});const n=document.createElement('span');n.textContent='Deeper color = bigger move since early 2025';lg.append(n);el.append(lg);}
function tileMap(el,rows,valFn,fmt,lines,legendLabel,opts){
  el.replaceChildren();
  const vals=rows.map(valFn);const mn=d3.min(vals),mx=d3.max(vals);
  const g=document.createElement('div');g.className='ux-tiles';
  rows.forEach(r=>{const t=document.createElement('div');t.className='ux-tile';t.style.gridColumn=(+r.col+1);t.style.gridRow=(+r.row+1);t.style.background=opts&&opts.fill?opts.fill(r):ramp(valFn(r),mn,mx);
    const b=document.createElement('b');b.textContent=r.code;t.append(b);
    t.addEventListener('mousemove',e=>showTip(e,lines(r)));t.addEventListener('mouseleave',hideTip);g.append(t);});
  el.append(g);
  if(opts&&opts.fill){trendLegend(el);return;}
  const lg=document.createElement('div');lg.className='ux-legend';
  const lo=document.createElement('span');lo.textContent=fmt(mn);
  const rp=document.createElement('span');rp.className='ux-ramp';rp.style.background='linear-gradient(to right, '+ramp(mn,mn,mx)+', '+ramp(mx,mn,mx)+')';
  const hi=document.createElement('span');hi.textContent=fmt(mx);
  const lb=document.createElement('span');lb.textContent=legendLabel;
  lg.append(lo,rp,hi,lb);el.append(lg);
}
function choropleth(el,rows,valFn,fmt,lines,legendLabel,opts){
  el.replaceChildren();
  const geo=dash.data('geo').data;const by=new Map(rows.map(r=>[r.code,r]));
  const vals=rows.map(valFn);const mn=d3.min(vals),mx=d3.max(vals);
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox','0 0 975 610').attr('role','img');
  const bind=(sel,r)=>sel.on('mouseenter',function(){d3.select(this).raise();}).on('mousemove',e=>showTip(e,lines(r))).on('mouseleave',hideTip);
  geo.forEach(g=>{const r=by.get(g.code);if(!r)return;
    bind(svg.append('path').attr('d',g.path).attr('class','ux-st').style('fill',opts&&opts.fill?opts.fill(r):ramp(valFn(r),mn,mx)).style('stroke','var(--color-bg)').attr('stroke-width',1).attr('stroke-linejoin','round'),r);});
  const dc=geo.find(g=>g.code==='DC'),dr=by.get('DC');
  if(dc&&dr){bind(svg.append('circle').attr('class','ux-st').attr('cx',dc.cx+14).attr('cy',dc.cy+4).attr('r',6).style('fill',opts&&opts.fill?opts.fill(dr):ramp(valFn(dr),mn,mx)).style('stroke','var(--color-fg-muted)').attr('stroke-width',1),dr);
    svg.append('text').attr('x',dc.cx+23).attr('y',dc.cy+8).attr('font-size',12).style('fill','var(--color-fg-muted)').text('DC');}
  if(opts&&opts.fill){trendLegend(el);return;}
  const lg=document.createElement('div');lg.className='ux-legend';
  const lo=document.createElement('span');lo.textContent=fmt(mn);
  const rp=document.createElement('span');rp.className='ux-ramp';rp.style.background='linear-gradient(to right, '+ramp(mn,mn,mx)+', '+ramp(mx,mn,mx)+')';
  const hi=document.createElement('span');hi.textContent=fmt(mx);
  const lb=document.createElement('span');lb.textContent=legendLabel;
  lg.append(lo,rp,hi,lb);el.append(lg);
}
function drawMap(el,rows,valFn,fmt,lines,label,opts){
  if(ui.view==='map'){const g=dash.data('geo');if(g.status==='ok')return choropleth(el,rows,valFn,fmt,lines,label,opts);if(g.status!=='loading')return fail(el,'geo');return el.replaceChildren();}
  return tileMap(el,rows,valFn,fmt,lines,label,opts);
}
function buildTable(tbl,cols,rows,keyFn,sortKey){
  const tb=tbl.tBodies[0];tb.replaceChildren();
  rows.forEach(r=>{const tr=document.createElement('tr');tr.dataset.key=keyFn(r);
    cols.forEach(c=>{const td=document.createElement('td');if(c.num)td.className='num';td.textContent=c.fmt?c.fmt(r[c.f],r):r[c.f];tr.append(td);});tb.append(tr);});
}
function sortRows(rows,s){const f=s.f;return rows.slice().sort((a,b)=>{const x=a[f],y=b[f];const c=(typeof x==='number'&&typeof y==='number')?x-y:String(x).localeCompare(String(y));return s.asc?c:-c;});}
function wireSort(tbl,key,fields){
  tbl.tHead.querySelectorAll('th').forEach((th,i)=>{th.addEventListener('click',()=>{const f=fields()[i];if(!f)return;const s=sort[key];if(s.f===f)s.asc=!s.asc;else{s.f=f;s.asc=(f==='state'||f==='growth_label');}render();});});
}
function seg(){ux.querySelectorAll('[data-seg]').forEach(sg=>{const k=sg.dataset.seg;sg.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(ui[k]===b.dataset.v));});});}
ux.querySelectorAll('[data-seg] button').forEach(b=>b.addEventListener('click',()=>{const k=b.parentElement.dataset.seg;ui[k]=b.dataset.v;if(k==='hor'||k==='smetric'){}render();}));
ux.querySelectorAll('.ux-tab').forEach(t=>t.addEventListener('click',()=>{ui.page=t.dataset.page;dash.setLink(ui.page);render();}));
document.getElementById('search-usage').addEventListener('input',e=>{q.usage=e.target.value.toLowerCase();render();});
document.getElementById('search-scen').addEventListener('input',e=>{q.scen=e.target.value.toLowerCase();render();});

function lineChart(el,series,o){
  el.replaceChildren();
  const W=Math.max(el.clientWidth,260),H=300;
  const probe=document.createElementNS('http://www.w3.org/2000/svg','svg');probe.setAttribute('width','0');probe.setAttribute('height','0');el.append(probe);
  const meas=s=>{const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('font-size','11');t.textContent=s;probe.append(t);const w=t.getComputedTextLength();t.remove();return w;};
  const endLabels=series.map(s=>s.name+' '+o.fmtY(s.values[s.values.length-1].y));
  const mr=Math.min(d3.max(endLabels,meas)+10,W*0.4);const m={t:10,r:mr,b:26,l:o.invert?30:36};
  probe.remove();
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox','0 0 '+W+' '+H).attr('role','img');
  const xs=o.xs.range([m.l,W-m.r]);
  const ys=d3.scaleLinear(o.yDomain,[m.t,H-m.b]);
  const gx=svg.append('g').attr('transform','translate(0,'+(H-m.b)+')').call(d3.axisBottom(xs).ticks(Math.max(2,Math.floor(W/110))).tickFormat(o.fmtX));
  gx.attr('font-size',null).attr('font-family',null);gx.selectAll('text').style('fill','var(--color-fg-muted)').attr('font-size',11);gx.selectAll('path,line').style('stroke','var(--cds-chart-axis)');
  const gy=svg.append('g').attr('transform','translate('+m.l+',0)').call(d3.axisLeft(ys).ticks(5).tickSize(-(W-m.r-m.l)).tickFormat(o.fmtY));
  gy.attr('font-size',null).attr('font-family',null);gy.selectAll('text').style('fill','var(--color-fg-muted)').attr('font-size',11);gy.selectAll('line').style('stroke','var(--cds-chart-grid)');gy.select('.domain').remove();
  const px=d=>xs(d.x)+(xs.bandwidth?xs.bandwidth()/2:0);
  const line=d3.line().x(px).y(d=>ys(d.y));
  const ends=[];
  series.forEach((s,i)=>{svg.append('path').datum(s.values).style('fill','none').style('stroke',s.color).attr('stroke-width',s.strong?3:1.5).attr('stroke-linecap','round').attr('stroke-linejoin','round').attr('d',line);
    const last=s.values[s.values.length-1];ends.push({y:ys(last.y),s,txt:endLabels[i]});});
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<12)ends[i].y=ends[i-1].y+12;
  ends.forEach(e=>{svg.append('text').attr('x',W-m.r+6).attr('y',e.y+4).attr('font-size',11).style('fill',e.s.strong?'var(--color-fg)':'var(--color-fg-muted)').attr('font-weight',e.s.strong?600:400).text(e.txt);});
  const hit=svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.r-m.l).attr('height',H-m.t-m.b).style('fill','transparent');
  const xsVals=series[0].values.map(v=>v.x);
  hit.on('mousemove',ev=>{const [mx]=d3.pointer(ev);let best=0,bd=1e9;xsVals.forEach((x,i)=>{const d=Math.abs(px({x})-mx);if(d<bd){bd=d;best=i;}});
    showTip(ev,[o.fmtX(xsVals[best])].concat(series.map(s=>s.name+': '+o.fmtY(s.values[best].y))));}).on('mouseleave',hideTip);
}
function slopeChart(el,rows){
  el.replaceChildren();const W=Math.max(el.clientWidth,260),H=470,m={t:28,b:10,l:Math.min(124,W*.3),r:Math.min(124,W*.3)};
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox','0 0 '+W+' '+H).attr('role','img');
  const y=d3.scaleLinear([75,0],[m.t,H-m.b-6]),x0=m.l,x1=W-m.r,muted='var(--cds-chart-muted)';
  const col={ChatGPT:dash.colors[0],Gemini:dash.colors[1]||dash.colors[0],Claude:dash.colors[2]||dash.colors[0]};
  const strong=n=>n==='ChatGPT'||n==='Gemini'||n==='Claude';
  [['Oct 2025',x0],['Sep 2026',x1]].forEach(([t,x])=>svg.append('text').attr('x',x).attr('y',14).attr('text-anchor','middle').attr('font-size',11).style('fill','var(--color-fg-muted)').text(t));
  const spread=(items)=>{items.sort((a,b)=>b.y-a.y);let lim=H-m.b+2;items.forEach(i=>{i.ly=Math.min(i.y,lim);lim=i.ly-14;});};
  const L=rows.map(r=>({r,y:y(r.share_oct_2025)})),R=rows.map(r=>({r,y:y(r.share_sep_2026)}));spread(L);spread(R);
  rows.forEach(r=>{const c=strong(r.chatbot)?col[r.chatbot]:muted;
    svg.append('line').attr('x1',x0).attr('x2',x1).attr('y1',y(r.share_oct_2025)).attr('y2',y(r.share_sep_2026)).style('stroke',c).attr('stroke-width',r.chatbot==='ChatGPT'?3:strong(r.chatbot)?2.5:1.5).attr('stroke-linecap','round');
    [[x0,r.share_oct_2025],[x1,r.share_sep_2026]].forEach(([x,v])=>svg.append('circle').attr('cx',x).attr('cy',y(v)).attr('r',3.5).style('fill',c));});
  const lab=(items,k,x,anc,f)=>items.forEach(i=>svg.append('text').attr('x',x).attr('y',i.ly+4).attr('text-anchor',anc).attr('font-size',11).attr('font-weight',strong(i.r.chatbot)?600:400).style('fill',strong(i.r.chatbot)?'var(--color-fg)':'var(--color-fg-muted)').text(f(i.r)));
  lab(L,0,x0-8,'end',r=>r.chatbot+' '+r.share_oct_2025.toFixed(1)+'%');
  lab(R,0,x1+8,'start',r=>r.share_sep_2026.toFixed(1)+'% '+r.chatbot);
  const sx=d3.scaleLinear([x0,x1],[0,1]);
  const hit=svg.append('rect').attr('x',x0).attr('y',m.t-6).attr('width',x1-x0).attr('height',H-m.t-m.b+6).style('fill','transparent');
  hit.on('mousemove',ev=>{const [mx,my]=d3.pointer(ev);const t=sx(mx);let best=null,bd=1e9;rows.forEach(r=>{const yy=y(r.share_oct_2025)+(y(r.share_sep_2026)-y(r.share_oct_2025))*t;const d=Math.abs(yy-my);if(d<bd){bd=d;best=r;}});
    if(best){const s=best.change_pts;showTip(ev,[best.chatbot,'Oct 2025: '+best.share_oct_2025.toFixed(1)+'%','Sep 2026: '+best.share_sep_2026.toFixed(1)+'%',(s>0?'+':'')+s.toFixed(1)+' points','About '+compact.format(best.visits_sep_2026_m*1e6)+' visits in Sep 2026 (estimate)']);}}).on('mouseleave',hideTip);
}
function barChart(el,rows,valFn,fmt){
  el.replaceChildren();const W=Math.max(el.clientWidth,260),rh=24,H=rows.length*rh+8;
  const probe=document.createElementNS('http://www.w3.org/2000/svg','svg');probe.setAttribute('width','0');probe.setAttribute('height','0');el.append(probe);
  const meas=s=>{const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('font-size','11');t.textContent=s;probe.append(t);const w=t.getComputedTextLength();t.remove();return w;};
  const ml=d3.max(rows,r=>meas(r.state))+8,mr=d3.max(rows,r=>meas(fmt(valFn(r))))+8;probe.remove();
  const x=d3.scaleLinear([0,d3.max(rows,valFn)],[0,Math.max(W-ml-mr,40)]);
  const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox','0 0 '+W+' '+H);
  rows.forEach((r,i)=>{const y=i*rh+4;
    svg.append('text').attr('x',ml-6).attr('y',y+rh/2+1).attr('text-anchor','end').attr('font-size',11).style('fill','var(--color-fg)').text(r.state);
    svg.append('rect').attr('x',ml).attr('y',y+3).attr('height',rh-8).attr('width',Math.max(x(valFn(r)),1)).attr('rx',4).style('fill',dash.colors[0]);
    svg.append('text').attr('x',ml+x(valFn(r))+5).attr('y',y+rh/2+1).attr('font-size',11).style('fill','var(--color-fg-muted)').text(fmt(valFn(r)));});
}

let rankBy='mau_base';
const usageCols=[{f:'__rank',num:1,fmt:(v,r)=>r.__rank},{f:'state'},{f:'mau_base',num:1,fmt:fInt},{f:'pct_of_population',num:1,fmt:v=>fPct1(v)+'%'},{f:'growth_label'}];
const scenFields=()=>['state','mau_now',ui.hor==='6'?'mau_6m':'mau_12m',ui.hor==='6'?'added_6m':'added_12m',ui.hor==='6'?'growth_pct_6m':'growth_pct_12m'];
wireSort(document.getElementById('tbl-usage'),'usage',()=>[null,'state','mau_base','pct_of_population',null]);
wireSort(document.getElementById('tbl-scen'),'scen',scenFields);

function render(){
  seg();
  ux.querySelectorAll('.ux-tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.page===ui.page)));
  ux.querySelectorAll('[data-pg]').forEach(s=>{s.hidden=s.dataset.pg!==ui.page;});
  const st=dash.data('states');
  if(ui.page==='usage'){
    const mapEl=document.getElementById('map-usage');
    if(st.status!=='ok'){fail(mapEl,'states');}else{const rows=st.data.map(r=>({...r}));
      if(ui.metric==='trend')drawMap(mapEl,rows,r=>+r.rank_trend_places,v=>String(v),r=>[r.state,r.growth_label,'Usage rank '+r.usage_rank+' of 51 (2026 Q3)',fPct1(r.pct_of_population)+'% of residents (modeled)'],'rank trend',{fill:TCOL});
      else if(ui.metric==='pct')drawMap(mapEl,rows,r=>+r.pct_of_population,v=>fPct1(v)+'%',r=>[r.state,fInt(r.mau_base)+' modeled users',fPct1(r.pct_of_population)+'% of residents','Usage rank '+r.usage_rank+' of 51'],'% of residents');
      else drawMap(mapEl,rows,r=>+r.mau_base,v=>compact.format(v),r=>[r.state,fInt(r.mau_base)+' modeled users',fPct1(r.pct_of_population)+'% of residents','Usage rank '+r.usage_rank+' of 51'],'users');
      const tbl=document.getElementById('tbl-usage');if(sort.usage.f==='mau_base'||sort.usage.f==='pct_of_population')rankBy=sort.usage.f;
      const order=rows.slice().sort(rankBy==='mau_base'?(a,b)=>b.mau_base-a.mau_base||a.state.localeCompare(b.state):(a,b)=>a.usage_rank-b.usage_rank);
      order.forEach((r,i)=>{r.__rank=i+1;});
      document.getElementById('th-urank').textContent=rankBy==='mau_base'?'# by users':'# by % of residents';
      let rs=rows.filter(r=>r.state.toLowerCase().includes(q.usage));rs=sortRows(rs,sort.usage);buildTable(tbl,usageCols,rs,r=>r.state);}
  }
  if(ui.page==='momentum'){
    const rq=dash.data('rank_quarter'),ws=dash.data('work_share'),ce=document.getElementById('ch-rank'),cw=document.getElementById('ch-work'),chips=document.getElementById('chips');
    if(rq.status!=='ok')fail(ce,'rank_quarter');else{
      const names=['United States','Singapore','Canada','United Kingdom','Australia','Germany','France','South Korea','Japan'];
      const qs=Array.from(new Set(rq.data.map(r=>r.quarter)));
      const muted='var(--cds-chart-muted)';
      const series=names.map(n=>({name:n,strong:n==='United States',color:n==='United States'?dash.colors[0]:muted,values:qs.map(qq=>({x:qq,y:+(rq.data.find(r=>r.country===n&&r.quarter===qq)||{}).rank}))}));
      lineChart(ce,series,{xs:d3.scalePoint(qs,[0,1]).padding(0.1),yDomain:[1,120],invert:true,fmtX:s=>s,fmtY:v=>String(Math.round(v))});}
    if(ws.status!=='ok')fail(cw,'work_share');else{
      const parse=d3.utcParse('%Y-%m');const rows=ws.data.map(r=>({d:parse(r.month),us:+r.united_states,all:+r.all_countries}));
      const series=[{name:'United States',strong:true,color:dash.colors[0],values:rows.map(r=>({x:r.d,y:r.us}))},{name:'All countries',color:'var(--cds-chart-muted)',values:rows.map(r=>({x:r.d,y:r.all}))}];
      lineChart(cw,series,{xs:d3.scaleUtc(d3.extent(rows,r=>r.d),[0,1]),yDomain:[60,0],fmtX:d3.utcFormat('%b %Y'),fmtY:v=>Math.round(v)+'%'});
      }
    const sq=dash.data('state_rank_quarter'),sce=document.getElementById('ch-strank');
    if(st.status!=='ok'||sq.status!=='ok'){fail(chips,'states');fail(sce,'state_rank_quarter');}else{
      chips.replaceChildren();st.data.filter(r=>r.rank_trend!==0).sort((a,b)=>b.rank_trend_places-a.rank_trend_places).forEach(r=>{const c=document.createElement('span');c.className='ux-chip'+(r.rank_trend===1?' two':'');c.textContent=r.state+' ('+(r.rank_trend_places>0?'+':'−')+Math.abs(r.rank_trend_places)+')';chips.append(c);});
      const sqs=Array.from(new Set(sq.data.map(r=>r.quarter)));
      const byTr=st.data.slice().sort((a,b)=>b.rank_trend_places-a.rank_trend_places);const up=byTr.slice(0,4).map(r=>r.state),down=byTr.slice(-3).map(r=>r.state);
      const mkS=(n,color,strong)=>({name:n,strong,color,values:sqs.map(qq=>({x:qq,y:+(sq.data.find(r=>r.state===n&&r.quarter===qq)||{}).rank}))});
      lineChart(sce,up.map((n,i)=>mkS(n,dash.colors[i]||dash.colors[0],true)).concat(down.map(n=>mkS(n,'var(--cds-chart-muted)',false))),{xs:d3.scalePoint(sqs,[0,1]).padding(0.1),yDomain:[1,52],invert:true,fmtX:s=>s,fmtY:v=>String(Math.round(v))});}
  }
  if(ui.page==='chatbots'){
    const cb=dash.data('chatbots'),sl=document.getElementById('ch-slope'),tr=document.getElementById('ch-trend');
    if(cb.status!=='ok'){fail(sl,'chatbots');fail(tr,'chatbots');}else{
      const rows=cb.data,g=rows.find(r=>r.chatbot==='ChatGPT'),ge=rows.find(r=>r.chatbot==='Gemini');
      const set=(id,t)=>{document.getElementById(id).textContent=t;};
      set('kp-share',g.share_sep_2026.toFixed(1)+'%');
      set('kp-chg',(g.change_pts>0?'+':'−')+Math.abs(g.change_pts).toFixed(1)+' pts');set('kp-chg-s','From '+g.share_oct_2025.toFixed(1)+'% in October 2025');
      set('kp-vis',(g.visits_sep_2026_m/1000).toFixed(1)+'B');
      set('kp-ratio',(g.visits_sep_2026_m/ge.visits_sep_2026_m).toFixed(1)+'×');set('kp-ratio-s','Gemini: about '+(ge.visits_sep_2026_m/1000).toFixed(1)+'B visits');
      slopeChart(sl,rows);
      const labs=['Oct 2025','Apr 2026','Sep 2026'];
      const mk=(n,c,strong)=>{const r=rows.find(x=>x.chatbot===n);return {name:n,strong,color:c,values:[r.share_oct_2025,r.share_apr_2026,r.share_sep_2026].map((v,i)=>({x:labs[i],y:v}))};};
      lineChart(tr,[mk('ChatGPT',dash.colors[0],true),mk('Gemini',dash.colors[1]||'var(--cds-chart-muted)',false),mk('Claude',dash.colors[2]||'var(--cds-chart-muted)',false)],{xs:d3.scalePoint(labs,[0,1]).padding(0.1),yDomain:[80,0],fmtX:s=>s,fmtY:v=>(Number.isInteger(v)&&v%20===0)?v+'%':v.toFixed(1)+'%'});
      const f1=v=>v==null?'—':v.toFixed(1)+'%';
      buildTable(document.getElementById('tbl-chat'),[{f:'chatbot'},{f:'share_oct_2025',num:1,fmt:f1},{f:'share_apr_2026',num:1,fmt:f1},{f:'share_sep_2026',num:1,fmt:f1},{f:'change_pts',num:1,fmt:v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1)},{f:'visits_sep_2026_m',num:1,fmt:fInt}],rows,r=>r.chatbot);
    }
  }
  if(ui.page==='scenarios'){
    const sc=dash.data('scenarios');const mapEl=document.getElementById('map-scen'),barEl=document.getElementById('bars-scen');
    const sn=dash.data('scen_nat');
    if(sn.status==='ok'){buildTable(document.getElementById('tbl-snat'),[{f:'scenario',fmt:v=>v[0].toUpperCase()+v.slice(1)},{f:'growth_pct',num:1,fmt:v=>fPct1(v)+'%'},{f:'mau_now',num:1,fmt:v=>compact.format(v)},{f:'mau_6m',num:1,fmt:v=>compact.format(v)},{f:'mau_12m',num:1,fmt:v=>compact.format(v)}],sn.data,r=>r.scenario);}
    if(sc.status!=='ok'){fail(mapEl,'scenarios');fail(barEl,'scenarios');}else{
      const h=ui.hor,addF='added_'+h+'m',pctF='growth_pct_'+h+'m',endF='mau_'+h+'m';
      const rows=sc.data.filter(r=>r.scenario===ui.scen).map(r=>({...r}));
      const lines=r=>[r.state,fInt(r.mau_now)+' now',fInt(r[endF])+' in '+h+' months','+'+fInt(r[addF])+' users ('+fPct1(r[pctF])+'%)'];
      if(ui.smetric==='added')drawMap(mapEl,rows,r=>+r[addF],v=>compact.format(v),lines,'users added');
      else drawMap(mapEl,rows,r=>+r[pctF],v=>fPct1(v)+'%',lines,'growth %');
      barChart(barEl,sortRows(rows,{f:addF,asc:false}).slice(0,12),r=>+r[addF],v=>'+'+compact.format(v));
      document.getElementById('th-end').dataset.field=endF;document.getElementById('th-add').dataset.field=addF;document.getElementById('th-pct').dataset.field=pctF;
      document.getElementById('th-end').textContent='In '+h+' months';document.getElementById('th-add').textContent='Users added';document.getElementById('th-pct').textContent='Growth %';
      const cols=[{f:'state'},{f:'mau_now',num:1,fmt:fInt},{f:endF,num:1,fmt:fInt},{f:addF,num:1,fmt:fInt},{f:pctF,num:1,fmt:v=>fPct1(v)+'%'}];
      const sk=sort.scen;if(!scenFields().includes(sk.f)){sk.f=addF;}
      if(/^(added|mau|growth)_/.test(sk.f)&&sk.f!=='mau_now'){sk.f=sk.f.startsWith('added')?addF:sk.f.startsWith('growth')?pctF:endF;}
      let rs=rows.filter(r=>r.state.toLowerCase().includes(q.scen));rs=sortRows(rs,sk);buildTable(document.getElementById('tbl-scen'),cols,rs,r=>r.scenario_state);}
  }
  if(ui.page==='method'){
    const as=dash.data('assumptions');
    const so=dash.data('sources');
    if(so.status==='ok'){const tb=document.getElementById('tbl-src').tBodies[0];tb.replaceChildren();so.data.forEach(r=>{const tr=document.createElement('tr');tr.dataset.key=r.source;[r.source,r.as_of,r.used_for,r.note].forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.append(td);});const td=document.createElement('td');if(/^https:\/\//.test(r.link||'')){const a=document.createElement('a');a.href=r.link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=r.link;td.append(a);}tr.append(td);tb.append(tr);});}
    if(as.status==='ok')buildTable(document.getElementById('tbl-assump'),[{f:'parameter'},{f:'value',num:1},{f:'unit'},{f:'note'}],as.data,r=>r.parameter);
  }
  const vi=dash.data('vintage');
  if(vi.status==='ok')buildTable(document.getElementById('tbl-vint'),[{f:'item'},{f:'as_of'},{f:'age'},{f:'affects'}],vi.data,r=>r.item);
  if(vi.status==='ok'){[['vnow','State usage rank and topic shares'],['vnow2','OpenAI Signals release overall']].forEach(([id,item])=>{const e=document.getElementById(id);const row=vi.data.find(r=>r.item===item);if(e&&row)e.textContent=row.as_of;});}
  // headline figures
  const nt=dash.data('natl'),rc=dash.data('rankchg');
  ux.querySelectorAll('[data-source=natl][data-field]').forEach(e=>{if(nt.status!=='ok'){return;}const r=nt.data[0],f=e.dataset.field;const v=r[f];e.textContent=f==='total_mau'?compact.format(v):f==='top_users_value'?fInt(v):f==='top_pct_value'?fPct1(v)+'%':v;});
  ux.querySelectorAll('[data-source=rankchg][data-field]').forEach(e=>{if(rc.status!=='ok')return;e.textContent=rc.data[0][e.dataset.field];});
}
const badge=document.getElementById('badge'),btip=document.getElementById('badge-tip');
const placeBtip=()=>{btip.style.left=Math.max(0,badge.offsetLeft)+'px';btip.style.top=(badge.offsetTop+badge.offsetHeight+6)+'px';};
const openB=()=>{btip.hidden=false;placeBtip();badge.setAttribute('aria-expanded','true');};
const closeB=()=>{btip.hidden=true;badge.setAttribute('aria-expanded','false');};
badge.addEventListener('mouseenter',openB);badge.addEventListener('focus',openB);
badge.addEventListener('mouseleave',closeB);badge.addEventListener('blur',closeB);
badge.addEventListener('click',()=>{btip.hidden?openB():closeB();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeB();});
document.getElementById('to-sources').addEventListener('click',()=>{ui.page='method';dash.setLink('method');render();document.getElementById('method-sources').scrollIntoView();});
const vbtn=document.getElementById('vbtn'),vbody=document.getElementById('vbody');
vbtn.addEventListener('click',()=>{const o=vbody.hidden;vbody.hidden=!o;vbtn.setAttribute('aria-expanded',String(o));});
dash.onData(render);
const named=document.getElementById(location.hash.slice(1));
if(named&&['usage','momentum','chatbots','scenarios','method'].includes(named.id)){ui.page=named.id;render();}
})();
