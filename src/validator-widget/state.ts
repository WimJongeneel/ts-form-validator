import i18next = require("i18next");
import { passed, Result, Rule, SyncRule, Builder, ruleBuilder } from ".";

type Rules<a> = Partial<{ [k in keyof a]: (b: Builder<a, a[k]>) => Rule<a, a[k]> }>

// todo: prop -> key, props becomes root[key]
interface BaseFieldState<root, prop> {
    /**
     * Run the validation rule for this field
     * @param data                      the data for the field
     * @param delay                     delay the validation
     * @param clearWhenValidating       optional, when true the field will be cleared when the validator is running
     * 
     */
    validate(data: root, delay?: number, clearWhenValidating?: boolean): FieldState<root, prop>
    
    /**
     * Has this field passed the validation rule?
     */
    passed(): boolean
    
    /**
     * The validation rule for this field
     */
    rule: Rule<root, prop>

    /**
     * Clears the validation result for this field
     * note: to clear running jobs, schedule new job that returns passed result
     */
    clear(): FieldState<root, prop>

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

    field: keyof root
}

export type FieldState<root, prop> = BaseFieldState<root, prop> & (
    | { kind: 'unvalidated' }
    | { kind: 'validating' }
    | { kind: 'validated', result: Result })

export interface TranslationOptions {
    ns?: string
    key?: string
    data?: object
}

export interface ValidatorState<root> {
    /**
     * Contains the state of all the fields of a
     */
    fields: Partial<{ [k in keyof root]: FieldState<root, root[k]> }>

    /**
     * Get the translated error message for a field
     * Returns null if there is no error for the specified field
     * @param field     the name of the field
     * @param o         additional options for i18next
     */
    message(field: keyof root, o?: TranslationOptions): string | null
    
    /**
     * Validate all fields
     * @param data                      the data to validate
     * @param field                     optional, when specified only this field will be validated
     * @param delay                     optional, when specified the validating will be delayed
     * @param clearWhenValidating       optional, when true the field will be cleared when the validator is running
     */
    validate(data: root, field?: keyof root, delay?: number, clearWhenValidating?: boolean): ValidatorState<root>

    /**
     * Get the status of this validator based of the status of the fields
     */
    kind(): 'unvalidated' | 'validating' | 'partially validated' | 'validated'

    /**
     * Get of there is any validation error in this validator
     * @param field  optional, when specified only the state of this field will be considered
     */
    error(field?: keyof root): boolean

    /**
     * Clears the errors of this validator
     * @param field     optional, when specified only this field will be cleared
     */
    clear(field?: keyof root): ValidatorState<root>
}

// todo: link prop and typeof field
const unvalidated = <root, prop>(rule: SyncRule<root, prop>, field: keyof root, jobs: FieldState<root, prop>['jobs']): FieldState<root, prop> => ({
    kind: 'unvalidated',
    rule,
    jobs: jobs,
    clear() {
        return unvalidated(rule, this.field, {...this.jobs, next: async () => passed})
    },
    passed() {
        const self = this as FieldState<root, prop>

        return self.kind == 'validated' && self?.result?.kind == 'passed'
    },
    validate(data: root, delay = 0, clearWhenValidating = false): FieldState<root, prop> {
        const self: FieldState<root, prop> = this

        const field = (data as any)[self.field]

        if(delay == 0 && self.rule.kind == 'sync-rule') return {
            ...self,
            kind: 'validated',
            result: self.rule.run(field, data),
        }


        if(delay == 0 && clearWhenValidating) return {
            ...self,
            kind: self.kind == 'unvalidated' ? 'validating' : this.kind,
            jobs: {
                ...self.jobs,
                next: async () => self.rule.run(field, data)
            },
        }

        if(delay == 0 && !clearWhenValidating) return {
            ...self,
            jobs: {
                ...self.jobs,
                next: async () => self.rule.run(field, data)
            },
        }

        // todo: fix typing of this
        const prop: prop = data[this.field] as any as prop

        return {
            ...this,
            kind: clearWhenValidating 
                ? this.kind == 'unvalidated' ? 'validating' : this.kind
                : 'validating',
            jobs: {
                ...this.jobs,
                next: () => new Promise(res => setTimeout(() => res(this.rule.run(prop, data)), delay)).then(() => self.rule.run(field, data))
            }
        }
    },
    field,
})

export const validatorState = <a = {}>(rules: Rules<a>): ValidatorState<a> => {
    
    const fields: Partial<{ [k in keyof a]: FieldState<a, a[k]> }> = {}

    for(const k in rules) {
        fields[k] = unvalidated(rules[k]!(ruleBuilder() as any) as any, k, {})
    }

    return {

        fields,

        kind() {
            const s: ValidatorState<a> = this

            for(const k in s.fields) {
                if(s.fields[k] == undefined) continue
                if(s.fields[k]!.kind == 'validating') return 'validating'
            }

            for(const k in s.fields) {
                if(s.fields[k] == undefined) continue
                if(s.fields[k]!.kind != 'validated') return 'unvalidated'
            }

            return 'validated'
        },

        message(k, o = {}) {
            const s: ValidatorState<a> = this
            const data: FieldState<a, a[typeof k]> = s.fields[k] as any
            if(data == undefined) return null
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
                newS.fields[field] = newS.fields[field]!.validate(data, delay, clearWhenValidating)
                return newS
            }

            for(const k in newS.fields) {
                newS.fields[k] = newS.fields[k]!.validate(data, delay, clearWhenValidating)
            }

            return newS
        },

        error(k) {
            const s: ValidatorState<a> = this
            
            if(k == undefined) {
                for(const k in s.fields) {
                    if(s.fields[k]?.passed() == false) return true
                }
                return false
            }
            
            const field = s.fields[k]
            if(field == null) return false
            if(field.kind != 'validated') return false
            return !field.passed()
        },

        clear(k) {
            const newS: ValidatorState<a> = {...this, fields: {...this.fields}}

            if(k) {
                newS.fields[k] = newS.fields[k]?.clear()
                return newS
            }

            for(const k in newS.fields) {
                newS.fields[k] = newS.fields[k]?.clear()
            }

            return newS
        }
    }
}


