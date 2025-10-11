export function bar(id, labels, values){
  const max = Math.max(1, ...values);
  const w = labels.length*28; const h=48; const bars = values.map((v,i)=>`<rect x="${i*28+4}" y="${h-6-(v/max*(h-14))}" width="20" height="${(v/max*(h-14))}" rx="3"></rect>`).join('');
  const lx = labels.map((l,i)=>`<text x="${i*28+14}" y="${h-2}" font-size="8" text-anchor="middle">${l}</text>`).join('');
  document.getElementById(id).innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${bars}${lx}</svg>`;
}
