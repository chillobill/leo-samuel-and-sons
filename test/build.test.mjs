import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// Isolated fixture checkouts leave source and production output untouched.
async function fixture(fn) {
 const dir=await mkdtemp(path.join(root,'.test-'));
 try {for(const entry of ['scripts','public','site.json']) await cp(path.join(root,entry),path.join(dir,entry),{recursive:true});
 // Use only fixture posts; real content is validated by the production build.
 await mkdir(path.join(dir,'content/projects'),{recursive:true});
 await fn(dir);
 } finally {await rm(dir,{recursive:true,force:true});}
}
const source=(extra='',body='## Progress\n\n![Stone house](/assets/images/ai/yorkshire-stone-house.webp)')=>`---\ntitle: "A project & its progress"\ndate: "2026-10-29"\nsummary: "A project update"\ncategory: "On site"\nimage: "/assets/images/ai/yorkshire-stone-house.webp"\nimage_alt: "Stone house"\ndraft: false\n${extra}---\n${body}\n`;
const build=dir=>execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env:{...process.env,BASE_PATH:'/leo-samuel-and-sons'},stdio:'pipe'});
test('Markdown becomes linked pages with escaped titles, images and repository base paths',async()=>fixture(async dir=>{
 await writeFile(path.join(dir,'content/projects/project-one.md'),source('image_caption: "AI-generated illustration — not a project photograph."\n'));build(dir);
 const index=await readFile(path.join(dir,'dist/index.html'),'utf8');
 assert.match(index,/\/leo-samuel-and-sons\/projects\/project-one\//);
 assert.doesNotMatch(index,/Your project title/);
 assert.match(index,/class="image-caption">AI-generated illustration — not a project photograph/);
 const page=await readFile(path.join(dir,'dist/projects/project-one/index.html'),'utf8');
 assert.match(page,/<figcaption class="image-caption">AI-generated illustration — not a project photograph/);
 assert.match(page,/<h2>Progress<\/h2>/);assert.match(page,/A project &amp; its progress/);
 assert.match(page,/src="\/leo-samuel-and-sons\/assets\/images\/ai\/yorkshire-stone-house\.webp"/);
 assert.match(page,/href="\/leo-samuel-and-sons\/assets\/style.css"/);
}));
test('missing inline photographs fail the PR build',async()=>fixture(async dir=>{
 await writeFile(path.join(dir,'content/projects/project-one.md'),source('', '![Missing image](/assets/images/missing.jpg)'));
 assert.throws(()=>build(dir),/ENOENT/);
}));
test('invalid dates and unsafe links fail the PR build',async()=>fixture(async dir=>{
 const p=path.join(dir,'content/projects/project-one.md');
 await writeFile(p,source().replace('2026-10-29','2026-02-30'));assert.throws(()=>build(dir),/invalid date/);
 await writeFile(p,source('','[Click](javascript:alert%281%29)'));assert.throws(()=>build(dir),/Unsupported link/);
}));
test('drafts are excluded and an empty journal renders successfully',async()=>fixture(async dir=>{
 await writeFile(path.join(dir,'content/projects/draft-project.md'),source().replace('draft: false','draft: true').replace('A project & its progress','Your project title'));
 build(dir);const index=await readFile(path.join(dir,'dist/index.html'),'utf8');
 assert.match(index,/UPDATES COMING SOON/);assert.doesNotMatch(index,/Your project title/);
}));
