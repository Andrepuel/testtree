import {assertEquals, equal} from 'https://deno.land/std/testing/asserts.ts';

type EmptyStruct = Record<string, undefined>
type AsyncSuiteBody<U> = (test: Suite<U>, input: U|EmptyStruct) => Promise<void>;
type SyncSuiteBody<U> = (test: Suite<U>, input: U|EmptyStruct) => void;
type SuiteBody<U> = AsyncSuiteBody<U> | SyncSuiteBody<U>;
type AsyncTestBody = () => Promise<void>;
type SyncTestBody = () => void;
type TestBody = AsyncTestBody | SyncTestBody;

function joinName(a: string, b?: string) {
    return [a, b].filter((x) => x).join(' ');
}

export function suite<U=EmptyStruct>(name: string, cb: AsyncSuiteBody<U>): Promise<void>;
export function suite<U=EmptyStruct>(name: string, cb: SyncSuiteBody<U>): void;
export function suite<U=EmptyStruct>(name: string, cb: SuiteBody<U>): Promise<void>|void {
    const namer = (t: Suite<U>) => {
        return t.suite(`${name}:`, cb);
    }
    const suite = new SuiteRegister<U>('', [], namer);

    return namer(suite);
}

function promisifyFinally(cb: () => Promise<void>|void, finall: () => void): Promise<void>|void {
    try {
        const x = cb();
        if (x instanceof Promise) {
            x.finally(finall);
        } else {
            finall();
        }
        return x;
    } catch(e) {
        finall();
        throw e;
    }
}

export interface Suite<U=EmptyStruct> {
    test(name: string, cb: AsyncTestBody, input?: U): Promise<void>|void;
    test(name: string, cb: SyncTestBody, input?: U): void;
    test(name: string, cb: TestBody, input?: U): Promise<void>|void;
    suite(name: string, cb: AsyncSuiteBody<U>): Promise<void>|void;
    suite(name: string, cb: SyncSuiteBody<U>): void;
    suite(name: string, cb: SuiteBody<U>): Promise<void>|void;
    later<T>(cb: () => Promise<T>): Promise<T>;
    later<T>(cb: () => T): T;
    later<T>(cb: () => Promise<T>|T): Promise<T>|T;
}

function bind<U>(suite: Suite<U>): Suite<U> {
    return {
        later: suite.later.bind(suite),
        test: suite.test.bind(suite),
        suite: suite.suite.bind(suite),
    }
}

export class SuiteLockedError extends Error {
    constructor(public readonly suiteName: string, public readonly elementName: string) {
        super(`Tried to register ${JSON.stringify(elementName)} on locked suite ${JSON.stringify(suiteName)}`);
    }
}
class SuiteRegister<U> implements Suite<U> {
    private id: number = 0;
    private locked: boolean = false;

    constructor(private name: string, private idPrefix: number[], private cb: (t: Suite<U>, input: U|EmptyStruct) => void) {
    }

    test(name: string, _: TestBody, inputArg?: U): Promise<void>|void {
        const input = inputArg ? inputArg : {};
        this.checkLock(name);
        const testName = joinName(this.name, name);
        const thisId = this.idPrefix.concat([this.id++]);
        Deno.test(testName, () => {
            const runner = new SuiteRunner<U>('', [], testName, thisId, input);
            return this.cb(runner, input);
        });
    }

    suite(name: string, cb: SuiteBody<U>): Promise<void>|void {
        this.checkLock(name);
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        const suite = new SuiteRegister(testName, thisId, this.cb);

        this.lock();
        return promisifyFinally(
            () => cb(bind(suite), {} as any),
            () => {
                this.unlock();
                suite.lock();
            }
        );
    }

    later<T>(cb: () => Promise<T>): T {
        return {} as any;
    }

    lock() {
        this.locked = true;
    }

    unlock() {
        this.locked = false;
    }

    checkLock(name: string) {
        if (this.locked) throw new SuiteLockedError(this.name, name);
    }
}

class SuiteRunner<U> implements Suite<U> {
    private id: number = 0;

    constructor(private name: string, private idPrefix: number[], private filterName: string, private filterId: number[], private input: U | EmptyStruct) {
    }

    test(name: string, cb: TestBody): Promise<void>|void {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        if (equal(thisId, this.filterId)) {
            assertEquals(testName, this.filterName, `Undeterministic test suite, should run ${JSON.stringify(this.filterName)} but is running ${JSON.stringify(testName)}`);
            return cb();
        }
    }

    suite(name: string, cb: SuiteBody<U>): Promise<void>|void {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        if (equal(thisId, this.filterId.slice(0, thisId.length))) {
            const suite = bind(new SuiteRunner(testName, thisId, this.filterName, this.filterId, this.input));
            return cb(suite, this.input);
        }
    }

    later<T>(cb: () => Promise<T>): Promise<T> {
        return cb();
    }
}