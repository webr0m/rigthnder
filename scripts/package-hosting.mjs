import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output=resolve('.deploy','rigthnder-'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(output,{recursive:true});
for(const item of ['server','dist','app.cjs','LICENSE'])await cp(resolve(item),resolve(output,item),{recursive:true});
const original=JSON.parse(await readFile('package.json','utf8'));
const runtime={name:'rigthnder-server',version:original.version,private:true,type:'module',engines:original.engines,scripts:{start:'node --env-file-if-exists=.env server/index.mjs'},dependencies:{}};
for(const key of ['express','cors','helmet','express-rate-limit','zod','nodemailer'])runtime.dependencies[key]=original.dependencies[key];
await writeFile(resolve(output,'package.json'),JSON.stringify(runtime,null,2)+'\n');
await writeFile(resolve(output,'.env'),`NODE_ENV=production
DEMO_ENABLED=true
DATABASE_PATH=/home/jyscqqde/rigthnder-data/rigthnder.sqlite
PUBLIC_URL=https://onlyfachos.webrom.cc
ALLOWED_ORIGINS=https://onlyfachos.webrom.cc,https://rigthnder.webrom.lat,https://localhost,capacitor://localhost
TRUST_PROXY=1
MAIL_TRANSPORT=
MAIL_FROM=
SENDMAIL_PATH=/usr/sbin/sendmail
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://onlyfachos.webrom.cc/api/auth/google/callback
CANONICAL_HOST=onlyfachos.webrom.cc
LEGACY_HOST=rigthnder.webrom.lat
`);
console.log(output);
