// The shared API uses a small prepared-statement interface. PostgreSQL executes
// every batch in one transaction, including score writes and rank notifications.
type Result = {rows:Record<string,any>[];changes:number};
export type PgExecutor = {
  query(sql:string,args:any[]):Promise<Result>;
  transaction<T>(fn:(connection:PgExecutor)=>Promise<T>):Promise<T>;
};

function splitArgs(value:string){
  let level=0,quoted=false,count=1;
  for(let i=0;i<value.length;i++){
    if(value[i]==="'"){if(quoted&&value[i+1]==="'"){i++;continue;}quoted=!quoted;}
    if(!quoted){if(value[i]==='(')level++;if(value[i]===')')level--;if(value[i]===','&&!level)count++;}
  }
  return count;
}
function scalarFunctions(sql:string):string{
  // Convert only SQLite's multi-argument scalar MIN/MAX; retain aggregates.
  let out='',quoted=false;
  for(let i=0;i<sql.length;){
    if(sql[i]==="'"){out+=sql[i++];if(quoted&&sql[i]==="'"){out+=sql[i++];continue;}quoted=!quoted;continue;}
    const match=!quoted&&sql.slice(i).match(/^(MIN|MAX)\s*\(/i);
    if(!match){out+=sql[i++];continue;}
    let end=i+match[0].length,depth=1,q=false;
    const start=end;
    for(;end<sql.length&&depth;end++){
      if(sql[end]==="'"){if(q&&sql[end+1]==="'"){end++;continue;}q=!q;}
      if(!q){if(sql[end]==='(')depth++;if(sql[end]===')')depth--;}
    }
    if(depth)throw new Error('Unbalanced query');
    const args=sql.slice(start,end-1),name=splitArgs(args)>1?(match[1].toUpperCase()==='MIN'?'LEAST':'GREATEST'):match[1];
    out+=name+'('+scalarFunctions(args)+')';i=end;
  }
  return out;
}
export function postgresQuery(input:string){
  let sql=input,ignore=/^INSERT OR IGNORE INTO /i.test(sql);
  sql=sql.replace(/^INSERT OR IGNORE INTO /i,'INSERT INTO ');
  sql=sql.replace(/date\(\?,\s*'-45 days'\)/g,"((?::date - interval '45 days')::date)::text");
  // SUM(bigint) is numeric in PostgreSQL; casting numeric to integer rounds.
  // SQLite truncates these nonnegative rank quotients, so floor explicitly.
  sql=sql.replaceAll('CAST(SUM(points)/35 AS INTEGER)','FLOOR(SUM(points)/35)')
    .replaceAll('CAST((SUM(points)-?+?)/35 AS INTEGER)','FLOOR((SUM(points)-?+?)/35)');
  sql=sql.replaceAll("date(day,'weekday 0','-6 days')","date_trunc('week',day::date)::date::text");
  sql=sql.replaceAll('CAST(?/35 AS INTEGER)','FLOOR(?::numeric/35)');
  sql=scalarFunctions(sql);
  let output='',quoted=false,n=0;
  for(let i=0;i<sql.length;i++){
    if(sql[i]==="'"){output+=sql[i];if(quoted&&sql[i+1]==="'"){output+=sql[++i];continue;}quoted=!quoted;}
    else output+=sql[i]==='?'&&!quoted?'$'+(++n):sql[i];
  }
  if(ignore)output+=' ON CONFLICT DO NOTHING';
  return output;
}
class Statement {
  constructor(readonly executor:PgExecutor,readonly sql:string,readonly args:any[]=[]){}
  bind(...args:any[]){return new Statement(this.executor,this.sql,args);}
  async result(executor=this.executor){return executor.query(postgresQuery(this.sql),this.args);}
  async all<T=Record<string,any>>(){const r=await this.result();return {results:r.rows as T[],meta:{changes:r.changes},success:true};}
  async first<T=Record<string,any>>(column?:string):Promise<T|null>{const r=await this.result();return (column?r.rows[0]?.[column]:r.rows[0])??null;}
  async run(){return this.all();}
}
export function postgresDatabase(executor:PgExecutor){
  const session={
    prepare:(sql:string)=>new Statement(executor,sql),
    async batchChecked(statements:Statement[],required:number[]){return executor.transaction(async tx=>{
      const results=[];for(let i=0;i<statements.length;i++){const r=await statements[i].result(tx);if(required.includes(i)&&r.changes!==1)throw Error('SIRAJ_WRITE_CONFLICT');results.push({results:r.rows,meta:{changes:r.changes},success:true});}return results;
    });},
    async batch(statements:Statement[]){return executor.transaction(async tx=>{
      const results=[];
      for(const statement of statements){const r=await statement.result(tx);results.push({results:r.rows,meta:{changes:r.changes},success:true});}
      return results;
    });},
  };
  return {withSession:()=>session as unknown as D1DatabaseSession};
}
