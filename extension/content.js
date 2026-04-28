const seen = new Set();

function toTweetId(article) {
  const anchor = article.querySelector('a[href*="/status/"]');
  if (!anchor) return null;
  const match = anchor.getAttribute('href')?.match(/status\/(\d+)/);
  return match?.[1] || null;
}

function extractTweet(article) {
  const tweetId = toTweetId(article);
  if (!tweetId || seen.has(tweetId)) return null;
  const textNode = article.querySelector('[data-testid="tweetText"]');
  const text = (textNode?.innerText || article.innerText).slice(0, 1000);
  const handleNode = article.querySelector('a[role="link"][href^="/"]');
  const author = handleNode?.getAttribute('href')?.replace('/', '') || 'unknown';
  const isMention = text.includes('@');
  seen.add(tweetId);
  return { type: 'tweet', tweetId, text, author, isMention };
}

function insertText(el, text) {
  el.focus();
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('insertText', false, text);
}

function clickReplyAndSend(tweetId, reply) {
  const anchors = [...document.querySelectorAll('a[href*="/status/"]')];
  const target = anchors.find((a) => a.getAttribute('href')?.includes(`/status/${tweetId}`));
  const article = target?.closest('article');
  if (!article) return;

  const replyButton = article.querySelector('button[data-testid="reply"]');
  replyButton?.click();

  setTimeout(() => {
    const composer = document.querySelector('div[data-testid="tweetTextarea_0"]');
    if (!composer) return;
    insertText(composer, reply);
    setTimeout(() => {
      const postBtn = document.querySelector('button[data-testid="tweetButton"]');
      postBtn?.click();
      chrome.runtime.sendMessage({ type: 'posted', tweetId });
    }, 900 + Math.random() * 1400);
  }, 700 + Math.random() * 1700);
}

function scan() {
  const articles = document.querySelectorAll('article');
  for (const article of articles) {
    const payload = extractTweet(article);
    if (payload) chrome.runtime.sendMessage(payload);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'post_reply') {
    clickReplyAndSend(String(msg.tweetId), String(msg.reply));
  }
});

setInterval(scan, 2500);
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ type: 'heartbeat', source: 'content_loaded' });
  setTimeout(scan, 1000);
});
