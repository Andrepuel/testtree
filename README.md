Test Tree
=========

Specify tests scenarios on Deno with multiple branching.


Example
-------
In the following example. Each unit test will print a different random value, because the whole path
will be evaluated again.

    suite('basic tree concept', (t) => {
        console.log(''); // Breakline
        const x = Math.random();

        t.test('upper', () => {
            console.log(x);
        });

        t.suite('inner suite', (t) => {
            t.test('one', () => {
                console.log(x);
            })

            t.test('two', () => {
                console.log(x);
            });

            t.suite('more suite', (t) => {
                t.test('last test', () => {
                    console.log(x);
                });
            });
        });
    });