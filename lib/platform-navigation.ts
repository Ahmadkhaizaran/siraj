export const PLATFORM_GROUPS=[
 {id:'communication',label:'التواصل والمراسلات',pages:['broadcast','support']},
 {id:'community',label:'الجهات والأنشطة والإنجازات',pages:['institutions','calendar','race','achievements']},
 {id:'accounts',label:'الحسابات والفريق',pages:['team','platform-team']},
] as const;
export function platformGroup(page:string){
 const normalized=page==='institution'?'institutions':page;
 return PLATFORM_GROUPS.find(group=>(group.pages as readonly string[]).includes(normalized));
}
