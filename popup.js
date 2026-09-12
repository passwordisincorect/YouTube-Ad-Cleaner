'use strict';

const toggle = document.getElementById('enabled');
const status = document.getElementById('status');

function render(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? 'Đang chặn quảng cáo' : 'Đang tắt';
}

chrome.storage.sync.get({ enabled: true }, (settings) => {
  render(settings.enabled !== false);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled }, () => render(enabled));
});
