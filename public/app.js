const form = document.getElementById('shorten-form');
const urlInput = document.getElementById('url');
const codeInput = document.getElementById('code');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');

const resultSection = document.getElementById('result');
const resultLink = document.getElementById('result-link');
const copyBtn = document.getElementById('copy-btn');

const refreshBtn = document.getElementById('refresh-btn');
const linksEmpty = document.getElementById('links-empty');
const linksTable = document.getElementById('links-table');
const linksBody = document.getElementById('links-body');

const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 1600);
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = '';
}

function formatDate(isoLike) {
  const d = new Date(isoLike.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return isoLike;
  return d.toLocaleString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    if (!res.ok) throw new Error('Failed to load links');
    const links = await res.json();
    renderLinks(links);
  } catch (err) {
    showToast('Could not load links.');
  }
}

function renderLinks(links) {
  linksBody.innerHTML = '';

  if (!links.length) {
    linksEmpty.hidden = false;
    linksTable.hidden = true;
    return;
  }

  linksEmpty.hidden = true;
  linksTable.hidden = false;

  for (const link of links) {
    const tr = document.createElement('tr');

    const codeTd = document.createElement('td');
    const codeLink = document.createElement('a');
    codeLink.href = link.shortUrl;
    codeLink.target = '_blank';
    codeLink.rel = 'noopener';
    codeLink.className = 'code-link';
    codeLink.textContent = link.code;
    codeTd.appendChild(codeLink);

    const urlTd = document.createElement('td');
    urlTd.className = 'url-cell';
    urlTd.title = link.url;
    urlTd.textContent = link.url;

    const clicksTd = document.createElement('td');
    clicksTd.textContent = link.clicks;

    const createdTd = document.createElement('td');
    createdTd.textContent = formatDate(link.createdAt);

    const actionsTd = document.createElement('td');
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'row-actions';
    const copyRowBtn = document.createElement('button');
    copyRowBtn.type = 'button';
    copyRowBtn.textContent = 'Copy';
    copyRowBtn.addEventListener('click', async () => {
      const ok = await copyToClipboard(link.shortUrl);
      showToast(ok ? 'Copied to clipboard' : 'Could not copy');
    });
    actionsWrap.appendChild(copyRowBtn);
    actionsTd.appendChild(actionsWrap);

    tr.append(codeTd, urlTd, clicksTd, createdTd, actionsTd);
    linksBody.appendChild(tr);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  resultSection.hidden = true;

  const url = urlInput.value.trim();
  const code = codeInput.value.trim();

  const payload = { url };
  if (code) payload.code = code;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Shortening...';

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    resultLink.href = data.shortUrl;
    resultLink.textContent = data.shortUrl;
    resultSection.hidden = false;

    urlInput.value = '';
    codeInput.value = '';
    loadLinks();
  } catch (err) {
    showError('Could not reach the server. Is it running?');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Shorten';
  }
});

copyBtn.addEventListener('click', async () => {
  const ok = await copyToClipboard(resultLink.href);
  showToast(ok ? 'Copied to clipboard' : 'Could not copy');
});

refreshBtn.addEventListener('click', loadLinks);

loadLinks();
