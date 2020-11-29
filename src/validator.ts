import i18next = require("i18next");
import React = require("react");
import { Widget, Action, fromJSX, nothing, any, promise, onlyIf } from "widgets-for-react"
import { Map } from 'immutable'

interface SyncRule<a> {
    kind: 'rule'
    and(r: SyncRule<a>): SyncRule<a>
    or(r: SyncRule<a>): SyncRule<a>
    run: (v: a) => Result
    /**
     * Turn this Rule into an AsyncRule for composition with async rules
     */
    async: () => AsyncRule<a>
}

interface AsyncRule<a> {
    kind: 'async-rule'
    and: (r: AsyncRule<a>) => AsyncRule<a>
    or: (r: AsyncRule<a>) => AsyncRule<a>
    run: (v: a) => Promise<Result>
}

type Rule<a> = SyncRule<a> | AsyncRule<a>

interface StringRuleBuilder {
    required: SyncRule<string>
    is(s: string): SyncRule<string>
    min: (n: number) => SyncRule<string>
    max: (n: number) => SyncRule<string>
    contains: (s: string, c?: boolean) => SyncRule<string>
    containsNot: (s: string, c?: boolean) => SyncRule<string>
    hasNumber: SyncRule<string>
    hasLetter: SyncRule<string>
    hasCapital: SyncRule<string>
    startsWith: (s: string) => SyncRule<string>
    startsNotWith: (s: string) => SyncRule<string>
    endsWith: (s: string) => SyncRule<string>
    endsNotWith: (s: string) => SyncRule<string>
    length: (n: number) => SyncRule<string>
    email: SyncRule<string>
    url: SyncRule<string>
    alpha: SyncRule<string>
    numeric: SyncRule<string>
    alphaNumeric: SyncRule<string>
    regex: (r: RegExp) => SyncRule<string>
}

interface DateRuleBuilder {
    is(s: Date): SyncRule<Date>
    afterOr: (d: Date) => SyncRule<Date>
    oneOf(s: Date, ...as: Date[]): SyncRule<Date>
    after: (d: Date) => SyncRule<Date>
    before: (d: Date) => SyncRule<Date>
    beforeOr: (d: Date) => SyncRule<Date>
    betweenIncuding: (d1: Date, d2: Date) => SyncRule<Date>
    between: (d1: Date, d2: Date) => SyncRule<Date>
}

interface BoolRuleBuilder {
    is:(s: boolean) => SyncRule<boolean>
    oneOf(s: boolean, ...as: boolean[]): SyncRule<boolean>
    true: SyncRule<boolean>
    false: SyncRule<boolean>
}

interface NumberRuleBuilder {
    is(s: number): SyncRule<number>
    oneOf(s: number, ...as: number[]): SyncRule<number>
    bigger: (n:number) => SyncRule<number>
    biggerOr: (n:number) => SyncRule<number>
    lesser: (n:number) => SyncRule<number>
    lesserOr: (n:number) => SyncRule<number>
}

type Builder<a> = 
    a extends string ? StringRuleBuilder :
    a extends boolean ? BoolRuleBuilder :
    a extends Date ? DateRuleBuilder :
    never

type Result = 
    | { kind: 'passed' }
    | { kind: 'failed', name:string, data: object}

export const passed: Result = {kind: 'passed'}

export const failed = (name: string, data: object = {}): Result => ({
    kind: 'failed', name, data: {...data, name}
})

export const rule = <a>(p: (a:a) => Result): SyncRule<a> => ({
    kind: 'rule',
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

const ruleBuilder: DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & NumberRuleBuilder = {
    is: (v:any) => rule(a => v == a ? passed : failed('is', {expected: v, given: a, kind: 'is'})),
    max: (n:number) => rule((a:string) => n >= a.length ? passed : failed('max', {expected: n, given: a, length: a.length})),
    min: (n:number) => rule((a:string) => n <= a.length ? passed : failed('min', {expected: n, given: a, length: a.length,})),
    hasCapital: rule((a:string) => a.toLocaleLowerCase() != a ? passed : failed('hasCapital', {given: a})),
    alphaNumeric: rule((a:string) => /^[a-z0-9]+$/i.test(a) ? passed : failed('alphaNumeric', {given: a})),
    oneOf: (...vs: any[]) => rule(a => vs.some(v => v == a) ? passed :failed('oneOf', {given: a, expected: vs.join(', ')})),
    required: rule<string>(a => !!!a ? passed : failed('required')),
    false: rule(b => b === false ? passed : failed('false')),
    true: rule(b => b === true ? passed : failed('true')),
    email: rule((e:string) => e.includes('@') ? passed : failed('email', {given: e})),
    // todo: implement all other rules
} as any // DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & NumberRuleBuilder

type Rules<a> = Partial<{ [k in keyof a]: (b: Builder<a[k]>) => Rule<a[k]> }>

interface BaseFieldState<a> {
    /**
     * Run the validation rule for this field
     * @param data                      the data for the field
     * @param delay                     delay the validation
     * @param clearWhenValidating       optional, when true the field will be cleared when the validator is running
     * 
     */
    validate(data: a, delay?: number, clearWhenValidating?: boolean): FieldState<a>
    
    /**
     * Has this field passed the validation rule?
     */
    passed(): boolean
    
    /**
     * The validation rule for this field
     */
    rule: Rule<a>

    /**
     * Clears the validation result for this field
     * note: to clear running jobs, schedule new job that returns passed result
     */
    clear(): FieldState<a>

    /**
     * Holds the state for async validators
     */
    jobs: {
        /**
         * Reference to the current running job
         */
        current?: Promise<Result>
        /**
         * The job to be ran next, after the current job completes
         */
        next?: () => Promise<Result>
    }
}

export type FieldState<a> = BaseFieldState<a> & (
    | { kind: 'unvalidated' }
    | { kind: 'validating', job: () => Promise<Result> }
    | { kind: 'validated', result: Result })

export interface ValidatorState<a> {
    /**
     * Contains the state of all the fields of a
     */
    fields: Partial<{ [k in keyof a]: FieldState<a> }>

    /**
     * Get the translated error message for a field
     * Returns null if there is no error for the specified field
     * @param field the name of the field
     */
    message(field: keyof a): string | null
    
    /**
     * Validate all fields
     * @param data                      the data to validate
     * @param field                     optional, when specified only this field will be validated
     * @param delay                     optional, when specified the validating will be delayed
     * @param clearWhenValidating       optional, when true the field will be cleared when the validator is running
     */
    validate(data: a, field?: keyof a, delay?: number, clearWhenValidating?: boolean): ValidatorState<a>

    /**
     * Get the status of this validator based of the status of the fields
     */
    kind(): 'unvalidated' | 'validating' | 'partially validated' | 'validated'

    /**
     * Get of there is any validation error in this validator
     * @param field  optional, when specified only the state of this field will be considered
     */
    error(field?: keyof a): boolean

    /**
     * Clears the errors of this validator
     * @param field     optional, when specified only this field will be cleared
     */
    clear(field?: keyof a): ValidatorState<a>
}

const unvalidated = <a>(rule: SyncRule<a>, jobs: FieldState<a>['jobs']): FieldState<a> => ({
    kind: 'unvalidated',
    rule,
    jobs: jobs,
    clear() {
        return unvalidated(this.rule, {...this.jobs, next: () => passed})
    },
    passed() {
        return this.kind == 'validated' && this.result.kind == 'passed'
    },
    validate(data: a, delay = 0, clearWhenValidating = false) {
        const self: FieldState<a> = this
        
        if(delay == 0 && self.rule.kind == 'rule') return {
            ...self,
            kind: 'validated',
            result: self.rule.run(data),
        }


        if(delay == 0) return {
            ...self,
            kind: clearWhenValidating 
                ? self.kind == 'unvalidated' ? 'validating' : this.kind
                : 'validating',
            jobs: {
                ...self.jobs,
                next: () => self.rule.run(data)
            }
        }

        return {
            ...this,
            kind: clearWhenValidating 
                ? this.kind == 'unvalidated' ? 'validating' : this.kind
                : 'validating',
            jobs: {
                ...this.jobs,
                next: () => new Promise(res => setTimeout(() => res(this.rule.run(data)), delay)).then(() => self.rule.run(data))
            }
        }
    }
})

export const validatorState = <a = {}>(rules: Rules<a>): ValidatorState<a> => {
    
    const fields: Partial<{ [k in keyof a]: FieldState<a> }> = {}

    for(const k in rules) {
        fields[k] = unvalidated(rules[k](ruleBuilder as any) as any, {})
    }

    return {
        fields,
        kind() {
            const s: ValidatorState<a> = this

            for(const k in s.fields) {
                console.log(s.fields[k])
                if(s.fields[k].kind == 'validating') return 'validating'
            }

            for(const k in s.fields) {
                console.log(s.fields[k])
                if(s.fields[k].kind != 'validated') return 'unvalidated'
            }

            return 'validated'
        },
        message(k) {
            const s: ValidatorState<a> = this
            const data: FieldState<a[typeof k]> = s.fields[k] as any
            if(data.kind != 'validated') return null
            if(data.result.kind == 'passed') return null
            // todo: type translation data object
            // @ts-ignore
            return i18next.default.t(data.result.name, {...data.result.data, field: k, kind: data.result.name})
        },
        validate(data: a, field, delay, clearWhenValidating) {
            const newS: ValidatorState<a> = {...this, fields: {...this.fields}}

            if(field != null) {
                newS.fields[field] = newS.fields[field].validate(data[field] as any, delay, clearWhenValidating)
                return newS
            }

            for(const k in newS.fields) {
                newS.fields[k] = newS.fields[k].validate(data[k] as any, delay, clearWhenValidating)
            }

            return newS
        },
        error(k) {
            const s: ValidatorState<a> = this
            const field = s.fields[k]

            if(k != null) {
                for(const k in s.fields) {
                    if(s.fields[k].passed() == false) return true
                }
                return false
            }

            if(field == null) return false
            if(field.kind != 'validated') return false
            return !field.passed()
        },
        clear(k) {
            const newS: ValidatorState<a> = {...this, fields: {...this.fields}}

            if(k) {
                newS.fields[k] = newS.fields[k].clear()
                return newS
            }

            for(const k in newS.fields) {
                newS.fields[k] = newS.fields[k].clear()
            }

            return newS
        }
    }
}

export const validator = <a>(s0:ValidatorState<a>): Widget<Action<ValidatorState<a>>> => any<Action<ValidatorState<a>>>()(
    Object.keys(s0.fields).map(k => {
        const key = k as keyof a

        return field(s0.fields[key]).map(a => s1 => ({...s1, fields: {...s1.fields, [k]: a(s1.fields[key])}}))
    })
)

const field = <a>(s0: FieldState<a>): Widget<Action<FieldState<a>>> => any<Action<FieldState<a>>>()([
    jobManager(s0),
    onlyIf(
        s0.jobs.current != null,
        promise<FieldState<a>, Result>(
            s1 => s1.jobs.current, 
            // todo: generic error msg here
            {on_fail: () => console.log('fail') as null}
        )(s0).map(r => s1 => s1.jobs.next == null
            ? ({ ...s1, kind: 'validated', result: r, jobs: { ...s1.jobs, current: null }})
            : ({ ...s1, jobs: { ...s1.jobs, current: null }})
        )
    )
])

const jobManager = <a>(s0: FieldState<a>): Widget<Action<FieldState<a>>> => fromJSX(c => {
    if(s0.jobs.next != null && s0.jobs.current == null) {
        c(s1 => ({
            ...s1,
            jobs: {
                current: s1.jobs.next(),
                next: null
            }
        }))
    }
    return nothing().run(() => null)
})

