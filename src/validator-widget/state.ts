import i18next = require("i18next");
import { passed, Result, Rule, SyncRule, Builder, ruleBuilder } from ".";

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

export interface TranslationOptions {
    ns?: string
    key?: string
    data?: object
}

export interface ValidatorState<a> {
    /**
     * Contains the state of all the fields of a
     */
    fields: Partial<{ [k in keyof a]: FieldState<a> }>

    /**
     * Get the translated error message for a field
     * Returns null if there is no error for the specified field
     * @param field     the name of the field
     * @param o         additional options for i18next
     */
    message(field: keyof a, o?: TranslationOptions): string | null
    
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
        
        if(delay == 0 && self.rule.kind == 'sync-rule') return {
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
                if(s.fields[k].kind == 'validating') return 'validating'
            }

            for(const k in s.fields) {
                if(s.fields[k].kind != 'validated') return 'unvalidated'
            }

            return 'validated'
        },

        message(k, o = {}) {
            const s: ValidatorState<a> = this
            const data: FieldState<a[typeof k]> = s.fields[k] as any
            if(data.kind != 'validated') return null
            if(data.result.kind == 'passed') return null

            const renderData = {...data.result.data, field: k, kind: data.result.name, ...(o.data || {})}

            if(o.key) return i18next.default.t(`${o.ns ? o.ns + ':' : ''}${o.key}`, renderData)
            if(i18next.default.exists(`${o.ns ? o.ns + ':' : ''}${data.result.name}__${k}`)) return i18next.default.t(`${data.result.name}__${k}`, renderData)
            return i18next.default.t(`${o.ns ? o.ns + ':' : ''}${data.result.name}`, renderData)
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


