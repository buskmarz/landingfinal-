import fs from 'node:fs/promises';import QRCode from 'qrcode';
const dir=process.argv[2];if(!dir?.startsWith('/')||dir.startsWith(process.cwd()))throw Error('Private absolute folder outside repository required');
const inv=JSON.parse(await fs.readFile(dir+'/inventory.json','utf8')),codes=JSON.parse(await fs.readFile(dir+'/short-codes.json','utf8'));
const matrix=url=>{const q=QRCode.create(url,{errorCorrectionLevel:'M'});return Array.from({length:q.modules.size},(_,y)=>Array.from({length:q.modules.size},(_,x)=>q.modules.get(y,x)))};
const rows=inv.filter(t=>t.campaign==='freak-2026').map(t=>({...t,code:codes.find(c=>c.campaign===t.campaign&&c.number===t.number).code,matrix:matrix(t.url)}));
await fs.writeFile(dir+'/integrated-print.json',JSON.stringify({tickets:rows,previewMatrix:matrix('https://bmoodcoffee.com/freak/')}),{mode:0o600});
console.log('100 original QR prepared with unique four-character identifiers.');
