import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile(new URL('../public-config.json',import.meta.url)));
if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url)||!config.key.startsWith('sb_publishable_'))throw Error('Configure apenas a URL e a chave pública do Supabase.');
if(!/^https:\/\/[a-z0-9.-]+\/$/.test(config.authSiteUrl))throw Error('Configure o endereço público do portal com HTTPS e barra final.');
const out=new URL('../dist/',import.meta.url);await mkdir(out,{recursive:true});
await build({entryPoints:[new URL('../app.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')],outfile:new URL('app.js',out).pathname.replace(/^\/([A-Z]:)/,'$1'),bundle:true,minify:true,format:'esm',target:['es2022'],define:{__SUPABASE_URL__:JSON.stringify(config.url),__SUPABASE_KEY__:JSON.stringify(config.key),__AUTH_SITE_URL__:JSON.stringify(config.authSiteUrl)}});
for(const f of ['styles.css','data.js'])await copyFile(new URL('../'+f,import.meta.url),new URL(f,out));
let html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const f of ['app.js','styles.css','data.js']){const hash=createHash('sha256').update(await readFile(new URL(f,out))).digest('hex').slice(0,12);html=html.replace('"'+f+'"','"'+f+'?v='+hash+'"');}
await writeFile(new URL('index.html',out),html);
console.log('Portal compilado em dist/.');
