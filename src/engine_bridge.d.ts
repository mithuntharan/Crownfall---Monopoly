declare module "./scripts/engine_bridge.cjs" {
  export interface EngineBridge {
    createViteMiddleware: () => import("vite").Connect.NextHandleFunction
    handleEngineRequest: (req: any, res: any) => void
    engineProcess: any
    CppEngineProcess: any
  }
  const engineBridge: EngineBridge
  export default engineBridge
}
