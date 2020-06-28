import {suite} from './mod.ts';
import {assertEquals} from 'https://deno.land/std/testing/asserts.ts';

debugger;
let globalCounter = 0;

suite('basic tree concept', (t) => {
    const x = globalCounter++;

    t.test('upper', () => {
        assertEquals(x, 1);
    });

    t.suite('inner suite', (t) => {
        t.test('one', () => {
            assertEquals(x, 2);
        })

        t.test('two', () => {
            assertEquals(x, 3);
        });

        t.suite('more suite', (t) => {
            t.test('last test', () => {
                assertEquals(x, 4);
            });
        });
    });
});
Deno.test('basic tree concept finally', () => {
    assertEquals(globalCounter, 5);
});