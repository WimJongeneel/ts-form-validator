export interface SyncRule<a> {
    /**
     * The kind of this rule
     */
    kind: 'sync-rule'
    
    /**
     * Compose this rule via an AND operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    and(r: SyncRule<a>): SyncRule<a>
    
    /**
     * Compose this rule via an OR operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    or(r: SyncRule<a>): SyncRule<a>
    
    /**
     * Run this validator
     * @param v     the value to validate
     */
    run: (v: a) => Result

    /**
     * Turn this Rule into an AsyncRule for composition with async rules
     */
    async: () => AsyncRule<a>
}

export interface AsyncRule<a> {
    /**
     * The kind of this rule
     */
    kind: 'async-rule'

    /**
     * Compose this rule via an AND operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    and: (r: AsyncRule<a>) => AsyncRule<a>

    /**
     * Compose this rule via an OR operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    or: (r: AsyncRule<a>) => AsyncRule<a>

    /**
     * Run this validator
     * @param v     the value to validate
     */
    run: (v: a) => Promise<Result>
}

export type Rule<a> = SyncRule<a> | AsyncRule<a>

/**
 * The result of a validation
 */
export type Result = 
    | { kind: 'passed' }
    | { kind: 'failed', name:string, data: object}

/**
 * Constant value for the result of passed rules
 */
export const passed: Result = {kind: 'passed'}

/**
 * Constructs a failed result for a rule
 * @param name      name of the failed rule 
 * @param data      data object for the rendering
 */
export const failed = (name: string, data: object = {}): Result => ({
    kind: 'failed', name, data: {...data, name}
})

/**
 * Constructs a sync rule from a predicate
 * @param p     the predicate that returns its result as a Result type
 */
export const rule = <a>(p: (a:a) => Result): SyncRule<a> => ({
    kind: 'sync-rule',
    run: p,
    and(r) {
        return rule(a => {
            const r1 = this.run(a)
            if(r1.kind == 'failed') return r1
            return r.run(a)
        })
    },
    or(r) {
        return rule(a => {
            const r1 = this.run(a)
            if(r1.kind == 'passed') return r1
            return r.run(a)
        })
    },
    async() {
        return asyncRule(a => Promise.resolve(this.run(a)))
    }
})

/**
 * Constructs an async rule from an async predicate
 * @param p     the predicate that returns its result as a Promise of the Result type
 */
export const asyncRule = <a>(p: (a:a) => Promise<Result>): AsyncRule<a> => ({
    kind: 'async-rule',
    run: p,
    and(r) {
        const s: AsyncRule<a> = this
        return asyncRule(async(a) => {
            const r1 = await s.run(a)
            if(r1.kind == 'failed') return r1
            return r.run(a)
        })
    },
    or(r) {
        const s: AsyncRule<a> = this

        return asyncRule(async (a) => {
            const r1 = await s.run(a)
            if(r1.kind == 'passed') return r1
            return r.run(a)
        })
    },
})