import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import CrownfallErrorBoundary from "./components/CrownfallErrorBoundary"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CrownfallErrorBoundary fallbackTitle="Crownfall Root Engine">
      <App />
    </CrownfallErrorBoundary>
  </React.StrictMode>,
)

