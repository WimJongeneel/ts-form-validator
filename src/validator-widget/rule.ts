export interface SyncRule<root, prop> {
    /**
     * The kind of this rule
     */
    kind: 'sync-rule'
    
    /**
     * Compose this rule via an AND operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    and(r: SyncRule<root, prop>): SyncRule<root, prop>
    
    /**
     * Compose this rule via an OR operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    or(r: SyncRule<root, prop>): SyncRule<root, prop>
    
    /**
     * Run this validator
     * @param v     the value to validate
     */
    run: (v: prop, r: root) => Result

    /**
     * Turn this Rule into an AsyncRule for composition with async rules
     */
    async: () => AsyncRule<root, prop>
}

export interface AsyncRule<root, prop> {
    /**
     * The kind of this rule
     */
    kind: 'async-rule'

    /**
     * Compose this rule via an AND operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    and: (r: AsyncRule<root, prop>) => AsyncRule<root, prop>

    /**
     * Compose this rule via an OR operator. Short circuiting will be used. 
     * @param r     the rule to compose with
     */
    or: (r: AsyncRule<root, prop>) => AsyncRule<root, prop>

    /**
     * Run this validator
     * @param v     the value to validate
     */
    run: (v: prop, r: root) => Promise<Result>
}

export type Rule<root, prop> = SyncRule<root, prop>| AsyncRule<root, prop>

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
export const rule = <root, prop>(p: (a:prop, r: root) => Result): SyncRule<root, prop> => ({
    kind: 'sync-rule',
    run: p,
    and(r) {
        return rule((a, root) => {
            const r1 = this.run(a, root)
            if(r1.kind == 'failed') return r1
            return r.run(a, root)
        })
    },
    or(r) {
        return rule((a, root) => {
            const r1 = this.run(a, root)
            if(r1.kind == 'passed') return r1
            return r.run(a, root)
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
export const asyncRule = <root, prop>(p: (a:prop, r: root) => Promise<Result>): AsyncRule<root, prop> => ({
    kind: 'async-rule',
    run: p,
    and(r) {
        const s: AsyncRule<root, prop> = this
        return asyncRule(async(a, root) => {
            const r1 = await s.run(a, root)
            if(r1.kind == 'failed') return r1
            return r.run(a, root)
        })
    },
    or(r) {
        const s: AsyncRule<root, prop> = this

        return asyncRule(async (a, root) => {
            const r1 = await s.run(a, root)
            if(r1.kind == 'passed') return r1
            return r.run(a, root)
        })
    },
})