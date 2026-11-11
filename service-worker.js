chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
