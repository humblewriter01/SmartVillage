export interface TTSWorkerRequest { id: number; text: string }
export type TTSWorkerResponse =
  | { id: number; type: 'audio'; samples: Float32Array; sampleRate: number }
  | { id: number; type: 'error'; message: string };
