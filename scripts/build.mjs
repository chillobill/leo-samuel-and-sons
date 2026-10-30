import {readFile, readdir, mkdir, rm, cp, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Marked} from 'marked';
import {parse} from 'yaml';
const root = fileURLToPath(new URL('../', import.meta.url));
const site = JSON.parse(await readFile(path.join(root,'site.json'),'utf8'));
const base = (process.env.BASE_PATH || '').replace(/\/$/,'');
if (base && !/^\/[a-zA-Z0-9_/-]+$/.test(base)) throw Error('BASE_PATH must be an absolute URL path without a trailing slash');
const out = path.join(root,process.env.OUTPUT_DIR || 'dist');
if (!out.startsWith(root) || out === root) throw Error('Output must be inside the project');
const esc = x => String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = x => `${base}${x}`;
const dateLabel = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
async function localImage(src) {
  if (typeof src !== 'string' || !/^\/assets\/images\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(src) || src.includes('..')) throw Error(`Use an image in /assets/images/: ${src}`);
  await access(path.join(root,'public',src));
}
const markdown = new Marked({renderer:{
  html({text}) { return esc(text); },
  link({href,title,tokens}) {
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) || href.startsWith('//')) throw Error(`Unsupported link: ${href}`);
    const target = href.startsWith('/') ? url(href) : href;
    return `<a href="${esc(target)}"${title ? ` title="${esc(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
  },
  image({href,text,title}) {
    if (!/^\/assets\/images\/[a-zA-Z0-9_./-]+$/.test(href) || href.includes('..')) throw Error(`Use a local image: ${href}`);
    if (!text.trim()) throw Error('Images need descriptive alt text');
    return `<img src="${esc(url(href))}" alt="${esc(text)}" loading="lazy"${title ? ` title="${esc(title)}"` : ''}>`;
  }
}});
const projects=[];
for (const file of (await readdir(path.join(root,'content/projects'))).filter(f=>/\.md$/i.test(f))) {
  const source=await readFile(path.join(root,'content/projects',file),'utf8');
  const match=source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw Error(`${file}: YAML front matter is required`);
  const meta=parse(match[1]);
  for (const key of ['title','date','summary','category','image','image_alt']) if (typeof meta[key]!=='string' || !meta[key].trim()) throw Error(`${file}: ${key} must be nonempty text`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || !Number.isFinite(Date.parse(meta.date)) || new Date(meta.date).toISOString().slice(0,10)!==meta.date) throw Error(`${file}: invalid date`);
  if (meta.draft !== undefined && typeof meta.draft!=='boolean') throw Error(`${file}: draft must be true or false`);
  if (meta.image_caption !== undefined && typeof meta.image_caption !== 'string') throw Error(`${file}: image_caption must be text`);
  await localImage(meta.image);
  const slug=file.replace(/\.md$/i,'');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) && !meta.draft) throw Error(`${file}: use lowercase hyphenated filenames`);
  await Promise.all(markdown.walkTokens(markdown.lexer(match[2]), async token=>{if(token.type==='image') await localImage(token.href);}));
  const body=markdown.parse(match[2]);
  if (!meta.draft) projects.push({...meta,slug,body});
}
projects.sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
const brand=`<a class="brand" href="${url('/')}" aria-label="${esc(site.name)} home"><span class="brand-mark" aria-hidden="true">LS<span>&</span>S</span><span>LEO SAMUEL<span class="brand-sub">& SONS LTD</span></span></a>`;
function layout(title,description,body,pagePath = '/') {
const canonical=site.url ? `<link rel="canonical" href="${esc(site.url.replace(/\/$/,''))}${esc(pagePath)}">` : '';
return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}${title===site.name?'':` | ${esc(site.name)}`}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#253b34">${canonical}<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${url('/assets/style.css')}"></head><body><a class="skip" href="#main">Skip to content</a><header class="header wrap">${brand}<nav aria-label="Main navigation"><a href="${url('/#about')}">About us</a><a href="${url('/#projects')}">Projects</a><a class="nav-contact" href="${url('/#contact')}">Get in touch <span aria-hidden="true">↗</span></a></nav></header><main id="main">${body}</main><footer class="wrap footer">${brand}<p>Builders in Holmfirth.<br>West Yorkshire.</p><p>© ${new Date().getUTCFullYear()} ${esc(site.name)}</p></footer></body></html>`;
}
const cards=projects.map(p=>`<a class="project-card" href="${url(`/projects/${p.slug}/`)}"><div class="card-image"><img src="${url(p.image)}" alt="${esc(p.image_alt)}" loading="lazy"><span class="card-arrow" aria-hidden="true">↗</span></div>${p.image_caption ? `<p class="image-caption">${esc(p.image_caption)}</p>` : ''}<p class="eyebrow">${esc(p.category)} · ${dateLabel(p.date)}</p><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></a>`).join('');
if (site.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(site.email)) throw Error('Invalid contact email');
if (site.phone && !/^[+\d\s()-]+$/.test(site.phone)) throw Error('Invalid contact phone');
const contact=[site.phone ? `<a class="contact-link" href="tel:${site.phone.replace(/[\s()-]/g,'')}">${esc(site.phone)} ↗</a>` : '',site.email ? `<a class="contact-link" href="mailto:${esc(site.email)}">${esc(site.email)} ↗</a>` : ''].join('');
const home=layout(site.name,`${site.name}. Builders based in Holmfirth, West Yorkshire. Follow our latest project updates.`, `<section class="hero wrap"><div class="hero-copy"><p class="eyebrow"><span class="dot"></span> HOLMFIRTH · WEST YORKSHIRE</p><h1>Building with<br>care.<br><em>Rooted here.</em></h1><p class="hero-intro">Leo Samuel & Sons LTD.<br>A building business at home in Holmfirth.</p><a class="button" href="#projects">Follow our projects <span aria-hidden="true">↗</span></a><div class="hero-note"><span aria-hidden="true">53.57° N<br>1.79° W</span><p>Our place.<br>Our craft.</p></div></div><figure class="hero-image"><img src="${url('/assets/images/ai/yorkshire-stone-house.webp')}" alt="AI-generated illustration of a Yorkshire stone house with a slate roof and garden" fetchpriority="high"><figcaption><span>A SENSE OF PLACE</span><span>AI-generated illustration</span></figcaption></figure></section><div class="ribbon"><div class="wrap"><span>LEO SAMUEL & SONS LTD</span><span>BUILDERS IN HOLMFIRTH</span><span>WEST YORKSHIRE</span></div></div><section id="about" class="about wrap section"><p class="eyebrow">01 / ABOUT US</p><div><h2>A local name.<br><em>A considered approach.</em></h2><p>Based in Holmfirth, West Yorkshire, Leo Samuel & Sons LTD is a local building business.</p><p>This is where we share our work as it takes shape — the details, the progress and the finished spaces.</p><a class="text-link" href="#contact">Get in touch <span aria-hidden="true">↗</span></a></div><div class="location-panel"><figure class="location-photo"><img src="${url('/assets/images/ai/yorkshire-stone-house-detail.webp')}" alt="AI-generated illustration of a Yorkshire stone entrance with a green timber door" loading="lazy"><figcaption>AI-generated illustration</figcaption></figure><p class="eyebrow">BASED IN</p><h3>Holmfirth</h3><p>West Yorkshire</p><div class="contours" aria-hidden="true"></div></div></section><section id="projects" class="projects section"><div class="wrap"><div class="section-top"><div><p class="eyebrow">02 / THE PROJECT JOURNAL</p><h2>From the site.</h2></div><p>New work. Progress on site.<br>Follow the story as it unfolds.</p></div>${projects.length?`<div class="project-grid">${cards}</div>`:`<div class="empty-projects"><span class="large-number" aria-hidden="true">↗</span><div><h3>Good things take shape.</h3><p>Our project journal is getting started. Check back for photographs and updates from our latest work.</p></div><span class="coming-label">UPDATES COMING SOON</span></div>`}</div></section><section id="contact" class="contact section"><div class="wrap contact-grid"><div><p class="eyebrow">03 / GET IN TOUCH</p><h2>Every project starts<br>with <em>a conversation.</em></h2></div><div><p class="contact-location">${esc(site.name)}<br>${esc(site.location)}</p>${contact || '<p class="contact-pending">Contact details will be added soon.</p>'}</div></div></section>`);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});await cp(path.join(root,'public'),out,{recursive:true});
await writeFile(path.join(out,'index.html'),home);await writeFile(path.join(out,'.nojekyll'),'');
for(const p of projects) {const dir=path.join(out,'projects',p.slug);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'index.html'),layout(p.title,p.summary,`<article class="journal wrap"><a class="text-link" href="${url('/#projects')}">← All projects</a><header><p class="eyebrow">${esc(p.category)} · <time datetime="${p.date}">${dateLabel(p.date)}</time></p><h1>${esc(p.title)}</h1><p class="standfirst">${esc(p.summary)}</p></header><figure class="journal-figure"><img class="journal-cover" src="${url(p.image)}" alt="${esc(p.image_alt)}">${p.image_caption ? `<figcaption class="image-caption">${esc(p.image_caption)}</figcaption>` : ''}</figure><div class="prose">${p.body}</div></article>`, `/projects/${p.slug}/`));}
console.log(`Built ${projects.length} published project(s) at ${out}, base path: ${base || '/'}`);
