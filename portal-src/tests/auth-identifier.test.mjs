import test from 'node:test';
import assert from 'node:assert/strict';
import {loginCredentials} from '../auth-identifier.js';
test('e-mail continua funcionando e é normalizado',()=>assert.deepEqual(loginCredentials(' Teste@Example.com ','secret'),{email:'teste@example.com',password:'secret'}));
test('telefone com DDD, pontuação e prefixo internacional convergem',()=>{
 for(const value of ['(41) 99999-1234','41999991234','+55 41 99999-1234','0055 41 99999-1234'])assert.deepEqual(loginCredentials(value,'secret'),{phone:'+5541999991234',password:'secret'});
});
test('telefone fixo completo é aceito sem alterar dígitos',()=>assert.equal(loginCredentials('(41) 3333-1234','secret').phone,'+554133331234'));
test('não presume DDD nem acrescenta o nono dígito',()=>{
 for(const value of ['999991234','41 9840-2800','123','', '+1 212 555 1234'])assert.throws(()=>loginCredentials(value,'secret'));
});
test('acesso administrativo exige e-mail',()=>assert.throws(()=>loginCredentials('(41) 99999-1234','secret',true)));
