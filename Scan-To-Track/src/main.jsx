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
      icon: "warning",
      title: "Need Update",
      text: "May bagong update ang system. I-update ngayon para makuha ang latest changes.",
      confirmButtonText: "Update Now",
      confirmButtonColor: "#8B1A1A",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      localStorage.setItem("app_version", APP_VERSION);
      Promise.resolve(updateSW(true)).catch(() => {
        window.location.reload();
      });
    });
  },
});

localStorage.setItem("app_version", APP_VERSION);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);