// Accept local Mexican numbers only; retain canonical storage for existing accounts.
export function normalizePhone(value){
 if(typeof value!=='string'||value.length>20||!/^([0-9 ()-]+)$/.test(value))return null;
 const digits=value.replace(/\D/g,'');
 return /^\d{10}$/.test(digits)?'+52'+digits:null;
}

export function normalizeName(value){
 if(typeof value!=='string')return null;
 const name=value.normalize('NFKC').trim().replace(/\s+/g,' ');
 return /^[\p{L}\p{M} .’'-]{2,60}$/u.test(name)&&/\p{L}/u.test(name)?name:null;
}
