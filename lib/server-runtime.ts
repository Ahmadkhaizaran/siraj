export type SirajRuntime = {
  DB?: {withSession(mode:string):D1DatabaseSession};
  SIRAJ_PASSWORD_PEPPER?:string;
  SIRAJ_SETUP_TOKEN_HASH?:string;
  SIRAJ_LEGACY_AUTH_URL?:string;
};
export async function defaultRuntime():Promise<SirajRuntime>{
  const {env}=await import('cloudflare:workers');
  return env;
}
