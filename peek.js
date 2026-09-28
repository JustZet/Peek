/*
  Peek — the page side. Defines `__peekToggle`, and nothing else happens here.

  `run.js` calls it, injected right after this file on every click of the
  toolbar icon, the shortcut or the menu entry. Both run in the extension's
  isolated world, which stays the same across injections, so the open
  thumbnail is found again and a second call closes it.

  Order matters. The picture-in-picture window is requested before anything
  is awaited: Chrome only opens it while the click is still fresh (a few
  seconds), and fetching the video stream goes through the service worker and
  takes a moment.
*/
(() => {
  /*
    Defined again after the extension is reloaded: the copy left in an open page
    by the previous version can no longer reach the extension (`chrome.runtime.id`
    goes away), so it would fail on every click.
  */
  const peekAlive = () => {
    try {
      return Boolean(chrome.runtime?.id) && Boolean(window.__peekAlive?.());
    } catch {
      return false;
    }
  };

  if (!window.__peekToggle || !peekAlive()) {
    window.__peekAlive = () => Boolean(chrome.runtime?.id);

    const WIDTH = 360;
    const BUTTON_SECONDS = 6;

    // The capture failed after the window was granted; not a reason for the fallback button.
    class CaptureError extends Error {}

    const report = (error) =>
      chrome.runtime.sendMessage({ type: "peek:failed", error: String(error?.message ?? error) });

    window.__peekToggle = () => {
      if (window.__peek) {
        window.__peek.stop();
        return;
      }
      window.__peekButton?.remove();

      open().catch((error) => {
        /*
          The browser refused the window itself: the click that started us did
          not count as a user gesture here. A click inside the page always does,
          so the page gets a small "Peek" button for a few seconds.
        */
        if (error?.name === "NotAllowedError" && !(error instanceof CaptureError)) {
          offerButton();
          return;
        }
        report(error);
      });
    };

    async function open() {
      if (!("documentPictureInPicture" in window)) {
        throw new Error("this browser has no Document Picture-in-Picture");
      }

      // The thumbnail takes the tab's shape, so there are no black bars.
      const ratio = window.innerWidth / Math.max(window.innerHeight, 1);
      const pip = await documentPictureInPicture.requestWindow({
        width: WIDTH,
        height: Math.round(WIDTH / ratio),
      });

      let stream;
      try {
        stream = await capture();
      } catch (error) {
        pip.close();
        throw error instanceof CaptureError ? error : new CaptureError(error?.message ?? error);
      }

      const video = build(pip.document, stream);
      await video.play().catch(() => {});

      const state = {
        stop() {
          if (window.__peek !== state) {
            return;
          }
          window.__peek = null;
          stream.getTracks().forEach((track) => track.stop());
          pip.close();
          chrome.runtime.sendMessage({ type: "peek:closed" });
        },
      };
      window.__peek = state;

      // A click anywhere on the thumbnail: back to the tab.
      pip.document.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "peek:open" });
        state.stop();
      });
      // Closed from its own X, or the capture was stopped elsewhere.
      pip.addEventListener("pagehide", () => state.stop());
      stream.getVideoTracks()[0]?.addEventListener("ended", () => state.stop());

      chrome.runtime.sendMessage({ type: "peek:opened" });
    }

    /*
      The tab's own image, silently: `tabCapture` is allowed on a tab where you
      started the extension yourself — icon, shortcut or menu — which is the
      only way this code runs.
    */
    async function capture() {
      const reply = await chrome.runtime.sendMessage({ type: "peek:stream" });
      if (!reply?.streamId) {
        throw new CaptureError(reply?.error ?? "no stream");
      }
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: reply.streamId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30,
          },
        },
      });
    }

    // The thumbnail window: just the picture, and a quiet hint on hover.
    function build(doc, stream) {
      doc.title = "Peek";
      const style = doc.createElement("style");
      style.textContent = `
        html, body { margin: 0; height: 100%; background: #000; overflow: hidden; cursor: pointer; }
        video { width: 100%; height: 100%; object-fit: contain; display: block; }
        .hint {
          position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%);
          padding: 4px 10px; border-radius: 999px;
          background: rgba(0, 0, 0, 0.65); color: #fff;
          font: 600 12px system-ui, sans-serif;
          opacity: 0; transition: opacity 0.15s; pointer-events: none;
        }
        body:hover .hint { opacity: 1; }
      `;
      doc.head.append(style);

      const video = doc.createElement("video");
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;

      const hint = doc.createElement("div");
      hint.className = "hint";
      hint.textContent = "Click to open";

      doc.body.append(video, hint);
      return video;
    }

    /*
      The fallback button, in the page's corner, inside a shadow root so the
      site's styles can't reach it. It goes away on its own after a few seconds.
    */
    function offerButton() {
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;";
      const root = host.attachShadow({ mode: "closed" });
      root.innerHTML = `
        <style>
          button {
            padding: 10px 16px; border: 0; border-radius: 999px;
            background: #1f2937; color: #fff; cursor: pointer;
            font: 600 14px system-ui, sans-serif;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
          }
          button:hover { background: #374151; }
        </style>
        <button type="button">Peek</button>
      `;
      const remove = () => {
        host.remove();
        if (window.__peekButton === host) {
          window.__peekButton = null;
        }
      };
      root.querySelector("button").addEventListener("click", () => {
        remove();
        open().catch(report);
      });
      document.documentElement.append(host);
      window.__peekButton = host;
      setTimeout(remove, BUTTON_SECONDS * 1000);
    }
  }
})();
