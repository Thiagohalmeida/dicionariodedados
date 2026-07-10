// Global type declarations for Node.js environment
// File and Blob types are browser globals, but orval generates them for multipart/form-data

declare global {
  interface File {
    readonly lastModified: number;
    readonly name: string;
    readonly size: number;
    readonly type: string;
    slice(start?: number, end?: number, contentType?: string): File;
    stream(): ReadableStream;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  var File: {
    prototype: File;
    new (
      fileBits: BlobPart[],
      fileName: string,
      options?: FilePropertyBag,
    ): File;
  };

  interface Blob {
    readonly size: number;
    readonly type: string;
    slice(start?: number, end?: number, contentType?: string): Blob;
    stream(): ReadableStream;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  var Blob: {
    prototype: Blob;
    new (blobParts?: BlobPart[], options?: BlobPropertyBag): Blob;
  };

  type BlobPart = BufferSource | Blob | string;
  interface FilePropertyBag {
    lastModified?: number;
    type?: string;
  }
  interface BlobPropertyBag {
    type?: string;
    endings?: "transparent" | "native";
  }
}
