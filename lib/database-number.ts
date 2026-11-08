/** Keep bigint identifiers exact while allowing finite scores and percentages. */
export function databaseNumber(value:unknown,type:number){const number=Number(value);if(!Number.isFinite(number)||Math.abs(number)>Number.MAX_SAFE_INTEGER||[20,21,23].includes(type)&&!Number.isSafeInteger(number))throw Error('Unsafe numeric result');return number;}
