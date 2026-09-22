/// <reference types="vite/client" />

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_HANDBOOK_PDF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
