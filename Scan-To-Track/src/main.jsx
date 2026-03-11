import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import Swal from "sweetalert2";

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    Swal.fire({
      icon: "info",
      title: "May bagong update",
      text: "Nagre-refresh ang app para sa latest version...",
      timer: 1800,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      localStorage.setItem("app_version", APP_VERSION);
      updateSW(true);
    });
  },
});

localStorage.setItem("app_version", APP_VERSION);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);