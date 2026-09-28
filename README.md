# Peek

A Chrome extension that keeps a live thumbnail of a tab in a small window that stays
on top of everything else — other tabs, other windows, other apps. Your browser stays
open as it is. Click the thumbnail to jump straight back to its tab.

Handy for keeping an eye on a video, a build, a live dashboard, a stream or a chat
while you work somewhere else.

## Install

### From source

1. Download or clone this repository.
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Optional: pin the icon to the toolbar (puzzle piece → pin next to Peek).

After changing the code, press the reload button on the extension's card, then reload
the pages you are testing on.

## Usage

Three ways to start. Each one toggles — using it again closes the thumbnail:

- **The toolbar icon.**
- **Alt+Shift+P.** Change it in `chrome://extensions/shortcuts`.
- **Right-click the page → Peek at this tab.** The tab strip's own right-click menu is
  closed to extensions, so the entry lives on the page.

The toolbar icon shows the tab's state: **grey, with an empty thumbnail** when the tab
isn't being peeked at, **in colour, with the thumbnail filled in** while it is.

**Click the thumbnail** to go back to the tab. If you minimized the browser in the
meantime, its window comes back the way it was.

## Limitations

- Only the page's content is shown — no address bar or tabs. Extensions have no access
  to the browser's own interface.
- The thumbnail is for watching, not for using: clicks inside it take you back to the
  tab rather than reaching the page.
- It can't run on `chrome://` pages, the Chrome Web Store, or other pages where the
  browser doesn't allow extensions. The icon then shows a red “!” for a few seconds,
  and hovering over it tells you why.
- One thumbnail at a time. A video that a site puts into picture-in-picture replaces it.
- While a tab is being captured, the browser shows its sharing indicator on that tab.

## Privacy

Peek collects no data. It has no account, no analytics and no servers, and it runs only
on the tab where you start it, only when you start it. The tab's image is shown locally
in the thumbnail and is never recorded, stored or sent anywhere.

Full privacy policy: <https://justzet.github.io/Peek/privacy.html>

## How it works

| File | What it does |
|---|---|
| `manifest.json` | permissions, icon, keyboard shortcut |
| `background.js` | starts from the icon, the shortcut and the context menu; hands the tab its own video stream id (`tabCapture`); brings the tab back to the front; swaps the icon to match the state |
| `peek.js` | defines `__peekToggle`: the *Document Picture-in-Picture* window, the tab's live image, the click on the thumbnail |
| `run.js` | calls `__peekToggle` after injection from the icon, the shortcut or the menu |
| `docs/privacy.html` | the privacy policy, served by GitHub Pages |

The picture-in-picture window is requested first, before anything is awaited. The
browser only opens it while your click is still fresh, and fetching the video stream
goes through the service worker and takes a moment.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Access to the single tab where you start Peek, only at that moment. |
| `tabCapture` | The live video of that tab, shown in the thumbnail. Video only, never audio. |
| `scripting` | Runs Peek's own bundled script in that tab to open the thumbnail window. |
| `contextMenus` | Adds “Peek at this tab” to the page's right-click menu. |

Peek does not ask for access to all websites, your history, bookmarks or cookies, and it
never loads code from the internet.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/JustZet/Peek/issues).
