declare module 'argon2-browser' {
  export enum ArgonType {
    Argon2d = 0,
    Argon2i = 1,
    Argon2id = 2,
  }

  export interface Argon2HashOptions {
    pass: string
    salt: string
    type?: ArgonType
    mem?: number
    time?: number
    parallelism?: number
    hashLen?: number
  }

  export interface Argon2HashResult {
    hash: Uint8Array
    hashHex: string
    encoded: string
  }

  export function hash(options: Argon2HashOptions): Promise<Argon2HashResult>
  export function verify(options: { pass: string; encoded: string }): Promise<boolean>
}
