// Keep exact analyte and original unit as grouping keys. Never infer a numeric
// value from inequalities, missing dates, ranges, or another pet's results.
export function trendGroups(records){
  const groups=new Map();
  for(const r of records){if(r.kind!=='lab'||!r.data.date)continue;for(const m of r.data.measurements){if(!/^-?\d+(\.\d+)?$/.test(m.raw_value))continue;const value=Number(m.raw_value);if(!Number.isFinite(value))continue;const key=JSON.stringify([r.data.pet_id,m.analyte,m.unit]);const previous=groups.get(key)||{key,analyte:m.analyte,unit:m.unit,points:[]};groups.set(key,{...previous,points:[...previous.points,{date:r.data.date,raw:m.raw_value,value}]});}}
  return [...groups.values()].map(g=>({...g,points:g.points.toSorted((a,b)=>a.date.localeCompare(b.date))}));
}
