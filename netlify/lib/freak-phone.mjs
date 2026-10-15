// Mexican local numbers and explicit international E.164 numbers share one key.
export function normalizePhone(value){
 if(typeof value!=='string'||value.length>32||!/^[+\d ()-]+$/.test(value.trim()))return null;
 const raw=value.trim(),digits=raw.replace(/\D/g,'');
 if(digits.length===10&&!raw.startsWith('+'))return '+52'+digits;
 if(digits.length===12&&digits.startsWith('52'))return '+'+digits;
 if(raw.startsWith('+')&&/^[1-9]\d{7,14}$/.test(digits))return '+'+digits;
 return null;
}
