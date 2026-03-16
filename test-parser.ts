import { parseFlightMessage } from './src/utils/message-parser';

const testCase1 = `Gostaria de emitir em tabela fixa:
-> Origem e Destino: JFK - MAN
-> Data de ida: 16/03/2026
-> Classe: PREMIUM ECONOMY
-> Companhia parceira: Virgin
-> Adultos: 1
-> Crianças: 0
-> Bebês: 0
-> Voo: 19:40
Naftali Horowitz 14 Aug 2002`;

const testCase2 = `Naftali Horowitz 14 Aug 2002`;

console.log("--- TEST CASE 1 ---");
console.log(JSON.stringify(parseFlightMessage(testCase1), null, 2));

console.log("\n--- TEST CASE 2 ---");
console.log(JSON.stringify(parseFlightMessage(testCase2), null, 2));
