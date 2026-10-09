
export function timestampId(prefix) {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000); 
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${prefix}-${p(d.getUTCDate())}${p(d.getUTCMonth() + 1)}${d.getUTCFullYear()}` +
    `-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}


export async function assignNumber(doc, field, prefix) {
  if (doc[field]) return;
  const base = timestampId(prefix);
  let no = base;
  let n = 1;
  while (await doc.constructor.exists({ [field]: no })) no = `${base}-${++n}`;
  doc[field] = no;
}



export async function saveWithNumber(doc, field, tries = 10) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await doc.save();
    } catch (err) {
      const clash = err?.code === 11000 && (err.keyPattern?.[field] || err.keyValue?.[field] !== undefined);
      if (!clash || attempt >= tries) throw err;
      doc[field] = undefined; 
      await new Promise((r) => setTimeout(r, 5 + Math.random() * 40));
    }
  }
}
