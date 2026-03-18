import { parseFlightMessage } from './src/utils/message-parser';

const input = `Joel	Rubinstein	02/02/1982	lga	stl	6:59 PM	June 3
Pessy	Rubinstein	Nov. 28, 1981	lga	stl	6:59 PM	June 3
Hershy	Rubinstein	Feb. 16, 2021	lga	stl	6:59 PM	June 3
Shmeil	Rubinstein	Jan. 21, 2007`;

console.log('--- TESTING PARSER ---');
try {
    const result = parseFlightMessage(input);
    console.log(JSON.stringify(result, null, 2));
} catch (err) {
    console.error('Parser crashed:', err);
}
