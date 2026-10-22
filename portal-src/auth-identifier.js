export function loginCredentials(identifier,password,admin=false){
 const value=String(identifier||'').trim();
 if(value.includes('@'))return {email:value.toLowerCase(),password};
 if(admin)throw new Error('Use o e-mail autorizado para entrar na área administrativa.');
 let digits=value.replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if((digits.length===12||digits.length===13)&&digits.startsWith('55'))digits=digits.slice(2);
 if(!/^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(digits))throw new Error('Informe seu e-mail ou telefone completo com DDD.');
 return {phone:'+55'+digits,password};
}
