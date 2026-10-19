import React, { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class CrownfallErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })
    console.error("[Crownfall Error Boundary Caught]", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "An unexpected rendering error occurred."
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || ""

      return (
        <main
          className="paper-screen"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "var(--paper, #f3e8cf)",
            color: "var(--ink, #252016)",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderBottom: "2px solid var(--gold, #c89b45)",
                paddingBottom: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--burgundy, #711f31)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "18px",
                }}
              >
                !
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "18px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {this.props.fallbackTitle || "Crownfall Chamber Notice"}
                </h2>
                <small style={{ color: "var(--ink-soft, #6d6252)", fontSize: "11px" }}>
                  A recoverable interface exception was intercepted
                </small>
              </div>
            </div>

            <div
              style={{
                background: "var(--surface, #fff8e8)",
                border: "1px solid var(--line, rgba(95,68,28,0.24))",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px 0",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "var(--ink, #252016)",
                }}
              >
                The game encountered an issue displaying this screen.
              </p>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "12px",
                  color: "var(--ink-soft, #6d6252)",
                  lineHeight: 1.5,
                }}
              >
                No game state has been permanently lost. You can return to the main menu or reload the match table below.
              </p>

              {/* Developer Diagnostics (collapsible, safe for players) */}
              <details
                style={{
                  marginTop: "12px",
                  fontSize: "11px",
                  background: "rgba(0,0,0,0.04)",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "var(--gold-300, #ca8a04)",
                  }}
                >
                  Technical Diagnostics (Click to Expand)
                </summary>
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontWeight: 700, color: "var(--red, #8e2338)", marginBottom: "4px" }}>
                    {errorMsg}
                  </div>
                  {stack && (
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontSize: "10px",
                        fontFamily: "monospace",
                        color: "var(--ink-soft, #6d6252)",
                        maxHeight: "140px",
                        overflowY: "auto",
                      }}
                    >
                      {stack}
                    </pre>
                  )}
                </div>
              </details>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingTop: "16px",
            }}
          >
            <button
              type="button"
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                width: "100%",
                minHeight: "48px",
                fontFamily: "Oswald, sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              RETURN TO MAIN MENU
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-secondary"
              style={{
                width: "100%",
                minHeight: "44px",
                fontFamily: "Oswald, sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              RELOAD GAME SESSION
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default CrownfallErrorBoundary
