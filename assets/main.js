// NAV TOGGLE
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.querySelector('.nav-links');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    if (navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-label','Open menu');
    }
  });
});

let posts = [];
const CHANNEL_ID = 'UCOfIbZhaSSQhNWsoITf8cUQ';
// âš ï¸  REPLACE with your YouTube Data API v3 key (free â€” get it at console.cloud.google.com)
const YT_API_KEY = 'AIzaSyBBPZUHyA4fhnFWEHi39NfCposrzxcc8QU';

// â”€â”€ READ TRACKING (Supabase â€” real counts across all visitors) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPABASE_URL = 'https://dmddswshfwrwmchcttww.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZGRzd3NoZndyd21jaGN0dHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTQ5ODAsImV4cCI6MjA4ODEzMDk4MH0.4QImySXvk_tXcXLAfMTO2P6D8c4jzWuGE3sOXH3QkYM';

// Fetch all read counts from Supabase in one call
async function fetchAllReadCounts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/article_reads?select=slug,read_count`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const rows = await res.json();
    const map = {};
    let total = 0;
    (rows || []).forEach(r => { map[r.slug] = r.read_count; total += r.read_count; });
    return { map, total };
  } catch { return { map: {}, total: 0 }; }
}

// Upsert: increment read count for a slug in Supabase
async function incrementRead(slug, title) {
  try {
    // First try to insert; if slug exists, increment
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_read`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_slug: slug, p_title: title })
    });
  } catch {}
}

// â”€â”€ SKELETON LOADERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function blogSkeletons() {
  const s = `<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;animation:shimmer 1.4s infinite linear;">
    <div style="height:195px;background:linear-gradient(90deg,var(--bg2) 25%,var(--bg3) 50%,var(--bg2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite linear;"></div>
    <div style="padding:1.4rem 1.5rem;">
      <div style="height:12px;width:60%;background:var(--bg2);border-radius:4px;margin-bottom:12px;"></div>
      <div style="height:18px;width:90%;background:var(--bg2);border-radius:4px;margin-bottom:8px;"></div>
      <div style="height:18px;width:75%;background:var(--bg2);border-radius:4px;margin-bottom:16px;"></div>
      <div style="height:12px;width:45%;background:var(--bg2);border-radius:4px;"></div>
    </div>
  </div>`;
  return `<style>@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>` + Array(7).fill(s).join('');
}

function ytSkeletons() {
  const s = `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;">
    <div style="padding-bottom:56.25%;position:relative;background:linear-gradient(90deg,var(--bg2) 25%,var(--bg3) 50%,var(--bg2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite linear;"></div>
    <div style="padding:1.1rem;">
      <div style="height:14px;width:90%;background:var(--bg2);border-radius:4px;margin-bottom:8px;"></div>
      <div style="height:14px;width:65%;background:var(--bg2);border-radius:4px;"></div>
    </div>
  </div>`;
  return Array(6).fill(s).join('');
}

// â”€â”€ BLOG: Fetch from Hashnode (metadata only â€” fast!) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FIX 1: Archived posts filtered out
// FIX 2: Metadata-only fetch for grid; content loaded lazily on modal open
// FIX: Pagination â€” 7 posts per page, featured layout on first post of each page

const POSTS_PER_PAGE = 7;
let allPosts = [];
let currentPage = 1;

async function loadBlog() {
  const grid = document.getElementById('blog-grid');
  grid.innerHTML = blogSkeletons();

  try {
    const query = `{
      publication(host: "techyatra.hashnode.dev") {
        posts(first: 50) {
          edges {
            node {
              id
              title
              brief
              slug
              publishedAt
              coverImage { url }
              tags { name }
              url
            }
          }
        }
      }
    }`;

    const res = await fetch('https://gql.hashnode.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const edges = data?.data?.publication?.posts?.edges;

    if (!edges?.length) {
      grid.innerHTML = `<div class="loading-msg">No articles yet â€” check back soon!</div>`;
      return;
    }

    // Filter: only published posts have both publishedAt and slug
    allPosts = edges.map(e => e.node).filter(p => p.publishedAt && p.slug);

    if (!allPosts.length) {
      grid.innerHTML = `<div class="loading-msg">No published articles found.</div>`;
      return;
    }

    renderPage(1);

  } catch (e) {
    document.getElementById('blog-grid').innerHTML =
      `<div class="loading-msg">Could not load articles. <a href="https://techyatra.hashnode.dev" target="_blank" style="color:var(--blue);font-weight:700;">Visit blog directly â†’</a></div>`;
  }
}

// Global read counts cache so we don't re-fetch on every page turn
let readCountsCache = { map: {}, total: 0 };

async function renderPage(page) {
  currentPage = page;
  const grid = document.getElementById('blog-grid');
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const start = (page - 1) * POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, start + POSTS_PER_PAGE);

  // Fetch counts from Supabase (only on first render; cache for page turns)
  if (page === 1 || !readCountsCache._loaded) {
    readCountsCache = await fetchAllReadCounts();
    readCountsCache._loaded = true;
    updateTotalReadsHeading(readCountsCache.total);
  }

  grid.innerHTML = pagePosts.map((p, i) => {
    const globalIndex = start + i;
    const isFeatured = i === 0;
    const date = new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const tags = (p.tags || []).slice(0, 2).map(t => `<span class="blog-tag">${t.name}</span>`).join('');
    const featuredBadge = isFeatured ? `<span class="featured-badge">Featured</span>` : '';
    const readTime = Math.max(1, Math.ceil((p.brief || '').split(' ').length / 40)) + ' min read';
    const imgSrc = p.coverImage?.url || null;
    const img = imgSrc
      ? (`<img class="blog-card-img" src="${imgSrc}" alt="${p.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />` +
         `<div class="blog-card-img-ph" style="display:none">ðŸ“</div>`)
      : `<div class="blog-card-img-ph">ðŸ“</div>`;
    const views = readCountsCache.map[p.slug] || 0;
    const viewsBadge = views > 0 ? `<span class="blog-views">ðŸ‘ ${views.toLocaleString()}</span>` : '';
    return `
      <div class="blog-card${isFeatured ? ' featured' : ''}" role="button" tabindex="0" data-post-index="${globalIndex}" aria-label="Read article: ${(p.title || '').replace(/"/g, '&quot;')}">
        <div class="blog-img-wrap">${img}</div>
        <div class="blog-body">
          <div class="blog-tags">${tags}${featuredBadge}</div>
          <div class="blog-title">${p.title}</div>
          <div class="blog-excerpt">${p.brief || ''}</div>
          <div class="blog-meta"><span>${date} Â· ${readTime}</span><div style="display:flex;align-items:center;gap:0.7rem">${viewsBadge}<span class="blog-read">Read article</span></div></div>
        </div>
      </div>`;
  }).join('');

  renderPagination(page, totalPages);

  if (page > 1) {
    document.getElementById('blog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateTotalReadsHeading(total) {
  const el = document.getElementById('blog-total-reads');
  if (el && total > 0) {
    el.textContent = `ðŸ“– ${total.toLocaleString()} total reads`;
    el.style.display = 'inline-flex';
  }
}

function renderPagination(current, total) {
  const container = document.getElementById('blog-pagination');
  if (total <= 1) { container.innerHTML = ''; return; }

  let html = '';

  // Prev button
  html += `<button class="page-btn" onclick="renderPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>â† Prev</button>`;

  // Page number buttons with ellipsis
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="page-ellipsis">â€¦</span>`;
    } else {
      html += `<button class="page-btn${p === current ? ' active' : ''}" onclick="renderPage(${p})">${p}</button>`;
    }
  });

  // Next button
  html += `<button class="page-btn" onclick="renderPage(${current + 1})" ${current === total ? 'disabled' : ''}>Next â†’</button>`;

  container.innerHTML = html;
}

// â”€â”€ BLOG MODAL: Lazy-load full content only when opened â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let modalOpener = null;

function getFocusableInModal() {
  const box = document.querySelector('.modal-box');
  if (!box) return [];
  return [...box.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )].filter(el => el.offsetParent !== null);
}
async function openModal(i) {
  const p = allPosts[i];
  modalOpener = document.activeElement;
  document.getElementById('modal-bar-title').textContent = p.title;
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.querySelector('.modal-box').scrollTop = 0;

  const tags = (p.tags || []).map(t => `<span class="modal-tag">${t.name}</span>`).join('');
  const date = new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const heroImg = p.coverImage?.url
    ? `<img class="modal-hero-img" src="${p.coverImage.url}" alt="${p.title}"/>`
    : `<div class="modal-hero-ph">ðŸ“</div>`;
  const hashnodeUrl = p.url || `https://techyatra.hashnode.dev/${p.slug}`;
  const readFullBtn = `<a href="${hashnodeUrl}" target="_blank" class="modal-read-full">Read Full Article on Hashnode â†—</a>`;

  // Increment read count in Supabase (fire and forget)
  incrementRead(p.slug, p.title).then(() => {
    // Update local cache and refresh badge on the card
    readCountsCache.map[p.slug] = (readCountsCache.map[p.slug] || 0) + 1;
    readCountsCache.total = (readCountsCache.total || 0) + 1;
    // Refresh the badge on whichever card is currently visible
    document.querySelectorAll('.blog-card').forEach(card => {
      if (card.querySelector('.blog-title')?.textContent === p.title) {
        let badge = card.querySelector('.blog-views');
        const newCount = readCountsCache.map[p.slug];
        if (badge) {
          badge.textContent = `ðŸ‘ ${newCount.toLocaleString()}`;
        } else {
          const metaRight = card.querySelector('.blog-meta > div');
          if (metaRight) {
            badge = document.createElement('span');
            badge.className = 'blog-views';
            badge.textContent = `ðŸ‘ ${newCount.toLocaleString()}`;
            metaRight.prepend(badge);
          }
        }
    }});
    updateTotalReadsHeading(readCountsCache.total);
  });

  document.getElementById('modal-inner').innerHTML = `
    ${heroImg}
    <div class="modal-content">
      <div class="modal-tags">${tags}</div>
      <div class="modal-title">${p.title}</div>
      <div class="modal-date">Published ${date}</div>
      ${readFullBtn}
      <div id="modal-body-loader" style="text-align:center;padding:2rem;color:var(--text3);">
        <div style="font-size:1.5rem;margin-bottom:0.5rem;">â³</div>Loading article...
      </div>
    </div>`;

  // FIX 2: Fetch full content lazily â€” only when modal opens
  try {
    const safeSlug = String(p.slug).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const query = `{
      publication(host: "techyatra.hashnode.dev") {
        post(slug: "${safeSlug}") {
          content { html }
        }
      }
    }`;
    const res = await fetch('https://gql.hashnode.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const html = data?.data?.publication?.post?.content?.html || '';

    const ytMatch = html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    const videoId = ytMatch ? ytMatch[1] : null;
    const ytBox = videoId ? `
      <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="modal-yt-box">
        <div class="modal-yt-icon">â–¶</div>
        <div class="modal-yt-text">
          <div class="label">Watch on YouTube</div>
          <div class="title">${p.title}</div>
        </div>
      </a>` : '';

    let contentHtml = html;
    contentHtml = contentHtml.replace(/<img[^>]*>/, '');

    document.getElementById('modal-body-loader').outerHTML = `
      ${ytBox}
      <div class="modal-article">${contentHtml || `<p>${p.brief || ''}</p>`}</div>`;

  } catch(err) {
    document.getElementById('modal-body-loader').outerHTML =
      `<div class="modal-article"><p>${p.brief || ''}</p><p style="margin-top:1rem;"><a href="${hashnodeUrl}" target="_blank" style="color:var(--blue);font-weight:700;">Read full article on Hashnode â†’</a></p></div>`;
  }
  requestAnimationFrame(() => {
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.focus();
  });
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  if (modalOpener && typeof modalOpener.focus === 'function') {
    try { modalOpener.focus(); } catch (e) {}
  }
  modalOpener = null;
}

function closeIfOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('modal');
  if (!modal.classList.contains('open')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
    return;
  }
  if (e.key === 'Tab') {
    const focusable = getFocusableInModal();
    if (focusable.length < 2) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});


// â”€â”€ YOUTUBE: Fast loading with reliable proxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FIX 3: Switched to corsproxy.io (faster, more reliable than allorigins.win)
// Also runs in parallel with blog load via Promise.all
async function loadYouTube() {
  const grid = document.getElementById('yt-grid');
  grid.innerHTML = ytSkeletons();

  try {
    // Step 1: Get latest video IDs from RSS feed (no API key needed)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const entries = Array.from(xml.querySelectorAll('entry')).slice(0, 20);
    if (!entries.length) throw new Error('No entries');

    // Extract video IDs and basic metadata
    const videos = entries.map(entry => ({
      id: entry.querySelector('videoId')?.textContent
          || entry.querySelector('id')?.textContent?.split(':').pop(),
      title: entry.querySelector('title')?.textContent || '',
      published: entry.querySelector('published')?.textContent || '',
    })).filter(v => v.id);

    // Step 2: Fetch durations via YouTube Data API v3
    // contentDetails gives ISO 8601 duration e.g. PT5M32S
    const ids = videos.map(v => v.id).join(',');
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${YT_API_KEY}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (apiData.error) throw new Error('API error: ' + apiData.error.message);

    // Parse ISO 8601 duration to seconds
    function parseDuration(iso) {
      const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!m) return 0;
      return (parseInt(m[1]||0)*3600) + (parseInt(m[2]||0)*60) + parseInt(m[3]||0);
    }

    // Build duration map
    const durMap = {};
    (apiData.items || []).forEach(item => {
      durMap[item.id] = parseDuration(item.contentDetails?.duration || '');
    });

    // Step 3: Filter â€” keep only videos longer than 3 minutes (180s)
    const MIN_SECONDS = 180;
    const longVideos = videos
      .filter(v => {
        const dur = durMap[v.id] || 0;
        // If duration missing from API response, skip the video
        return dur >= MIN_SECONDS;
      })
      .slice(0, 6);

    if (!longVideos.length) throw new Error('No long videos found');

    grid.innerHTML = longVideos.map(v => {
      const date = v.published
        ? new Date(v.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const thumb = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
      return buildYTCard(v.id, v.title, thumb, date);
    }).join('');

  } catch (e) {
    console.warn('YouTube load failed:', e.message);
    const fallbackIds = [
      'l4p9i4Y2tg0', 'eiKBa0810Lg', '22HUdc_kMvE',
      '3EPl5a5KkOQ', 'DXFL2qYRlH0', 'sfaGJkfqC_4'
    ];
    grid.innerHTML = fallbackIds.map(id =>
      buildYTCard(id, 'TechYatra', `https://img.youtube.com/vi/${id}/hqdefault.jpg`, '')
    ).join('');
  }
}

function buildYTCard(id, title, thumb, date) {
  return `
    <a class="yt-card" href="https://www.youtube.com/watch?v=${id}" target="_blank">
      <div class="yt-thumb">
        <img src="${thumb}" alt="${title || 'TechYatra video'}" loading="lazy"
          onerror="this.src='https://img.youtube.com/vi/${id}/mqdefault.jpg'"/>
        <div class="yt-overlay"><div class="yt-play">â–¶</div></div>
      </div>
      <div class="yt-body">
        <div class="yt-title">${title || 'TechYatra Video'}</div>
        ${date ? `<div class="yt-date">${date}</div>` : ''}
      </div>
    </a>`;
}

// â”€â”€ FORMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleSub(e) {
  e.preventDefault();
  const input = e.target.querySelector('.sub-input');
  const btn = e.target.querySelector('.btn-white');
  const email = input.value.trim();
  if (!email) return;

  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify({ email })
    });

    if (res.ok || res.status === 409) {
      document.querySelector('.sub-form').innerHTML =
        '<p style="color:#fff;font-weight:700;font-size:1rem;">âœ… Thanks! You\'re subscribed.</p>';
    } else {
      throw new Error('Failed');
    }
  } catch {
    btn.textContent = 'Subscribe â†’';
    btn.disabled = false;
    input.placeholder = 'Something went wrong, try again';
  }
}

async function handleContact(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const fields = e.target.querySelectorAll('.form-ctrl');
  const name    = fields[0].value.trim();
  const email   = fields[1].value.trim();
  const phone   = fields[2].value.trim();
  const subject = fields[3].value.trim();
  const message = fields[4].value.trim();

  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ name, email, phone, subject, message })
    });

    if (res.ok) {
      btn.textContent = 'âœ… Message Sent!';
      setTimeout(() => { e.target.reset(); btn.textContent = 'Send Message ðŸš€'; btn.disabled = false; }, 3000);
    } else {
      throw new Error('Failed');
    }
  } catch {
    btn.textContent = 'Send Message ðŸš€';
    btn.disabled = false;
    alert('Something went wrong. Please try again or email directly at thetechyatra@gmail.com');
  }
}

// â”€â”€ ANIMATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const obs = new IntersectionObserver(entries =>
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));

// â”€â”€ INIT: Run blog + YouTube in PARALLEL for maximum speed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FIX 3 (continued): Promise.all means both fetches start simultaneously
Promise.all([loadBlog(), loadYouTube()]);
// Blog cards: open modal on click / Enter / Space (delegated)
(function initBlogGridActivation() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.blog-card');
    if (!card) return;
    const idx = card.dataset.postIndex;
    if (idx == null || idx === '') return;
    e.preventDefault();
    openModal(parseInt(idx, 10));
  });
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.blog-card');
    if (!card) return;
    const idx = card.dataset.postIndex;
    if (idx == null || idx === '') return;
    e.preventDefault();
    openModal(parseInt(idx, 10));
  });
})();


// â”€â”€ VISITOR COUNT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchVisitorCount() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/site_visits?select=id', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'count=exact',
        'Range': '0-0'
      }
    });
    // Total count is in Content-Range header: 0-0/TOTAL
    const range = res.headers.get('Content-Range');
    if (range) {
      const total = range.split('/')[1];
      const el = document.getElementById('visitor-count');
      if (el && total) {
        const n = parseInt(total);
        el.textContent = n >= 1000 ? (n/1000).toFixed(1)+'k' : n;
        const bar = document.getElementById('visitorBar');
        if (bar && n > 0) bar.style.display = 'flex';
      }
    }
  } catch(e) {}
}
fetchVisitorCount();

// â”€â”€ VISIT TRACKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function trackVisit() {
  try {
    const key = 'ty_visited_' + new Date().toDateString();
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    await fetch(SUPABASE_URL + '/rest/v1/site_visits', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        visited_at: new Date().toISOString(),
        page: window.location.pathname || '/',
        referrer: document.referrer || 'direct',
        screen: window.screen.width + 'x' + window.screen.height
      })
    });
  } catch(e) {}
}
trackVisit();
