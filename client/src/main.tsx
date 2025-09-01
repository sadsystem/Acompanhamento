import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration);
      })
      .catch((registrationError) => {
        console.log('SW falhou ao registrar:', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
