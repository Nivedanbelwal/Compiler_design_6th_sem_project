import { tokenizeSmart, SmartParser, SmartInterpreter } from './smartCompiler.js';

const defaultC = `#include <stdio.h>

int main() {
    int a = 10;
    int b = 20;
    int c = a + b * 5;
    int d = (a + b) / 2;
    
    return 0;
}`;

console.log("--- TOKENIZING ---");
const tokens = tokenizeSmart(defaultC);
console.log(tokens.map(t => `${t.type}: '${t.value}'`));

console.log("\n--- PARSING ---");
const parser = new SmartParser(tokens);
const ast = parser.parse();
console.log("Errors:", ast.errors);
console.log("Functions:", ast.functions);

console.log("\n--- INTERPRETING ---");
const interpreter = new SmartInterpreter();
const runResult = interpreter.execute(ast);
console.log("Variables in Symbol Table:", runResult.variables);
console.log("Interpreter Errors:", runResult.errors);
