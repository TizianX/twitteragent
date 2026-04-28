let port = null;
let queue = [];

function connect() {
  if (port && port.readyState === WebSocket.OPEN) return;
  port = new WebSocket('ws://127.0.0.1:3031');

  port.onopen = () => {
    send({ type: 'heartbeat', source: 'background_open' });
    while (queue.length) {
      port.send(queue.shift());
    }
  };

  port.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] }, (tabs) => {
        for (const tab of tabs) {
          if (!tab.id) continue;
          chrome.tabs.sendMessage(tab.id, data);
        }
      });
    } catch {}
  };

  port.onclose = () => {
    setTimeout(connect, 2500);
  };
}

function send(data) {
  const payload = JSON.stringify(data);
  if (!port || port.readyState !== WebSocket.OPEN) {
    queue.push(payload);
    connect();
    return;
  }
  port.send(payload);
}

chrome.runtime.onMessage.addListener((msg) => {
  send(msg);
});

setInterval(() => send({ type: 'heartbeat', source: 'background_interval' }), 15000);

connect();
