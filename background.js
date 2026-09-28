/*
  Peek — the browser side.

  Does what a page cannot do on its own:
    1. starts a peek from the toolbar icon, the shortcut and the page's
       right-click menu, by injecting `peek.js` + `run.js` into the tab;
    2. hands the page the stream id of its own tab (`tabCapture`);
    3. brings the tab back to the front when the thumbnail is clicked;
    4. marks the icon while a thumbnail is open.

  Injection happens right away, with no `await` before it: Chrome only opens a
  picture-in-picture window while your click is still fresh, and `peek.js`
  asks for the window first thing.
*/

const MENU_ID = "peek";
const TITLE = "Peek at this tab";

chrome.action.onClicked.addListener(peek);

/*
  The tab strip's own right-click menu is closed to extensions in Chrome, so
  the menu entry lives on the page instead.

  Created on install and update only: Chrome remembers menus across restarts,
  and creating it on every service-worker wake-up would fail with a duplicate id.
*/
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: TITLE,
      contexts: ["page", "frame", "selection", "link", "image", "video"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) {
    peek(tab);
  }
});

function peek(tab) {
  if (tab.id == null) {
    return;
  }
  chrome.scripting
    .executeScript({ target: { tabId: tab.id }, files: ["peek.js", "run.js"] })
    .catch((error) => flag(tab.id, error));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tab = sender.tab;
  if (!tab || tab.id == null) {
    return false;
  }

  switch (message?.type) {
    case "peek:stream":
      // The stream belongs to the tab itself and only that tab may use it (`consumerTabId`).
      chrome.tabCapture
        .getMediaStreamId({ targetTabId: tab.id, consumerTabId: tab.id })
        .then((streamId) => sendResponse({ streamId }))
        .catch((error) => sendResponse({ error: String(error?.message ?? error) }));
      return true;

    case "peek:opened":
      mark(tab.id, true);
      return false;

    case "peek:closed":
      mark(tab.id, false);
      return false;

    case "peek:open":
      focus(tab);
      return false;

    case "peek:failed":
      flag(tab.id, message.error);
      return false;
  }
  return false;
});

/*
  Back to the tab. Focusing a window also restores it if you minimized it
  yourself, in whatever state it had — maximized stays maximized.
*/
async function focus(tab) {
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
}

/*
  The icon itself tells the state, per tab: a grey outline with an empty
  thumbnail when idle, full colour with the thumbnail filled in while this tab
  is being peeked at. A badge dot was too small to read at a glance.
*/
const ICONS = {
  idle: { 16: "icons/idle16.png", 32: "icons/idle32.png" },
  active: { 16: "icons/active16.png", 32: "icons/active32.png" },
};

function mark(tabId, open) {
  chrome.action.setIcon({ tabId, path: open ? ICONS.active : ICONS.idle });
  chrome.action.setTitle({ tabId, title: open ? "Peeking — click to stop" : TITLE });
}

/*
  When it can't run — `chrome://` pages, the Web Store, plain `http` — the icon
  gets a red "!" for a few seconds and the reason goes into its tooltip.
*/
function flag(tabId, error) {
  const reason = String(error?.message ?? error ?? "unknown error");
  console.warn("[Peek]", reason);
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#D9443F" });
  chrome.action.setBadgeText({ tabId, text: "!" });
  chrome.action.setTitle({ tabId, title: `Peek can't run here: ${reason}` });
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: TITLE });
  }, 4000);
}
