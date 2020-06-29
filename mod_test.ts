import {suite, Suite} from './mod.ts';
import {assert, assertEquals} from 'https://deno.land/std/testing/asserts.ts';

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

async function delayed(): Promise<number> {
    await new Promise(ok => setTimeout(ok, 100));
    return globalCounter++;
}

await suite('with async', async (t) => {
    const x = await t.later(delayed);

    await t.test('registering did not invoke delayed', async () => {
        assertEquals(x, 5);
    });

    await t.test('asynchronous test', async () => {
        assertEquals(x, 6);
        assertEquals(await delayed(), 7);
    });
});
Deno.test('with async finally', () => {
    assertEquals(globalCounter, 8);
});

let failureCounts = 0;
suite('accidental access of "locked" suite is disallowed', (outer) => {
    let innerOnOuter: Suite;
    outer.suite('inside', (inner) => {
        innerOnOuter = inner;
        try {
            outer.test('should fail', () => {
                assert(false, 'should not be able to register test using outer');
            });
        } catch(e) {
            Deno.test('registration of test using outer suite failed: ' + e.message, () => {
                failureCounts++;
            });
        }

        try {
            outer.suite('should fail', () => {
                Deno.test('should fail', () => {
                    assert(false, 'should not be able to register suite using outer')
                })
            });
        } catch(e) {
            Deno.test('registration of suite using outer suite failed: ' + e.message, () => {
                failureCounts++;
            })
        }
    });

    try {
        innerOnOuter!.test('should fail', () => {
            assert(false, 'should not be able to register test using ended suite');
        });
    } catch(e) {
        Deno.test('registration of test using ended suite failed: ' + e.message, () => {
            failureCounts++;
        });
    }

    try {
        innerOnOuter!.suite('should fail', () => {
            Deno.test('should fail', () => {
                assert(false, 'should not be able to register suite using ended suite')
            })
        });
    } catch(e) {
        Deno.test('registration of suite using ended suite failed: ' + e.message, () => {
            failureCounts++;
        })
    }
});
Deno.test('accidental access of "locked" suite is disallowed finally', () => {
    assertEquals(failureCounts, 4);
})