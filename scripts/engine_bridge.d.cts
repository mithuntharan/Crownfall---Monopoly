export interface EngineBridge {
  createViteMiddleware: () => import('vite').Connect.NextHandleFunction;
  handleEngineRequest: (req: any, res: any) => void;
  engineProcess: any;
  CppEngineProcess: any;
}
declare const engineBridge: EngineBridge;
export default engineBridge;
