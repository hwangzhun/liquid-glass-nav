import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const documentRoot = document.documentElement;
let visualViewportFrame = 0;

const syncVisualViewportHeight = () => {
  window.cancelAnimationFrame(visualViewportFrame);
  visualViewportFrame = window.requestAnimationFrame(() => {
    const viewportHeight = Math.round(
      window.visualViewport?.height ?? window.innerHeight
    );
    documentRoot.style.setProperty(
      "--visual-viewport-height",
      `${viewportHeight}px`
    );
  });
};

syncVisualViewportHeight();
window.visualViewport?.addEventListener("resize", syncVisualViewportHeight);
window.visualViewport?.addEventListener("scroll", syncVisualViewportHeight, {
  passive: true,
});
window.addEventListener("orientationchange", syncVisualViewportHeight);

createRoot(document.getElementById("root")!).render(<App />);
